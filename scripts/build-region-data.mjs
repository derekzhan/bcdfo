#!/usr/bin/env node
// Generates app/region-data.generated.ts from the DFO freshwater tables.
//
// Usage:
//   node scripts/build-region-data.mjs            # regenerate the data file
//   node scripts/build-region-data.mjs --report   # print what would be written
//   node scripts/build-region-data.mjs --refresh  # re-download the DFO pages
//
// Region 2 is deliberately not generated: its bilingual text and its OSM
// boundary anchors are hand verified against the table, so it stays in
// app/fishing-data.ts and tests assert the published table still matches.
// Water names and DFO boundary prose are kept in English on purpose—only the
// formulaic species, date and limit phrasing is translated, because a mistaken
// translation of a boundary is a mistake someone fishes on.

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchRegion, parseNotes, parseTable, regions, sourceUrlFor } from "./dfo-regions.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const refresh = args.includes("--refresh");
const HAND_WRITTEN = new Set(["2"]);

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7,
  aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_ZH = ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
const SPECIES_ZH = {
  Chinook: "帝王鲑",
  Coho: "银鲑",
  Sockeye: "红鲑",
  Pink: "粉鲑",
  Chum: "狗鲑",
  Steelhead: "虹鳟",
  Eulachon: "油胡瓜鱼",
  All: "所有鲑鱼",
};
// Not a species row, but DFO uses the bare word in limit text.
const GENERIC_ZH = { salmon: "鲑鱼", finfish: "所有鱼类" };

function parseSpecies(cell, limits) {
  const source = cell || (limits.match(/for ([a-z, ]+?)(?: salmon)?$/i)?.[1] ?? "");
  const found = [];
  for (const name of Object.keys(SPECIES_ZH)) {
    if (name === "All") continue;
    if (new RegExp(`\\b${name}\\b`, "i").test(source)) found.push(name);
  }
  if (found.length) return found;
  return ["All"];
}

function parseDate(part) {
  const match = part.match(/([a-z]+)\.?\s+(\d{1,2})/i);
  if (!match) return null;
  const month = MONTHS[match[1].slice(0, 3).toLowerCase()];
  return month ? [month, Number(match[2])] : null;
}

function parseSeason(cell) {
  const value = cell.trim();
  if (/to be determined/i.test(value)) return { zh: "待定", always: false };
  if (/until further notice/i.test(value)) {
    const from = parseDate(value);
    return {
      zh: from ? `${MONTH_ZH[from[0]]}${from[1]}日起，另行通知` : "另行通知前持续有效",
      always: true,
    };
  }
  const [fromPart, toPart] = value.split(/\s+(?:to|through|until|-|–)\s+/i);
  const from = parseDate(fromPart ?? "");
  const to = parseDate(toPart ?? "");
  if (!from || !to) return { zh: value, always: /apr 1 to mar 31/i.test(value) };
  // Apr 1 to Mar 31 is DFO shorthand for the whole licence year.
  const always = from[0] === 4 && from[1] === 1 && to[0] === 3 && to[1] === 31;
  return {
    zh: `${MONTH_ZH[from[0]]}${from[1]}日–${MONTH_ZH[to[0]]}${to[1]}日`,
    start: from,
    end: to,
    always,
  };
}

