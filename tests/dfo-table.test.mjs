// The DFO tables lean on rowspan and colspan, and a misread cell silently
// attaches the wrong limit to the wrong water, so the grid rebuild is pinned
// down here with the shapes the published pages actually use.

import assert from "node:assert/strict";
import test from "node:test";
import { parseNoticeLinks, parseNotes, parseNotice, parseTable } from "../scripts/dfo-regions.mjs";

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

test("takes only the fishery notices the rules table cites", () => {
  const links = parseNoticeLinks(`
    <p>See <a href="https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&amp;DOC_ID=111111&amp;ID=all">FN0001</a> for tidal waters.</p>
    <table>
      <tr><td>Stamp River</td><td>Coho</td><td>Oct 3 to Dec 31</td>
        <td>2 per day<br><a href="https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&amp;DOC_ID=368896&amp;ID=all">FN1069</a></td></tr>
      <tr><td>Somass River</td><td>Sockeye</td><td>May 1 to July 23</td>
        <td>1 per day<br><a href="https://www-ops2.pac.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&DOC_ID=352752&ID=all">FN 435</a></td></tr>
      <tr><td>Stamp River</td><td>Coho</td><td>Aug 25 to Oct 2</td>
        <td><a href="https://notices.dfo-mpo.gc.ca/fns-sap/index-eng.cfm?pg=view_notice&DOC_ID=368896&ID=all">FN1069</a></td></tr>
    </table>
  `);

  assert.deepEqual(
    links.map(({ id, docId }) => [id, docId]),
    [
      ["FN1069", "368896"],
      ["FN0435", "352752"],
    ],
  );
  assert.ok(links.every((link) => link.url.startsWith("https://notices.dfo-mpo.gc.ca/fns-sap/")));
});

test("keeps the order from a fishery notice and drops DFO's boilerplate", () => {
  const notice = parseNotice(`
    <div class="span-5" id="subject">
        FN1069-RECREATIONAL - Salmon - Coho - Stamp River - Region 1 - Daily Limit - Effective October 3, 2026
    </div>
    <p><br />
      <pre>Effective October 3, 2026 until December 31, 2026 the daily limit of Coho Salmon is two (2) per day, two (2) of which can be unmarked in open portions of the Stamp River.
Variation Order Number: 2026-RFQ-437 in effect.
NOTES AND REMINDERS:
Barbless hooks are required when fishing for salmon in tidal and non-tidal waters of British Columbia.
FOR MORE INFORMATION:
Please contact the nearest Fisheries and Oceans Canada office</pre>
    </p>
    <p>Fisheries &amp; Oceans Operations Center - FN1069<br />Sent September 29, 2026 at 1631</p>
  `);

  assert.equal(notice.subject, "FN1069-RECREATIONAL - Salmon - Coho - Stamp River - Region 1 - Daily Limit - Effective October 3, 2026");
  assert.equal(notice.sent, "2026-09-29");
  assert.deepEqual(notice.order, [
    "Effective October 3, 2026 until December 31, 2026 the daily limit of Coho Salmon is two (2) per day, two (2) of which can be unmarked in open portions of the Stamp River.",
    "Variation Order Number: 2026-RFQ-437 in effect.",
  ]);
  assert.throws(() => parseNotice("<html><body>Service unavailable</body></html>"), /no subject/);
});
