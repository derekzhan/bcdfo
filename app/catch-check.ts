import { isRuleActive, regionById, type FishingRule, type FishingSpot } from "./fishing-data";

export const salmonSpecies = ["Chinook", "Coho", "Sockeye", "Pink", "Chum"] as const;
export type Salmon = (typeof salmonSpecies)[number];
export type FinClip = "clipped" | "intact" | "unsure";

export type CatchInput = {
  species: Salmon;
  fin?: FinClip;
  lengthCm?: number;
};

export type Limit = {
  daily: number;
  markedOnly: boolean;
  // "2 per day, 1 of which can be unmarked": marked-only apart from this many.
  unmarkedMax?: number;
  // "only 2 over 50 cm"; max 0 for "none over 50 cm".
  over?: { cm: number; max: number };
  maxCm?: number;
};

export type ReleaseReason = "rule" | "none" | "pending" | "zero" | "unmarked" | "undersize" | "oversize";

export type Verdict =
  | { kind: "retain"; rule: FishingRule; limit: Limit }
  | { kind: "release"; reason: ReleaseReason; rule?: FishingRule; cm?: number }
  | { kind: "closed"; rule: FishingRule }
  | { kind: "needs"; field: "fin" | "length"; rule: FishingRule }
  | { kind: "manual"; rules: FishingRule[] };

export type CatchCheck = {
  verdict: Verdict;
  // Which questions matter for the rule that decides this fish.
  asks: { fin: boolean; length: boolean };
  gear: FishingRule[];
};

const speciesByWord: Record<string, Salmon> = {
  chinook: "Chinook",
  coho: "Coho",
  sockeye: "Sockeye",
  pink: "Pink",
  chum: "Chum",
};

const clauseReaders: Array<[RegExp, (match: RegExpMatchArray, limit: Limit) => void]> = [
  [/^hatchery[- ]marked(?: fish)? only$/i, (_, limit) => { limit.markedOnly = true; }],
  [/^only (\d+) over (\d+) ?cm$/i, (m, limit) => { limit.over = { cm: Number(m[2]), max: Number(m[1]) }; }],
  [/^(\d+) of which (?:may|can) be more than (\d+) ?cm in length$/i, (m, limit) => { limit.over = { cm: Number(m[2]), max: Number(m[1]) }; }],
  [/^(\d+) of which can be unmarked$/i, (m, limit) => { limit.markedOnly = true; limit.unmarkedMax = Number(m[1]); }],
  [/^none over (\d+) ?cm$/i, (m, limit) => { limit.over = { cm: Number(m[1]), max: 0 }; }],
  [/^maximum size (\d+) ?cm$/i, (m, limit) => { limit.maxCm = Number(m[1]); }],
  [/^(\d+) ?cm or less$/i, (m, limit) => { limit.maxCm = Number(m[1]); }],
  // Gear clauses do not change what may be kept; the full text is shown anyway.
  [/^(?:bait ban|fly-fishing only)$/i, () => {}],
];

// Null for any wording with a clause it cannot account for, so an unfamiliar
// condition ("from 05:00 h until 22:00 h only") is never silently dropped.
export function parseLimit(text: string): Limit | null {
  const clauses = text
    .replace(/\bFN\d+\b/gi, "")
    .replace(/(\d) ?cm\.? in length/gi, "$1 cm in length")
    .split(/[,.](?=\s|$)/)
    .map((clause) => clause.trim())
    .filter(Boolean);
  const head = clauses[0]?.match(/^(\d+) (?:(?:chinook|coho|sockeye|pink|chum) )?(hatchery[- ]marked )?per day$/i);
  if (!head) return null;

  const limit: Limit = { daily: Number(head[1]), markedOnly: Boolean(head[2]) };
  for (const clause of clauses.slice(1)) {
    const reader = clauseReaders.find(([pattern]) => pattern.test(clause));
    if (!reader) return null;
    reader[1](clause.match(reader[0])!, limit);
  }
  return limit;
}

// "Retained coho must measure 25 cm or more; retained chinook, chum, pink and
// sockeye must measure 30 cm or more" and the other regions' variants. A species
// a region does not name gets no minimum rather than a borrowed one.
export function minimumLengths(notes: string[]): Partial<Record<Salmon, number>> {
  const lengths: Partial<Record<Salmon, number>> = {};
  for (const note of notes) {
    for (const match of note.matchAll(/retained ([a-z ,]+?) must measure (\d+) ?cm or more/gi)) {
      for (const word of match[1].toLowerCase().match(/chinook|coho|sockeye|pink|chum/g) ?? []) {
        lengths[speciesByWord[word]] = Number(match[2]);
      }
    }
  }
  return lengths;
}