// Only the recurring limit phrasing is translated; anything unrecognised keeps
// the DFO wording so nothing is silently reworded. Fishery Notice codes such as
// FN0851 are carried through untouched—they are how an angler looks the change
// up, so they must stay quotable.
const LIMIT_RULES = [
  [/^non-retention$/i, () => "不得保留，钓获即放"],
  [/^no fishing$/i, () => "禁止垂钓"],
  [/^to be determined$/i, () => "待定"],
  [/^bait ban$/i, () => "禁止使用饵料"],
  [/^no natural bait allowed$/i, () => "禁止使用天然饵料"],
  [/^fly[- ]fishing only$/i, () => "仅可使用假蝇钓法"],
  [/^finfish closure$/i, () => "禁止垂钓所有鱼类"],
  [/^open for salmon catch and release$/i, () => "可垂钓鲑鱼，但须钓获即放"],
  [/^single,? barbless hook$/i, () => "仅可使用单枚无倒刺鱼钩"],
  [
    /^single,? barbless hook in tidal and non-tidal portions of all streams$/i,
    () => "所有河流的潮水段与非潮水段均仅可使用单枚无倒刺鱼钩",
  ],
  [
    /^hook restriction,? single barbless hook less than (\d+)\s*mm from point to shank$/i,
    (m) => `鱼钩限制：单枚无倒刺钩，钩尖至钩柄间距小于 ${m[1]} 毫米`,
  ],
  [/^no retention of ([a-z ]+?)$/i, (m) => `不得保留${speciesList(m[1])}`],
  [
    /^no fishin[gf] for ([a-z, ]+?)(?:, unless otherwise stated below)?$/i,
    (m) => `禁止垂钓${speciesList(m[1])}${/unless otherwise/i.test(m[0]) ? "，除下文另有说明外" : ""}`,
  ],
  [
    /^(\d+) per day, (?:only )?(\d+)(?: of which may be (?:more|greater) than| over) (\d+)\s*cm\.?(?: in length)?$/i,
    (m) => `每日 ${m[1]} 条，其中超过 ${m[3]} 厘米者最多 ${m[2]} 条`,
  ],
  [/^(\d+) per day, none over (\d+)\s*cm$/i, (m) => `每日 ${m[1]} 条，且均不得超过 ${m[2]} 厘米`],
  [/^(\d+) per day, maximum size (\d+)\s*cm$/i, (m) => `每日 ${m[1]} 条，最大不得超过 ${m[2]} 厘米`],
  [/^(\d+) per day, (\d+)\s*cm or less$/i, (m) => `每日 ${m[1]} 条，且不超过 ${m[2]} 厘米`],
  [
    /^(\d+) hatchery marked (?:only )?per day, (?:only )?(\d+)(?: of which may be (?:more|greater) than| over) (\d+)\s*cm$/i,
    (m) => `每日 ${m[1]} 条有孵化场标记的鱼，其中超过 ${m[3]} 厘米者最多 ${m[2]} 条`,
  ],
  [/^(\d+) hatchery marked (?:fish )?(?:only )?per day$/i, (m) => `每日 ${m[1]} 条有孵化场标记的鱼`],
  [
    /^(\d+) per day, hatchery marked (?:fish )?only$/i,
    (m) => `每日 ${m[1]} 条，且须有孵化场标记`,
  ],
  [/^(\d+) per day, bait ban$/i, (m) => `每日 ${m[1]} 条，禁止使用饵料`],
  [
    /^(\d+) per day, from (\d{2}:\d{2})\s*h until (\d{2}:\d{2})\s*h only$/i,
    (m) => `每日 ${m[1]} 条，仅限 ${m[2]}–${m[3]}`,
  ],
  [/^(\d+) per day$/i, (m) => `每日 ${m[1]} 条`],
  [
    /^monthly limit of (\d+) over (\d+)\s*cm from the (.+?)$/i,
    (m) => `${m[3]} 每月最多保留 ${m[1]} 条超过 ${m[2]} 厘米者`,
  ],
];

function translateClause(clause) {
  // Fishery Notice references ride along at the end of many limits.
  const notice = clause.match(/\s(FN\d+)\.?$/i);
  const body = (notice ? clause.slice(0, notice.index) : clause).replace(/\.$/, "").trim();
  for (const [pattern, build] of LIMIT_RULES) {
    const match = body.match(pattern);
    if (match) return `${build(match)}${notice ? `（${notice[1]}）` : ""}`;
  }
  return null;
}

function translateLimit(value) {
  const clauses = value.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean);
  const translated = clauses.map((clause) => translateClause(clause));
  // Partially understood text would read as a half-translated rule, so it is
  // only replaced when every clause is recognised.
  return translated.every(Boolean) ? translated.join("；") : value;
}

