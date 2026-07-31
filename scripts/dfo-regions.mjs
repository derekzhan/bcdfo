// Fetches and parses the DFO recreational salmon tables for BC's freshwater
// regions. The pages share one layout: a five column table (Waters, Specific
// area, Species, Dates, Limits/Gear) that leans on rowspan, plus a preamble of
// notes that apply to every row below.
//
// Region 5 publishes no table at all and Region 6 splits its table into
// lettered sections, so both shapes are handled here rather than in callers.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const CACHE = join(ROOT, "scripts", ".cache", "dfo");
const BASE = "https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

export const regions = [
  { id: "1", slug: "region1", en: "Vancouver Island", zh: "温哥华岛" },
  { id: "2", slug: "region2", en: "Lower Mainland", zh: "低陆平原" },
  { id: "3", slug: "region3", en: "Thompson-Nicola", zh: "汤普森-尼科拉" },
  { id: "4", slug: "region4", en: "Kootenays", zh: "库特尼" },
  { id: "5", slug: "region5", en: "Cariboo", zh: "卡里布" },
  { id: "6", slug: "region6", en: "Skeena", zh: "斯基纳" },
  { id: "7", slug: "region7", en: "Omineca-Peace", zh: "奥米内卡-皮斯河" },
  { id: "8", slug: "region8", en: "Okanagan", zh: "奥卡纳根" },
];

export const sourceUrlFor = (slug) => `${BASE}/${slug}-eng.html`;

export async function fetchRegion(slug, { refresh = false } = {}) {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${slug}.html`);
  if (!refresh && existsSync(file)) return readFileSync(file, "utf8");
  const response = await fetch(sourceUrlFor(slug), { headers: { "user-agent": UA } });
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`);
  const html = await response.text();
  writeFileSync(file, html, "utf8");
  return html;
}

const ENTITIES = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ldquo: "\u201c",
  rdquo: "\u201d",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ndash: "\u2013",
  mdash: "\u2014",
  deg: "\u00b0",
  eacute: "\u00e9",
  hellip: "\u2026",
};

export function text(html) {
  return html
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

// Walks the table honouring rowspan/colspan so every logical row comes back as
// a full five column record, and rows that are really section banners come back
// as headings instead of data.
export function parseTable(html) {
  const start = html.indexOf("<table");
  if (start === -1) return { columns: [], rows: [] };
  const table = html.slice(start, html.indexOf("</table>", start));
  const rawRows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);

  let columns = [];
  const rows = [];
  const carry = []; // cells still spanning down from earlier rows, per column

  for (const raw of rawRows) {
    const cells = [...raw.matchAll(/<(t[dh])([^>]*)>([\s\S]*?)<\/\1>/gi)].map((cell) => ({
      head: cell[1].toLowerCase() === "th",
      rowspan: Number((cell[2].match(/rowspan="?(\d+)/i) ?? [])[1] ?? 1),
      colspan: Number((cell[2].match(/colspan="?(\d+)/i) ?? [])[1] ?? 1),
      value: text(cell[3]),
    }));
    if (!cells.length) continue;

    // The column header row, and section banners spanning the whole width.
    const spanned = cells.reduce((sum, cell) => sum + cell.colspan, 0);
    if (cells.every((cell) => cell.head) && cells.length > 1 && !columns.length) {
      columns = cells.map((cell) => cell.value);
      continue;
    }
    if (cells.length === 1 && (cells[0].head || cells[0].colspan >= Math.max(columns.length, 2))) {
      rows.push({ heading: cells[0].value });
      continue;
    }
    if (cells.every((cell) => cell.head) && spanned >= columns.length && columns.length) {
      rows.push({ heading: cells.map((cell) => cell.value).join(" ") });
      continue;
    }

    const width = Math.max(columns.length, 5);
    const row = new Array(width).fill(null);
    for (let column = 0; column < width; column += 1) {
      if (carry[column]?.left > 0) {
        row[column] = carry[column].value;
        carry[column].left -= 1;
      }
    }
    let cursor = 0;
    for (const cell of cells) {
      while (cursor < width && row[cursor] !== null) cursor += 1;
      if (cursor >= width) break;
      // A cell may cover several columns (DFO lets a water name swallow the
      // specific-area column) and several rows at once.
      for (let offset = 0; offset < cell.colspan && cursor + offset < width; offset += 1) {
        const value = offset === 0 ? cell.value : "";
        row[cursor + offset] = value;
        if (cell.rowspan > 1) carry[cursor + offset] = { value, left: cell.rowspan - 1 };
      }
      cursor += cell.colspan;
    }
    rows.push({ cells: realign(row.map((value) => value ?? "")) });
  }

  return { columns, rows };
}

const SPECIES = /^(all|chinook|coho|sockeye|pink|chum|steelhead)\b/i;
const DATES = /^(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\w*\.?\s+\d|^to be determined|until further notice/i;

// Sections that carry no "Specific area" cell (Region 6 does this) would
// otherwise slide the species into the area column, because rowspan gives no
// hint when the row directly follows a section banner.
function realign(row) {
  if (row.length < 5 || !SPECIES.test(row[1]) || !DATES.test(row[2]) || row[4]) return row;
  return [row[0], "", row[1], row[2], row[3]];
}

// The notes printed above the table. Contact addresses and site furniture are
// dropped so only rules that actually govern fishing remain.
export function parseNotes(html) {
  const body = html.slice(html.indexOf("<h1"), html.indexOf("<table") + 1 || undefined);
  const items = [...body.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)].map((match) => text(match[1]));
  const skip =
    /@dfo-mpo\.gc\.ca|media relations|fisheries violation|Fishery Notice|subscribe|Twitter|Facebook|^Home$|^Skip|Contact us|system maintenance|^Learn more|^Glossary/i;
  return items.filter((item) => item.length > 30 && !skip.test(item));
}

export function parseHeading(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? text(match[1]) : "";
}
