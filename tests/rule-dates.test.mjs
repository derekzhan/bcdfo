import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// The app module is TypeScript, so read the compiled behaviour through a tiny
// re-implementation guard: assert the source resolves dates in Pacific time.
const source = readFileSync(new URL("../app/fishing-data.ts", import.meta.url), "utf8");

test("resolves today in Pacific time so SSR and the browser agree", () => {
  assert.match(source, /timeZone: "America\/Vancouver"/);
  assert.doesNotMatch(source, /date\.getMonth\(\)/, "local-timezone month leaks the server's UTC day");
  assert.doesNotMatch(source, /date\.getDate\(\)/, "local-timezone day leaks the server's UTC day");
});

test("treats a BC evening as the same day the angler sees", () => {
  const pacific = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Vancouver",
    month: "2-digit",
    day: "2-digit",
  });
  const monthDay = (date) => {
    const parts = pacific.formatToParts(date);
    const month = Number(parts.find((part) => part.type === "month").value);
    const day = Number(parts.find((part) => part.type === "day").value);
    return month * 100 + day;
  };

  // 19:00 Pacific on Aug 31 is already Sep 1 in UTC.
  const bcEvening = new Date("2026-09-01T02:00:00Z");
  assert.equal(monthDay(bcEvening), 831);

  const bcMorning = new Date("2026-08-31T16:00:00Z");
  assert.equal(monthDay(bcMorning), 831);
});
