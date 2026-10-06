// The site carries only the fishery notices its rules cite, and every cited
// notice has to be there, or a reader sees a number with nothing behind it.

import assert from "node:assert/strict";
import test from "node:test";

import { fishingSpots, noticesFor } from "../app/fishing-data.ts";
import { fisheryNotices } from "../app/region-data.generated.ts";

const cited = new Map();
for (const spot of fishingSpots) {
  for (const rule of spot.rules) {
    for (const id of rule.regulation.en.match(/FN\d{4}/g) ?? []) {
      cited.set(id, [...(cited.get(id) ?? []), spot.region]);
    }
  }
}

test("every notice a rule cites is stored, linked to DFO", () => {
  const missing = [...cited.keys()].filter((id) => !fisheryNotices[id]);
  assert.deepEqual(missing, []);
  for (const notice of Object.values(fisheryNotices)) {
    assert.match(notice.url, /^https:\/\/notices\.dfo-mpo\.gc\.ca\/fns-sap\/.*DOC_ID=\d+/);
  }
});

test("stores no notice that no rule cites", () => {
  const unrelated = Object.keys(fisheryNotices).filter((id) => !cited.has(id));
  assert.deepEqual(unrelated, []);
});

test("a fetched notice is the one its number names", () => {
  for (const notice of Object.values(fisheryNotices)) {
    if (!notice.subject) continue;
    assert.ok(notice.subject.startsWith(notice.id), `${notice.id}: ${notice.subject}`);
    assert.match(notice.sent ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(notice.order?.length, `${notice.id} has its order`);
    assert.ok(
      notice.order.every((line) => !/NOTES AND REMINDERS|Barbless hooks are required/.test(line)),
      `${notice.id} drops the boilerplate`,
    );
  }
});

test("hands each rule the notices it cites, Region 2 included", () => {
  const region2 = fishingSpots.filter((spot) => spot.region === "2").flatMap((spot) => spot.rules);
  const ids = region2.flatMap((rule) => noticesFor(rule).map((notice) => notice.id));
  for (const id of ["FN0960", "FN0961", "FN1008"]) assert.ok(ids.includes(id), `${id} reaches Region 2`);

  const stamp = fishingSpots
    .flatMap((spot) => spot.rules)
    .find((rule) => rule.regulation.en.includes("FN1069"));
  assert.deepEqual(noticesFor(stamp).map((notice) => notice.id), ["FN1069"]);
});
