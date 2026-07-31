import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import test, { after } from "node:test";

const START_TIMEOUT_MS = 60_000;

// The page is server-rendered on demand (the root layout reads request
// headers), so the HTML assertions need a running Next.js server rather than a
// static file from `.next`.
let serverPromise;

function startServer() {
  const port = 3000 + (process.pid % 2000);
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    {
      cwd: new URL("..", import.meta.url),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "production" },
    },
  );

  let output = "";
  child.stdout.on("data", (chunk) => (output += chunk));
  child.stderr.on("data", (chunk) => (output += chunk));

  const origin = `http://127.0.0.1:${port}`;
  const ready = (async () => {
    const deadline = Date.now() + START_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`next start exited with ${child.exitCode}:\n${output}`);
      }
      try {
        await fetch(origin, { method: "HEAD" });
        return origin;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    throw new Error(`next start did not listen on ${port}:\n${output}`);
  })();

  return { child, ready };
}

async function render() {
  serverPromise ??= startServer();
  const origin = await serverPromise.ready;

  return fetch(origin, { headers: { accept: "text/html" } });
}

after(() => {
  serverPromise?.child.kill("SIGTERM");
});

async function loadWaterways() {
  const source = await readFile(new URL("../app/waterway-paths.ts", import.meta.url), "utf8");
  const serialized = source
    .slice(source.indexOf("= ", source.indexOf("export const waterwayPaths")) + 2)
    .replace(/;\s*$/, "");
  return { source, waterways: JSON.parse(serialized) };
}

test("server-renders the bilingual salmon explorer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>BC Salmon Map/);
  assert.match(html, /三文鱼钓场指南/);
  assert.match(html, /Alouette/);
  assert.match(html, /Official DFO table|DFO 官方表格/);
  assert.match(html, /region2-eng\.html/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/);
});

