// Lists the Region 2 rows whose hand-written rules no longer match the DFO
// table, for when the refresh workflow opens a "DFO edited the Region 2 table"
// issue. Wording and capitalisation differ by design, so species, dates and
// limits are compared after normalising; boundary text is not compared.
//
//   npm run region2:diff            # uses the cached page
//   npm run region2:diff -- --refresh

import { fetchRegion, parseDateModified, parseTable } from "./dfo-regions.mjs";
import { region2Spots } from "../app/fishing-data.ts";

const html = await fetchRegion("region2", { refresh: process.argv.includes("--refresh") });

const months = { june: "jun", july: "jul", sept: "sep" };
const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/–/g, " to ")
    .replace(/\b(june|july|sept)\b/g, (month) => months[month])
    .replace(/hatchery-marked/g, "hatchery marked")
    .replace(/[.,;]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const key = (species, dates, limits) => normalize(`${species} | ${dates} | ${limits}`);

const groups = [];
for (const row of parseTable(html).rows) {
  if (row.heading) continue;
  const [water, area, species, dates, limits] = row.cells;
  let group = groups.at(-1);
  if (!group || group.water !== water || group.area !== area) groups.push((group = { water, area, rules: [] }));
  group.rules.push(key(species, dates, limits));
}

console.log(`DFO Region 2 page modified ${parseDateModified(html)}: ${groups.length} rows, ${region2Spots.length} hand written`);
if (groups.length !== region2Spots.length) {
  console.log("Row count differs: DFO added or removed a water, so compare the tables in order by hand.");
}

let differing = 0;
groups.forEach((group, index) => {
  const spot = region2Spots[index];
  const ours = (spot?.rules ?? []).map((rule) => key(rule.species.join("/"), rule.season.en, rule.regulation.en));
  const missing = group.rules.filter((rule) => !ours.includes(rule));
  const extra = ours.filter((rule) => !group.rules.includes(rule));
  const sameWater = spot && normalize(spot.water.en) === normalize(group.water);
  if (!missing.length && !extra.length && sameWater) return;
  differing += 1;
  console.log(`\n${group.water} — ${group.area || "(entire water)"}`);
  console.log(`  ours: ${spot ? `${spot.id} (${spot.water.en})` : "none"}`);
  for (const rule of missing) console.log(`  + DFO   ${rule}`);
  for (const rule of extra) console.log(`  - ours  ${rule}`);
});

console.log(differing ? `\n${differing} row(s) to transcribe in app/fishing-data.ts` : "\nEvery row matches.");
process.exitCode = differing ? 1 : 0;
