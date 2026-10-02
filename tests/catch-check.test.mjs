import test from "node:test";
import assert from "node:assert/strict";

import { checkCatch, minimumLengths, parseLimit } from "../app/catch-check.ts";
import { currentKind, fishingSpots } from "../app/fishing-data.ts";

// Noon in BC, so the Pacific calendar day is the one written in the test.
const on = (monthDay) => new Date(`2026-${monthDay}T19:00:00Z`);
const spot = (id) => {
  const found = fishingSpots.find((item) => item.id === id);
  assert.ok(found, `${id} is in the data`);
  return found;
};
const rule = (species, regulation, kind, start, end) => ({
  species: [].concat(species),
  season: { en: "", zh: "" },
  regulation: { en: regulation, zh: regulation },
  kind,
  ...(start ? { start, end } : { always: true }),
});
const water = (region, rules) => ({
  id: "test",
  region,
  water: { en: "Test", zh: "Test" },
  area: { en: "", zh: "" },
  rules,
});

test("reads every retention wording DFO uses today", () => {
  const cases = {
    "0 per day": { daily: 0, markedOnly: false },
    "1 per day": { daily: 1, markedOnly: false },
    "4 per day FN0787": { daily: 4, markedOnly: false },
    "4 pink per day FN0905": { daily: 4, markedOnly: false },
    "1 per day, 80 cm or less.": { daily: 1, markedOnly: false, maxCm: 80 },
    "1 per day, maximum size 35 cm": { daily: 1, markedOnly: false, maxCm: 35 },
    "1 per day, hatchery marked only": { daily: 1, markedOnly: true },
    "1 per day, hatchery-marked only": { daily: 1, markedOnly: true },
    "2 per day, hatchery marked fish only": { daily: 2, markedOnly: true },
    "2 per day, hatchery marked only FN0504": { daily: 2, markedOnly: true },
    "4 per day, hatchery marked only FN0952": { daily: 4, markedOnly: true },
    "1 hatchery-marked per day": { daily: 1, markedOnly: true },
    "2 hatchery marked per day": { daily: 2, markedOnly: true },
    "4 hatchery-marked per day FN0937": { daily: 4, markedOnly: true },
    "2 per day, 1 of which can be unmarked FN1013": { daily: 2, markedOnly: true, unmarkedMax: 1 },
    "2 per day, 1 of which may be more than 77 cm. in length": { daily: 2, markedOnly: false, over: { cm: 77, max: 1 } },
    "2 per day, 1 of which may be more than 77cm in length.": { daily: 2, markedOnly: false, over: { cm: 77, max: 1 } },
    "2 per day, only 1 over 77 cm": { daily: 2, markedOnly: false, over: { cm: 77, max: 1 } },
    "2 per day, only 1 over 50 cm.": { daily: 2, markedOnly: false, over: { cm: 50, max: 1 } },
    "4 per day, only 2 over 50cm": { daily: 4, markedOnly: false, over: { cm: 50, max: 2 } },
    "4 per day, only 2 over 50 cm FN0951": { daily: 4, markedOnly: false, over: { cm: 50, max: 2 } },
    "4 per day, only 2 over 62 cm": { daily: 4, markedOnly: false, over: { cm: 62, max: 2 } },
    "4 per day, none over 50 cm": { daily: 4, markedOnly: false, over: { cm: 50, max: 0 } },
    "4 hatchery-marked per day, only 2 over 35 cm": { daily: 4, markedOnly: true, over: { cm: 35, max: 2 } },
    "4 per day, only 2 over 50 cm. Fly-fishing only.": { daily: 4, markedOnly: false, over: { cm: 50, max: 2 } },
    "2 per day, bait ban FN0851": { daily: 2, markedOnly: false },
  };
  for (const [text, limit] of Object.entries(cases)) {
    assert.deepEqual(parseLimit(text), limit, text);
  }
});

test("refuses to guess at wording it does not understand", () => {
  for (const text of [
    "1 per day, from 05:00 h until 22:00 h only FN0435",
    "4 adult per day",
    "2 per day, only 1 wild",
    "To be determined",
  ]) {
    assert.equal(parseLimit(text), null, text);
  }
});

test("lists the retention wordings nobody taught it yet", (t) => {
  const unknown = new Set(
    fishingSpots
      .flatMap((item) => item.rules)
      .filter((item) => item.kind === "retain" && !parseLimit(item.regulation.en))
      .map((item) => item.regulation.en),
  );
  // DFO rewording a row must not stop the daily refresh: the checker shows the
  // original text for these, so they are reported rather than failed.
  for (const text of unknown) t.diagnostic(`shown as original text: ${text}`);
  assert.ok(unknown.size <= 3, `${unknown.size} wordings fall back to the original text`);
});

