import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

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
  assert.match(html, /鲑鱼钓场指南/);
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

test("keeps every DFO row either mapped or explicitly text-only", async () => {
  const [data, { waterways }] = await Promise.all([
    readFile(new URL("../app/fishing-data.ts", import.meta.url), "utf8"),
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
  for (const id of Object.keys(waterways)) {
    assert.ok(ids.includes(id), `${id} has geometry but no DFO row`);
  }
});

function onSamePoint(a, b) {
  return Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
}
