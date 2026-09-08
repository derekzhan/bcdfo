// Scratch helper: list a channel's free ends with each one's distance to the
// coastline, so a marker can be pinned at the real mouth. Needed because OSM
// splits many waters into several components and a `mouth` anchor then lands on
// whichever component the stitcher returns first, which may be an inland end.
//
//   node scripts/inspect-mouths.mjs "Nanaimo River" 49.02,-124.55,49.18,-123.82
//   node scripts/inspect-mouths.mjs "Adam River|Eve River" 50.08,-126.42,50.51,-126.0
import { distanceKm, overpass } from "./overpass.mjs";

const [names, bboxArg] = process.argv.slice(2);
if (!names || !bboxArg) {
  console.error('usage: node scripts/inspect-mouths.mjs "River Name|Other Name" south,west,north,east');
  process.exit(1);
}

const [south, west, north, east] = bboxArg.split(",").map(Number);
const key = (point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

const elements = await overpass(
  `way["waterway"~"^(river|stream|canal)$"]["name"~"^(${names.split("|").join("|")})$"](${south},${west},${north},${east});out geom;`,
);
const ways = elements
  .filter((element) => Array.isArray(element.geometry) && element.geometry.filter(Boolean).length > 1)
  .map((element) => element.geometry.filter(Boolean).map(({ lat, lon }) => [lat, lon]));

// An endpoint shared with another way is interior to the channel; the ones that
// appear exactly once are the true ends.
const counts = new Map();
for (const points of ways) {
  for (const end of [points[0], points.at(-1)]) {
    counts.set(key(end), (counts.get(key(end)) ?? 0) + 1);
  }
}
const ends = [...counts].filter(([, count]) => count === 1).map(([id]) => id.split(",").map(Number));

const coast = await overpass(`way["natural"="coastline"](${south},${west},${north},${east});out geom;`);
const coastPoints = coast.flatMap((element) =>
  (element.geometry ?? []).filter(Boolean).map(({ lat, lon }) => [lat, lon]),
);

console.log(`${names}: ${ways.length} ways, ${ends.length} free ends`);
const scored = ends.map((end) => ({
  end,
  sea: coastPoints.length ? Math.min(...coastPoints.map((point) => distanceKm(end, point))) : Infinity,
}));
for (const { end, sea } of scored.sort((a, b) => a.sea - b.sea)) {
  console.log(`  ${key(end)} · ${sea === Infinity ? "no coastline in the box" : `${sea.toFixed(3)} km to coast`}`);
}