test("reads each region's minimum retention lengths from its notes", () => {
  assert.deepEqual(
    minimumLengths([
      "Retained coho must measure 25 cm or more; retained chinook, chum, pink and sockeye must measure 30 cm or more, measured from nose tip to tail fork.",
    ]),
    { Coho: 25, Chinook: 30, Chum: 30, Pink: 30, Sockeye: 30 },
  );
  assert.deepEqual(
    minimumLengths([
      "You must be aware of these measurements: All retained chinook and sockeye must measure 30 cm or more from tip of nose to tail fork",
      "All retained coho must measure 25 cm or more from tip of nose to tail fork",
    ]),
    { Chinook: 30, Sockeye: 30, Coho: 25 },
  );
  assert.deepEqual(
    minimumLengths([
      "You must be aware of these measurements: All retained chinook, sockeye, pink, coho, and chum must measure 30 cm or more from tip of nose to tail fork",
    ]),
    { Chinook: 30, Sockeye: 30, Pink: 30, Coho: 30, Chum: 30 },
  );
  assert.deepEqual(minimumLengths(["No fishing within 100 m of a hatchery."]), {});
});

test("lets a narrower opening override the year-round rule", () => {
  const fulton = spot("r6-fulton-river");
  assert.equal(checkCatch(fulton, { species: "Sockeye", lengthCm: 55 }, on("08-05")).verdict.kind, "retain");
  assert.equal(checkCatch(fulton, { species: "Sockeye", lengthCm: 55 }, on("09-01")).verdict.kind, "closed");

  const tatshenshini = spot("r6-tatshenshini-river-downstream-of-the-bc-yukon-bo");
  assert.equal(checkCatch(tatshenshini, { species: "Coho", lengthCm: 60 }, on("08-01")).verdict.kind, "closed");
  assert.equal(checkCatch(tatshenshini, { species: "Coho", lengthCm: 60 }, on("09-01")).verdict.kind, "retain");
});

test("lets a species rule override a catch-and-release rule for all salmon", () => {
  const cowichan = spot("r1-cowichan-upper");
  const november = checkCatch(cowichan, { species: "Coho", lengthCm: 60 }, on("11-15")).verdict;
  assert.equal(november.kind, "retain");
  assert.equal(november.limit.daily, 1);
  assert.deepEqual(checkCatch(cowichan, { species: "Coho" }, on("10-01")).verdict.kind, "release");
  assert.deepEqual(checkCatch(cowichan, { species: "Chinook" }, on("11-15")).verdict.kind, "release");
});

test("releases a species nothing lets you keep today", () => {
  const listed = water("2", [rule("Coho", "1 per day", "retain", [10, 1], [12, 31])]);
  assert.deepEqual(checkCatch(listed, { species: "Chum" }, on("11-01")).verdict, { kind: "release", reason: "none" });
  assert.deepEqual(checkCatch(listed, { species: "Coho" }, on("09-01")).verdict, { kind: "release", reason: "none" });

  const pending = water("2", [rule("Chum", "To be determined", "pending")]);
  delete pending.rules[0].always;
  assert.deepEqual(checkCatch(pending, { species: "Chum" }, on("11-01")).verdict, { kind: "release", reason: "pending" });

  const zero = water("2", [rule("Coho", "0 per day", "retain")]);
  assert.equal(checkCatch(zero, { species: "Coho" }, on("11-01")).verdict.reason, "zero");
});

test("asks for the adipose fin only where the limit is hatchery-marked", () => {
  const marked = water("2", [rule("Coho", "1 hatchery-marked per day", "retain")]);
  const unasked = checkCatch(marked, { species: "Coho", lengthCm: 50 }, on("11-01"));
  assert.deepEqual(unasked.asks, { fin: true, length: true });
  assert.equal(unasked.verdict.kind, "needs");
  assert.equal(unasked.verdict.field, "fin");
  assert.equal(checkCatch(marked, { species: "Coho", fin: "intact", lengthCm: 50 }, on("11-01")).verdict.reason, "unmarked");
  assert.equal(checkCatch(marked, { species: "Coho", fin: "unsure", lengthCm: 50 }, on("11-01")).verdict.reason, "unmarked");
  assert.equal(checkCatch(marked, { species: "Coho", fin: "clipped", lengthCm: 50 }, on("11-01")).verdict.kind, "retain");

  const wild = water("2", [rule("Coho", "2 per day, 1 of which can be unmarked", "retain")]);
  const kept = checkCatch(wild, { species: "Coho", fin: "intact", lengthCm: 50 }, on("11-01")).verdict;
  assert.equal(kept.kind, "retain");
  assert.equal(kept.limit.unmarkedMax, 1);

  const open = water("4", [rule("Coho", "2 per day", "retain")]);
  assert.deepEqual(checkCatch(open, { species: "Coho" }, on("11-01")).asks, { fin: false, length: false });
  assert.equal(checkCatch(open, { species: "Coho" }, on("11-01")).verdict.kind, "retain");
});

