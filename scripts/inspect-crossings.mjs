// Scratch helper: list every place a selector crosses a named channel.
import { distanceKm, overpass, pathLengthKm } from "./overpass.mjs";

const [channelName, selector, ...bboxArgs] = process.argv.slice(2);
const bbox = bboxArgs.map(Number);
const [south, west, north, east] = bbox;

async function ways(query) {
  const elements = await overpass(`${query}(${south},${west},${north},${east});out geom;`);
  return elements
    .filter((element) => Array.isArray(element.geometry) && element.geometry.length > 1)
    .map((element) => ({
      id: element.id,
      tags: element.tags ?? {},
      points: element.geometry.filter(Boolean).map(({ lat, lon }) => [lat, lon]),
    }));
}

const channel = (
  await ways(`way["waterway"~"^(river|stream|canal)$"]["name"="${channelName}"]`)
).sort((a, b) => pathLengthKm(b.points) - pathLengthKm(a.points))[0];
const others = await ways(selector);

console.log(`channel ${channel.id}: ${pathLengthKm(channel.points).toFixed(2)} km, ${channel.points.length} pts`);
console.log(`  head ${channel.points[0]} mouth ${channel.points.at(-1)}`);

const cumulative = [0];
for (let index = 1; index < channel.points.length; index += 1) {
  cumulative.push(cumulative[index - 1] + distanceKm(channel.points[index - 1], channel.points[index]));
}
const total = cumulative.at(-1);

for (const other of others) {
  for (let index = 0; index < channel.points.length - 1; index += 1) {
    const a = channel.points[index];
    const b = channel.points[index + 1];
    for (let j = 0; j < other.points.length - 1; j += 1) {
      const point = intersect(a, b, other.points[j], other.points[j + 1]);
      if (!point) continue;
      const name = other.tags.name ?? other.tags.power ?? other.tags.railway ?? other.tags.highway ?? "";
      console.log(
        `  crossing at ${point[0].toFixed(5)},${point[1].toFixed(5)} · ${cumulative[index].toFixed(2)} km from head · ${(total - cumulative[index]).toFixed(2)} km from mouth · way ${other.id} ${name}`,
      );
    }
  }
}

function intersect(a, b, c, d) {
  const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / denominator;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}
