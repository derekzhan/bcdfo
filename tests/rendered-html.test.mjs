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

test("highlights regulated reaches along real waterway geometry", async () => {
  const [explorer, paths] = await Promise.all([
    readFile(new URL("../app/FishingExplorer.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/waterway-paths.ts", import.meta.url), "utf8"),
  ]);

  assert.match(explorer, /L\.polyline/);
  assert.match(explorer, /range-endpoint-tooltip/);
  assert.match(paths, /"alouette-upper"/);
  assert.match(paths, /"harrison-upper"/);
  assert.match(paths, /OpenStreetMap contributors/);
  assert.match(paths, /"start":/);
  assert.doesNotMatch(paths, /Downstream Chilliwack\/Vedder extent/);
  assert.doesNotMatch(paths, /Downstream river mouth/);

  const serializedPaths = paths
    .slice(paths.indexOf("= ", paths.indexOf("export const")) + 2)
    .replace(/;\s*$/, "");
  const generated = JSON.parse(serializedPaths);
  const chilliwack = generated["chilliwack-vedder"];

  assert.equal(chilliwack.paths.length, 2);
  assert.equal(chilliwack.end, undefined);
  assert.deepEqual(chilliwack.start, chilliwack.paths[0][0]);

  for (const waterway of Object.values(generated)) {
    if (waterway.start) assert.deepEqual(waterway.start, waterway.paths[0][0]);
    if (waterway.end) assert.deepEqual(waterway.end, waterway.paths.at(-1).at(-1));
  }
});