test("measures against the region minimum and the row's size caps", () => {
  const plain = water("2", [rule(["Coho", "Chinook"], "4 per day", "retain")]);
  assert.equal(checkCatch(plain, { species: "Coho" }, on("11-01")).verdict.field, "length");
  assert.deepEqual(checkCatch(plain, { species: "Coho", lengthCm: 24 }, on("11-01")).verdict.reason, "undersize");
  assert.equal(checkCatch(plain, { species: "Coho", lengthCm: 24 }, on("11-01")).verdict.cm, 25);
  assert.equal(checkCatch(plain, { species: "Coho", lengthCm: 25 }, on("11-01")).verdict.kind, "retain");
  assert.equal(checkCatch(plain, { species: "Chinook", lengthCm: 29 }, on("11-01")).verdict.reason, "undersize");

  const capped = water("2", [rule("Coho", "1 per day, maximum size 35 cm", "retain")]);
  assert.equal(checkCatch(capped, { species: "Coho", lengthCm: 35 }, on("11-01")).verdict.kind, "retain");
  const over = checkCatch(capped, { species: "Coho", lengthCm: 36 }, on("11-01")).verdict;
  assert.equal(over.reason, "oversize");
  assert.equal(over.cm, 35);

  const noneOver = water("2", [rule("Chinook", "4 per day, none over 50 cm", "retain")]);
  assert.equal(checkCatch(noneOver, { species: "Chinook", lengthCm: 50 }, on("11-01")).verdict.kind, "retain");
  assert.equal(checkCatch(noneOver, { species: "Chinook", lengthCm: 51 }, on("11-01")).verdict.reason, "oversize");

  const adults = water("2", [rule("Chinook", "4 per day, only 2 over 62 cm", "retain")]);
  const big = checkCatch(adults, { species: "Chinook", lengthCm: 80 }, on("11-01")).verdict;
  assert.equal(big.kind, "retain");
  assert.deepEqual(big.limit.over, { cm: 62, max: 2 });
});

test("hands anything it cannot read back to the angler", () => {
  const hours = water("2", [rule("Coho", "1 per day, from 05:00 h until 22:00 h only", "retain")]);
  assert.equal(checkCatch(hours, { species: "Coho", lengthCm: 50 }, on("11-01")).verdict.kind, "manual");

  const twoWays = water("2", [
    rule("Coho", "1 per day", "retain"),
    rule("Coho", "Non-retention", "release"),
  ]);
  const verdict = checkCatch(twoWays, { species: "Coho", lengthCm: 50 }, on("11-01")).verdict;
  assert.equal(verdict.kind, "manual");
  assert.equal(verdict.rules.length, 2);
});

test("passes gear restrictions along without changing the verdict", () => {
  const baitBan = water("4", [rule("All", "Bait ban", "gear"), rule("Coho", "2 per day", "retain")]);
  const result = checkCatch(baitBan, { species: "Coho" }, on("11-01"));
  assert.equal(result.verdict.kind, "retain");
  assert.deepEqual(result.gear.map((item) => item.regulation.en), ["Bait ban"]);
});

test("marks a row open in the directory when any species may be kept", () => {
  // Chinook closed beside a coho limit: the directory used to call this closed.
  assert.equal(currentKind(spot("r6-tatshenshini-river-downstream-of-the-bc-yukon-bo"), on("10-01")), "retain");
  assert.equal(currentKind(spot("r6-tatshenshini-river-downstream-of-the-bc-yukon-bo"), on("08-01")), "closed");
  assert.equal(currentKind(spot("r6-fulton-river"), on("08-05")), "retain");
  assert.equal(currentKind(spot("r6-fulton-river"), on("09-01")), "closed");
  assert.equal(currentKind(spot("r1-cowichan-upper"), on("10-01")), "release");
  assert.equal(currentKind(spot("r1-cowichan-upper"), on("11-15")), "retain");
  assert.equal(currentKind(spot("fraser-mission"), on("10-01")), "closed");
});

test("agrees with the catch checker on every row and species", () => {
  for (const monthDay of ["01-15", "04-15", "07-01", "08-05", "09-10", "10-01", "11-20", "12-15"]) {
    for (const item of fishingSpots) {
      const keepable = ["Chinook", "Coho", "Sockeye", "Pink", "Chum"].some(
        (species) => checkCatch(item, { species, fin: "clipped", lengthCm: 45 }, on(monthDay)).verdict.kind === "retain",
      );
      if (keepable) assert.equal(currentKind(item, on(monthDay)), "retain", `${item.id} on ${monthDay}`);
    }
  }
});

test("carries the Region 2 chinook changes DFO published in September 2026", () => {
  const coquitlam = spot("coquitlam");
  assert.equal(checkCatch(coquitlam, { species: "Chinook", fin: "intact", lengthCm: 70 }, on("09-10")).verdict.reason, "unmarked");
  const october = checkCatch(coquitlam, { species: "Chinook", fin: "intact", lengthCm: 70 }, on("10-01")).verdict;
  assert.equal(october.kind, "retain");
  assert.equal(october.limit.daily, 1);
  assert.equal(checkCatch(coquitlam, { species: "Chinook", lengthCm: 70 }, on("09-02")).verdict.reason, "none");

  const capilano = spot("capilano");
  assert.deepEqual(checkCatch(capilano, { species: "Chinook", lengthCm: 70 }, on("08-20")).verdict.limit.over, { cm: 62, max: 2 });
  assert.equal(checkCatch(capilano, { species: "Chinook", lengthCm: 70 }, on("10-01")).verdict.limit.over, undefined);
});
