// The DFO tables lean on rowspan and colspan, and a misread cell silently
// attaches the wrong limit to the wrong water, so the grid rebuild is pinned
// down here with the shapes the published pages actually use.

import assert from "node:assert/strict";
import test from "node:test";
import { parseNotes, parseTable } from "../scripts/dfo-regions.mjs";

const table = `
<table>
  <tr><th>Waters</th><th>Specific area</th><th>Species</th><th>Dates</th><th>Limits/Gear</th></tr>
  <tr>
    <td rowspan="3">Alouette River</td>
    <td rowspan="2">Upstream of the 216th Street bridge</td>
    <td>Chinook</td><td>Sep 1 to Nov 30</td><td>1 per day</td>
  </tr>
  <tr><td>Coho</td><td>Oct 1 to Dec 31</td><td>Non-retention</td></tr>
  <tr><td>Downstream of the bridge</td><td>Coho</td><td>Oct 1 to Dec 31</td><td>1 hatchery marked per day</td></tr>
  <tr><th colspan="5">B. Skeena River Watershed</th></tr>
  <tr>
    <td colspan="2" rowspan="2">All waters in section "B(ii)"</td>
    <td>All</td><td>Jan 1 to Jun 15</td><td>No fishing for salmon</td>
  </tr>
  <tr><td></td><td>Apr 1 to Mar 31</td><td>No fishing for eulachon</td></tr>
  <tr><td>Kwinageese River</td><td>Coho</td><td>Apr 1 to Mar 31</td><td>No fishing for coho</td></tr>
  <tr><td>Tlell River</td><td colspan="4">Anglers should note that tidal water regulations apply.</td></tr>
</table>
`;

test("rebuilds the five columns through rowspan and colspan", () => {
  const { columns, rows } = parseTable(table);
  assert.deepEqual(columns, ["Waters", "Specific area", "Species", "Dates", "Limits/Gear"]);

  const cells = rows.filter((row) => row.cells).map((row) => row.cells);
  const headings = rows.filter((row) => row.heading).map((row) => row.heading);

  // A water spanning three rows keeps its name on every one of them, and the
  // area cell spanning two rows does the same.
  assert.deepEqual(cells[0], [
    "Alouette River",
    "Upstream of the 216th Street bridge",
    "Chinook",
    "Sep 1 to Nov 30",
    "1 per day",
  ]);
  assert.deepEqual(cells[1], [
    "Alouette River",
    "Upstream of the 216th Street bridge",
    "Coho",
    "Oct 1 to Dec 31",
    "Non-retention",
  ]);
  assert.deepEqual(cells[2], [
    "Alouette River",
    "Downstream of the bridge",
    "Coho",
    "Oct 1 to Dec 31",
    "1 hatchery marked per day",
  ]);

  assert.deepEqual(headings, ["B. Skeena River Watershed"]);

  // A water may swallow the area column; the species must not slide into it.
  assert.deepEqual(cells[3], [
    'All waters in section "B(ii)"',
    "",
    "All",
    "Jan 1 to Jun 15",
    "No fishing for salmon",
  ]);
  // DFO leaves the species blank on the eulachon row.
  assert.deepEqual(cells[4], [
    'All waters in section "B(ii)"',
    "",
    "",
    "Apr 1 to Mar 31",
    "No fishing for eulachon",
  ]);
});

test("keeps species out of the area column when a section omits the area", () => {
  const cells = parseTable(table)
    .rows.filter((row) => row.cells)
    .map((row) => row.cells);

  // Straight after a section banner there is no rowspan to align against, so
  // the closed species vocabulary is what tells the columns apart.
  assert.deepEqual(cells[5], [
    "Kwinageese River",
    "",
    "Coho",
    "Apr 1 to Mar 31",
    "No fishing for coho",
  ]);
});

test("reads a row with prose but no rule as an advisory", () => {
  const cells = parseTable(table)
    .rows.filter((row) => row.cells)
    .map((row) => row.cells);

  assert.deepEqual(cells[6], [
    "Tlell River",
    "Anglers should note that tidal water regulations apply.",
    "",
    "",
    "",
  ]);
});

test("keeps the rules from the preamble and drops the site furniture", () => {
  const notes = parseNotes(`
    <h1>Region 9 - Test</h1>
    <ul>
      <li>For media relations, please contact us at media.pac@dfo-mpo.gc.ca</li>
      <li>You can only fish for salmon in Region 9 during daylight hours, that is, between 1 hour before sunrise and 1 hour after sunset.</li>
      <li>Learn more about fishing for salmon in B.C.</li>
      <li>Short</li>
      <li>No fishing is allowed within 100 metres of any government counting fence.</li>
    </ul>
    <table></table>
  `);

  assert.equal(notes.length, 2);
  assert.match(notes[0], /daylight hours/);
  assert.match(notes[1], /100 metres/);
});