test("removes the disposable starter and keeps product metadata", async () => {
  const [layout, packageJson] = await Promise.all([
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /BC Salmon Map/);
  assert.match(packageJson, /"name": "bc-salmon-map"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

test("renders the region-wide DFO notes that apply to every listing", async () => {
  const html = await (await render()).text();

  // Limits printed above the DFO table, not inside any single row.
  assert.match(html, /每日上限为 4 条|daily limit for all species/i);
  assert.match(html, /10 条超过 50 厘米|10 chinook over 50 cm/i);
  assert.match(html, /Squamish/);
  assert.match(html, /25 厘米|25 cm/);
});

test("offers the street and satellite basemaps", async () => {
  const [html, explorer] = await Promise.all([
    (await render()).text(),
    readFile(new URL("../app/FishingExplorer.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(html, /basemap-switch/);
  assert.match(html, /街道图/);
  assert.match(html, /卫星影像/);
  // Imagery only has global coverage through z18; z19 is blank backcountry.
  assert.match(explorer, /World_Imagery\/MapServer\/tile\/\{z\}\/\{y\}\/\{x\}/);
  assert.doesNotMatch(explorer, /maxZoom: 19/);
  assert.match(explorer, /Imagery © <a href="https:\/\/www\.esri\.com">Esri<\/a>/);

  // Leaflet writes its own classes onto the map container, so React must never
  // re-render that className: doing so drops leaflet-container and the tile
  // sizing rules with it, which renders every tile at zero width.
  assert.match(explorer, /ref=\{containerRef\}\s*\n\s*className="map-canvas"/);
  // Layer effects key off a map instance counter, because a hot update rebuilds
  // the map while React keeps state and a boolean would never change again.
  assert.doesNotMatch(explorer, /mapReady/);
  assert.match(explorer, /\[basemap, mapEpoch\]/);
});

test("labels both ends of the reach opened by default", async () => {
  const html = await (await render()).text();

  // Alouette upstream of 216th Street to Allco Park: both DFO boundaries.
  assert.match(html, /216th Street 大桥/);
  assert.match(html, /Allco Park 的钓鱼边界标志/);
  assert.match(html, /起点/);
  assert.match(html, /终点/);
});

test("highlights regulated reaches along real waterway geometry", async () => {
  const explorer = await readFile(new URL("../app/FishingExplorer.tsx", import.meta.url), "utf8");
  const { source, waterways } = await loadWaterways();

  assert.match(explorer, /L\.polyline/);
  assert.match(explorer, /range-endpoint-tooltip/);
  assert.match(source, /OpenStreetMap contributors/);
  assert.ok(waterways["alouette-upper"]);
  assert.ok(waterways["harrison-upper"]);

  // The Chilliwack/Vedder listing is the only row DFO extends onto a second water.
  const chilliwack = waterways["chilliwack-vedder"];
  assert.equal(chilliwack.paths.length, 2);
  assert.equal(chilliwack.entire, undefined);

  for (const [id, waterway] of Object.entries(waterways)) {
    assert.ok(waterway.paths.length >= 1, `${id} has no geometry`);
    for (const path of waterway.paths) assert.ok(path.length >= 2, `${id} has a degenerate path`);

    // Rows with a specific area get labelled endpoints; whole-water rows do not.
    if (waterway.entire) {
      assert.equal(waterway.endpoints.length, 0, `${id} should not claim boundaries`);
      assert.equal(waterway.pinKind, "reference");
    } else {
      assert.equal(waterway.endpoints.length, waterway.paths.length * 2, `${id} is missing endpoints`);
      assert.equal(waterway.pinKind, "start");
    }

    // Every marker must sit on the geometry the map draws.
    for (const point of [waterway.pin, ...waterway.endpoints.map((endpoint) => endpoint.coordinates)]) {
      assert.ok(
        waterway.paths.some((path) => path.some((vertex) => onSamePoint(vertex, point))),
        `${id} has a marker off the drawn reach: ${point}`,
      );
    }
  }
});

test("draws the reaches DFO spells out beyond Region 2", async () => {
  const { waterways } = await loadWaterways();

  for (const id of [
    "r3-bridge-river",
    "r3-clearwater-river",
    "r3-fraser-lillooet",
    "r3-thompson-upper",
    "r3-thompson-lower",
    "r7-nechako",
    "r8-shuswap-middle",
    "r8-shuswap-lower",
    "r8-shuswap-trinity",
  ]) {
    assert.ok(waterways[id], `${id} lost its geometry`);
  }

  // The two Thompson rows meet at Goldpan Provincial Park, so the boundary they
  // share has to be one point in both: no gap between them, no overlap.
  const upperEnd = waterways["r3-thompson-upper"].endpoints.find((point) => point.role === "end");
  const lowerStart = waterways["r3-thompson-lower"].endpoints.find((point) => point.role === "start");
  assert.ok(
    onSamePoint(upperEnd.coordinates, lowerStart.coordinates),
    "the two Thompson rows do not meet at Goldpan",
  );

  // DFO measures this reach in metres, so the drawn line has to measure the
  // same; clipping to the nearest survey point made it more than twice as long.
  const trinity = waterways["r8-shuswap-trinity"];
  assert.equal(trinity.paths.length, 1);
  const metres = pathMetres(trinity.paths[0]);
  assert.ok(metres > 90 && metres < 110, `the 100 m reach measures ${metres.toFixed(0)} m`);

  // A lake is an area rather than a reach, and "All Region 4 waters" names no
  // water at all, so those rows stay text plus a marker.
  for (const prefix of [
    "r3-kamloops-lake",
    "r3-south-thompson",
    "r4-all-region-4-waters",
    "r8-mabel-lake",
    "r8-osoyoos-lake",
  ]) {
    assert.ok(
      !Object.keys(waterways).some((id) => id.startsWith(prefix)),
      `${prefix} should stay text-only`,
    );
  }
});

test("keeps every DFO row either mapped or explicitly text-only", async () => {
  const [data, generated, { waterways }] = await Promise.all([
    readFile(new URL("../app/fishing-data.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/region-data.generated.ts", import.meta.url), "utf8"),
    loadWaterways(),
  ]);

  const ids = [...data.matchAll(/^\s{4}id: "([a-z-]+)",$/gm)].map((match) => match[1]);
  assert.ok(ids.length >= 26, `expected the full DFO table, found ${ids.length} rows`);

  // DFO gives no mappable extent for these, so they stay text plus a marker.
  const textOnly = new Set(["fraser-mission", "khartoum", "lois", "little-campbell-closure"]);
  for (const id of ids) {
    assert.equal(
      Boolean(waterways[id]),
      !textOnly.has(id),
      `${id} should ${textOnly.has(id) ? "not " : ""}have mapped geometry`,
    );
  }

  // Reaches outside Region 2 hang off the ids build-region-data.mjs assigns, so
  // a reworded DFO row would otherwise drop its geometry without a word.
  const generatedIds = [...generated.matchAll(/^\s{4}id: "(r\d-[a-z0-9-]+)",$/gm)].map((match) => match[1]);
  const known = new Set([...ids, ...generatedIds]);
  for (const id of Object.keys(waterways)) {
    assert.ok(known.has(id), `${id} has geometry but no DFO row`);
  }
});

test("lets the reader switch between every DFO freshwater region", async () => {
  const html = await (await render()).text();

  assert.match(html, /region-picker/);
  // All eight freshwater regions DFO publishes, with the count of listed waters.
  for (const [id, name] of [
    ["1", "温哥华岛"],
    ["2", "低陆平原"],
    ["3", "汤普森-尼科拉"],
    ["4", "库特尼"],
    ["5", "卡里布"],
    ["6", "斯基纳"],
    ["7", "奥米内卡-皮斯河"],
    ["8", "奥卡纳根"],
  ]) {
    assert.match(html, new RegExp(`第 ${id} 区 · ${name}`), `region ${id} is missing from the picker`);
  }

  // Region 2 opens first because it is the only one with verified reaches.
  assert.match(html, /value="2"[^>]*selected|defaultValue/);
  assert.match(html, /第 2 区 · 低陆平原 \(26\)/);
});

test("carries every generated region row into typed data", async () => {
  const generated = await readFile(new URL("../app/region-data.generated.ts", import.meta.url), "utf8");

  // Region 2 is hand maintained, so it must not be duplicated here.
  assert.doesNotMatch(generated, /^\s{4}region: "2",$/m);
  assert.match(generated, /GENERATED by scripts\/build-region-data\.mjs/);

  // Water ids carry their region so nothing can collide across the tables.
  const ids = [...generated.matchAll(/^\s{4}id: "(r\d-[a-z0-9-]+)",$/gm)].map((match) => match[1]);
  assert.ok(ids.length > 150, `expected the other regions' rows, found ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, "generated water ids must be unique");
  for (const id of ids) assert.match(id, /^r[13-8]-/, `${id} is not scoped to its region`);

  const regionIds = [...generated.matchAll(/^\s{4}id: "(\d)",$/gm)].map((match) => match[1]);
  assert.deepEqual(regionIds, ["1", "3", "4", "5", "6", "7", "8"]);

  // Every row keeps at least one species and a kind the map knows how to draw.
  const rules = [...generated.matchAll(/\{ species: \[([^\]]*)\][^}]*kind: "(\w+)"/g)];
  assert.ok(rules.length > 250, `expected the published rules, found ${rules.length}`);
  for (const [, species, kind] of rules) {
    assert.match(species, /"\w+"/, "a rule lists no species");
    assert.ok(
      ["retain", "release", "gear", "closed", "pending"].includes(kind),
      `unexpected rule kind ${kind}`,
    );
  }

  // Boundary prose stays in DFO's English on purpose; the limits are translated.
  assert.match(generated, /regulation: t\("Non-retention", "不得保留，钓获即放"\)/);
  assert.match(generated, /regulation: t\("No fishing for coho", "禁止垂钓银鲑"\)/);
  assert.doesNotMatch(generated, /禁止垂钓salmon/);
});

test("says so plainly where a region is listed but not yet drawn", async () => {
  const explorer = await readFile(new URL("../app/FishingExplorer.tsx", import.meta.url), "utf8");
  const data = await readFile(new URL("../app/fishing-data.ts", import.meta.url), "utf8");

  // Region 5 publishes prose instead of a table.
  assert.match(explorer, /regionEmpty/);
  assert.match(explorer, /本区水域尚未绘制到地图/);
  assert.match(explorer, /尚未定位 · 仅显示 DFO 表格中的规定/);

  // Rows without a location must not claim a navigation target.
  assert.match(explorer, /\{boundaryPoint && \(\s*\n\s*<a\s*\n\s*className="navigate-button"/);
  // A missing location is a null boundary, never a silent [0, 0].
  assert.match(data, /export function getBoundaryStart\(spot: FishingSpot\): BoundaryPoint \| null/);
  assert.match(data, /if \(!spot\.coordinates\) return null;/);

  // Framing extents are camera hints only, one per region.
  const extents = data.match(/export const regionExtents[\s\S]*?\n\};/)?.[0] ?? "";
  for (const id of ["1", "2", "3", "4", "5", "6", "7", "8"]) {
    assert.match(extents, new RegExp(`"${id}": \\[\\[`), `region ${id} has no map extent`);
  }
});

test("keeps the phone layout from being clamped or colourless", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const explorer = await readFile(new URL("../app/FishingExplorer.tsx", import.meta.url), "utf8");

  // Blocks later in the file re-apply the desktop viewport height, so the last
  // phone block has to restate the reset or the stacked list overflows its
  // container and lands on top of the sections below it.
  const phoneBlocks = [...css.matchAll(/@media \(max-width: 760px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  const reset = phoneBlocks.find((block) => /\.explorer \{[^}]*max-height: none/.test(block));
  assert.ok(reset, "no phone block resets the explorer height");
  assert.match(reset, /\.explorer \{[^}]*height: auto/);
  assert.match(reset, /\.explorer \{[^}]*min-height: 0/);
  const lastExplorerHeight = css.lastIndexOf("max-height: none");
  const lastDesktopClamp = css.lastIndexOf("max-height: 880px");
  assert.ok(lastExplorerHeight > lastDesktopClamp, "the desktop clamp wins over the phone reset");

  // The badge paints its background from the status colour, so a literal white
  // colour here would hide both the number and the status.
  assert.match(css, /\.list-index \{[^}]*background: currentColor/);
  assert.doesNotMatch(css, /\.list-index \{[^}]*color: #fff/);
  assert.match(css, /\.list-index b \{\s*color: #fff/);
  assert.doesNotMatch(css, /\.map-marker \{[^}]*color: #fff/);
  assert.match(explorer, /className=\{`list-index marker-\$\{kind\}`\}><b>\{index \+ 1\}<\/b>/);

  // Filter chips get their own row below 1080px; sharing the row with the region
  // picker and the search box squeezed them to a few dozen pixels.
  const tabletBlocks = [...css.matchAll(/@media \(max-width: 1080px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]);
  assert.ok(
    tabletBlocks.some((block) => /\.filters \{[^}]*grid-column: 1 \/ -1/.test(block)),
    "filters do not get a full row on tablets",
  );

  // Permanent boundary labels are centred on their point and would otherwise
  // collide with each other on a narrow map.
  assert.match(explorer, /const narrowMap = map\.getSize\(\)\.x < 520;/);
  assert.match(explorer, /direction: below \? "bottom" : "top"/);
});

function onSamePoint(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}

function pathMetres(path) {
  const rad = Math.PI / 180;
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const [aLat, aLon] = path[index - 1];
    const [bLat, bLon] = path[index];
    const h =
      Math.sin(((bLat - aLat) * rad) / 2) ** 2 +
      Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(((bLon - aLon) * rad) / 2) ** 2;
    total += 2 * 6371000 * Math.asin(Math.sqrt(h));
  }
  return total;
}