const daysBefore = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
const dayOfYear = ([month, day]: [number, number]) => daysBefore[month - 1] + day;

function spanDays(rule: FishingRule) {
  if (rule.always || !rule.start || !rule.end) return 366;
  const start = dayOfYear(rule.start);
  const end = dayOfYear(rule.end);
  return end >= start ? end - start + 1 : 365 - start + end + 1;
}

const coversSpecies = (rule: FishingRule, species: Salmon) =>
  rule.species.includes(species) || rule.species.includes("All");

// DFO writes exceptions as narrower windows on top of a year-round rule—sockeye
// closed all year but open Aug 1–14—and species rows on top of "all salmon"
// rows, so the narrowest window wins, then the rule that names the species.
function decidingRules(active: FishingRule[], species: Salmon) {
  const rank = (rule: FishingRule) => spanDays(rule) * 2 + (rule.species.includes(species) ? 0 : 1);
  const best = Math.min(...active.map(rank));
  return active.filter((rule) => rank(rule) === best);
}

export function checkCatch(spot: FishingSpot, input: CatchInput, date = new Date()): CatchCheck {
  const active = spot.rules.filter((rule) => isRuleActive(rule, date) && coversSpecies(rule, input.species));
  const gear = active.filter((rule) => rule.kind === "gear");
  const result = (verdict: Verdict, asks = { fin: false, length: false }): CatchCheck => ({ verdict, asks, gear });

  const candidates = active.filter((rule) => rule.kind !== "gear");
  if (!candidates.length) {
    const pending = spot.rules.some((rule) => rule.kind === "pending" && coversSpecies(rule, input.species));
    return result({ kind: "release", reason: pending ? "pending" : "none" });
  }

  const deciding = decidingRules(candidates, input.species);
  if (new Set(deciding.map((rule) => `${rule.kind}\n${rule.regulation.en}`)).size > 1) {
    return result({ kind: "manual", rules: deciding });
  }
  const rule = deciding[0];
  if (rule.kind === "closed") return result({ kind: "closed", rule });
  if (rule.kind === "release") return result({ kind: "release", reason: "rule", rule });
  if (rule.kind === "pending") return result({ kind: "release", reason: "pending", rule });

  const limit = parseLimit(rule.regulation.en);
  if (!limit) return result({ kind: "manual", rules: [rule] });
  if (limit.daily === 0) return result({ kind: "release", reason: "zero", rule });

  const minCm = minimumLengths(regionById(spot.region).notes.map((note) => note.en))[input.species];
  const asks = {
    fin: limit.markedOnly,
    length: minCm !== undefined || limit.maxCm !== undefined || limit.over !== undefined,
  };

  if (limit.markedOnly && limit.unmarkedMax === undefined) {
    if (!input.fin) return result({ kind: "needs", field: "fin", rule }, asks);
    // A fin nobody can see might still be there, and keeping a wild fish is the
    // mistake that cannot be undone.
    if (input.fin !== "clipped") return result({ kind: "release", reason: "unmarked", rule }, asks);
  }

  if (asks.length) {
    const length = input.lengthCm;
    if (length === undefined || !Number.isFinite(length)) return result({ kind: "needs", field: "length", rule }, asks);
    if (minCm !== undefined && length < minCm) return result({ kind: "release", reason: "undersize", rule, cm: minCm }, asks);
    if (limit.maxCm !== undefined && length > limit.maxCm) {
      return result({ kind: "release", reason: "oversize", rule, cm: limit.maxCm }, asks);
    }
    if (limit.over?.max === 0 && length > limit.over.cm) {
      return result({ kind: "release", reason: "oversize", rule, cm: limit.over.cm }, asks);
    }
  }

  return result({ kind: "retain", rule, limit }, asks);
}

// Species this row regulates by name come first in the picker.
export function listedSpecies(spot: FishingSpot): Salmon[] {
  const named = new Set(spot.rules.flatMap((rule) => rule.species));
  return salmonSpecies.filter((species) => named.has(species));
}

export function minimumLengthFor(spot: FishingSpot, species: Salmon) {
  return minimumLengths(regionById(spot.region).notes.map((note) => note.en))[species];
}