// "sockeye, pink or chum salmon" names three species; the trailing "salmon" is
// part of the phrase rather than a fourth one.
function speciesList(value) {
  const trimmed = value.replace(/\s+salmon$/i, "");
  const names = trimmed.split(/,\s*|\s+or\s+|\s+and\s+/).filter(Boolean);
  return names.map(zhSpecies).join("、");
}

function zhSpecies(name) {
  const value = name.trim().toLowerCase();
  const key = Object.keys(SPECIES_ZH).find((species) => species.toLowerCase() === value);
  return key ? SPECIES_ZH[key] : (GENERIC_ZH[value] ?? name.trim());
}

function classify(limits) {
  if (/to be determined/i.test(limits)) return "pending";
  if (/^no fishin[gf]|closure/i.test(limits)) return "closed";
  if (/non-retention|no retention|catch and release/i.test(limits)) return "release";
  if (/per day|may be retained|aggregate/i.test(limits)) return "retain";
  return "gear";
}

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[()'"“”’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

// scripts/waterway-specs.mjs keys its hand-drawn reaches by spot id, so the rows
// that carry a drawn reach get an id of their own instead of one derived from
// wording DFO rewrites between seasons. A row that stops matching loses its
// geometry, which tests/rendered-html.test.mjs reports as an unlinked reach.
const DRAWN_IDS = [
  { region: "3", water: "Fraser River", area: /Seton River/i, id: "r3-fraser-lillooet" },
  { region: "3", water: "Thompson River", area: /Kamloops Lake outlet/i, id: "r3-thompson-upper" },
  { region: "3", water: "Thompson River", area: /Skihist/i, id: "r3-thompson-lower" },
  { region: "7", water: "Nechako River", area: /Foothills/i, id: "r7-nechako" },
  { region: "8", water: "Shuswap River", area: /^\(middle\)/i, id: "r8-shuswap-middle" },
  { region: "8", water: "Shuswap River", area: /Mara Bridge/i, id: "r8-shuswap-lower" },
  { region: "8", water: "Shuswap River", area: /Trinity Valley/i, id: "r8-shuswap-trinity" },
];

function buildRegion(region, html) {
  const { rows } = parseTable(html);
  const notes = parseNotes(html);
  const spots = [];
  const byKey = new Map();
  let section = "";
  let water = "";

  for (const row of rows) {
    if (row.heading) {
      // "Colonial River - see Cayeghle River" points at another row; the
      // lettered Region 6 banners are real groupings.
      if (!/-\s*see\s/i.test(row.heading)) section = row.heading;
      continue;
    }
    const [waterCell, areaCell, speciesCell, datesCell, limitsCell] = row.cells;
    if (waterCell) water = waterCell;
    if (!water) continue;

    // A row with prose but no rule is an advisory note about that water.
    if (!speciesCell && !datesCell && !limitsCell) {
      const target = spots.findLast((spot) => spot.water === water);
      if (target && areaCell) target.notes.push(areaCell);
      continue;
    }
    if (!datesCell && !limitsCell) continue;

    const area = areaCell === water ? "" : areaCell;
    const key = `${water}::${area}`;
    let spot = byKey.get(key);
    if (!spot) {
      const drawn = DRAWN_IDS.find(
        (entry) => entry.region === region.id && entry.water === water && entry.area.test(area),
      );
      const base = slug(area ? `${water}-${area}` : water) || slug(water);
      let id = drawn ? drawn.id : `r${region.id}-${base}`;
      let suffix = 2;
      while (spots.some((existing) => existing.id === id)) id = `r${region.id}-${base}-${suffix++}`;
      spot = { id, region: region.id, water, area, section, rules: [], notes: [] };
      byKey.set(key, spot);
      spots.push(spot);
    }

    const season = parseSeason(datesCell);
    spot.rules.push({
      species: parseSpecies(speciesCell, limitsCell),
      seasonEn: datesCell,
      seasonZh: season.zh,
      regulationEn: limitsCell,
      regulationZh: translateLimit(limitsCell),
      kind: classify(limitsCell),
      start: season.start,
      end: season.end,
      always: season.always,
    });
  }

  return { region, spots, notes, sourceUrl: sourceUrlFor(region.slug) };
}

const quote = (value) => JSON.stringify(value);
const localized = (en, zh) => `t(${quote(en)}, ${quote(zh)})`;

function serialize(built) {
  const lines = [
    "// GENERATED by scripts/build-region-data.mjs — do not edit by hand.",
    "//",
    "// Source: the DFO recreational salmon tables for BC freshwater regions.",
    "// Region 2 is hand maintained in fishing-data.ts and is not included here.",
    "// Water names and boundary descriptions stay in DFO's English wording; only",
    "// species, dates and limits are translated.",
    "",
    'import type { FishingSpot, LocalizedText, RegionInfo } from "./fishing-data";',
    "",
    "const t = (en: string, zh: string): LocalizedText => ({ en, zh });",
    "",
    "export const generatedRegions: RegionInfo[] = [",
  ];

  for (const { region, notes, sourceUrl, spots } of built) {
    lines.push(
      "  {",
      `    id: ${quote(region.id)},`,
      `    name: ${localized(region.en, region.zh)},`,
      `    sourceUrl: ${quote(sourceUrl)},`,
      `    waters: ${spots.length},`,
      "    notes: [",
      ...notes.map((note) => `      ${localized(note, note)},`),
      "    ],",
      "  },",
    );
  }
  lines.push("];", "", "export const generatedSpots: FishingSpot[] = [");

  for (const { spots } of built) {
    for (const spot of spots) {
      lines.push(
        "  {",
        `    id: ${quote(spot.id)},`,
        `    region: ${quote(spot.region)},`,
        `    water: ${localized(spot.water, spot.water)},`,
        `    area: ${localized(spot.area || "Entire listed water", spot.area || "整条列出的水域")},`,
      );
      if (spot.section) lines.push(`    section: ${localized(spot.section, spot.section)},`);
      if (spot.notes.length) {
        lines.push("    notes: [", ...spot.notes.map((note) => `      ${localized(note, note)},`), "    ],");
      }
      lines.push("    rules: [");
      for (const rule of spot.rules) {
        const parts = [
          `species: [${rule.species.map(quote).join(", ")}]`,
          `season: ${localized(rule.seasonEn, rule.seasonZh)}`,
          `regulation: ${localized(rule.regulationEn, rule.regulationZh)}`,
          `kind: ${quote(rule.kind)}`,
        ];
        if (rule.start) parts.push(`start: [${rule.start.join(", ")}]`);
        if (rule.end) parts.push(`end: [${rule.end.join(", ")}]`);
        if (rule.always) parts.push("always: true");
        lines.push(`      { ${parts.join(", ")} },`);
      }
      lines.push("    ],", "  },");
    }
  }
  lines.push("];", "");
  return lines.join("\n");
}

const built = [];
for (const region of regions) {
  if (HAND_WRITTEN.has(region.id)) continue;
  const html = await fetchRegion(region.slug, { refresh });
  built.push(buildRegion(region, html));
}

const untranslated = built.flatMap(({ region, spots }) =>
  spots.flatMap((spot) =>
    spot.rules
      .filter((rule) => rule.regulationEn === rule.regulationZh && !/^[\d\s]*$/.test(rule.regulationEn))
      .map((rule) => `region${region.id}: ${rule.regulationEn}`),
  ),
);

for (const { region, spots, notes } of built) {
  const rules = spots.reduce((sum, spot) => sum + spot.rules.length, 0);
  console.log(`region${region.id} ${region.en}: ${spots.length} waters, ${rules} rules, ${notes.length} region notes`);
}
const unique = [...new Set(untranslated)];
if (unique.length) {
  console.log(`\n${unique.length} limit phrases kept in English (no translation rule matched):`);
  unique.forEach((item) => console.log(`  ${item}`));
}

if (!reportOnly) {
  const target = join(ROOT, "app", "region-data.generated.ts");
  writeFileSync(target, serialize(built), "utf8");
  console.log(`\nwrote ${built.reduce((sum, entry) => sum + entry.spots.length, 0)} waters to app/region-data.generated.ts`);
}
