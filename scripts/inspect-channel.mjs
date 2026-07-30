// Scratch helper: list the OSM ways behind a channel and how they connect.
import { overpass, pathLengthKm } from "./overpass.mjs";

const [selector, ...bboxArgs] = process.argv.slice(2);
const bbox = bboxArgs.map(Number);
const [south, west, north, east] = bbox;

const elements = await overpass(`${selector}(${south},${west},${north},${east});out geom;`);
console.log(`${elements.length} elements for ${selector}`);
for (const element of elements) {
  const geometry = (element.geometry ?? []).filter(Boolean);
  if (!geometry.length) {
    console.log(`${element.type} ${element.id} ${element.tags?.name ?? ""} (no geometry)`);
    continue;
  }
  const points = geometry.map(({ lat, lon }) => [lat, lon]);
  const tags = Object.entries(element.tags ?? {})
    .filter(([key]) => ["name", "waterway", "highway", "railway", "natural", "water", "bridge"].includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .join(" ");
  console.log(
    `${element.type} ${element.id} | ${tags}\n  ${points[0].map((v) => v.toFixed(5)).join(",")} -> ${points.at(-1).map((v) => v.toFixed(5)).join(",")} | ${pathLengthKm(points).toFixed(2)} km | ${points.length} pts`,
  );
}
