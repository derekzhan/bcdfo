// Scratch helper: stitch a channel the way the builder does, then print where
// each candidate boundary lands along it. Answers "is A upstream of B?" with the
// actual geometry instead of a guess from latitude.
//
//   node scripts/inspect-order.mjs "Stamp River" 49.25,-125.47,49.43,-124.84 \
//     'way["waterway"]["name"="Ash River"]' 'way["power"="line"]' 
import { distanceKm, overpass, pathLengthKm } from "./overpass.mjs";

const [channelNames, bboxArg, ...selectors] = process.argv.slice(2);
const bbox = bboxArg.split(",").map(Number);
const [south, west, north, east] = bbox;

async function ways(query) {
  const elements = await overpass(`${query}(${south},${west},${north},${east});out geom;`);
  return elements
    .filter((element) => Array.isArray(element.geometry) && element.geometry.filter(Boolean).length > 1)
    .map((element) => ({
      id: element.id,
      tags: element.tags ?? {},
      points: element.geometry.filter(Boolean).map(({ lat, lon }) => [lat, lon]),
    }));
}

const key = (point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`;

// Same greedy stitch as the builder: join ways that share an endpoint.
function components(list) {
  const remaining = [...list];
  const chains = [];
  while (remaining.length) {
    const seed = remaining.shift();
    let chain = [...seed.points];
    let grew = true;
    while (grew) {
      grew = false;
      for (let index = 0; index < remaining.length; index += 1) {
        const points = remaining[index].points;
        if (key(points[0]) === key(chain.at(-1))) chain = chain.concat(points.slice(1));
        else if (key(points.at(-1)) === key(chain.at(-1))) chain = chain.concat([...points].reverse().slice(1));
        else if (key(points.at(-1)) === key(chain[0])) chain = points.slice(0, -1).concat(chain);
        else if (key(points[0]) === key(chain[0])) chain = [...points].reverse().slice(0, -1).concat(chain);
        else continue;
        remaining.splice(index, 1);
        grew = true;
        break;
      }
    }
    chains.push(chain);
  }
  return chains.sort((a, b) => pathLengthKm(b) - pathLengthKm(a));
}

const channel = await ways(
  `way["waterway"~"^(river|stream|canal)$"]["name"~"^(${channelNames.split("|").join("|")})$"]`,
);
const chains = components(channel);
console.log(`${channel.length} ways -> ${chains.length} components`);
chains.forEach((chain, index) => {
  console.log(
    `  component ${index}: ${pathLengthKm(chain).toFixed(2)} km, ${chain.length} pts, ends ${key(chain[0])} .. ${key(chain.at(-1))}`,
  );
});

const chain = chains[0];
const cumulative = [0];
for (let index = 1; index < chain.length; index += 1) {
  cumulative.push(cumulative[index - 1] + distanceKm(chain[index - 1], chain[index]));
}

for (const selector of selectors) {
  const others = await ways(selector);
  console.log(`\n## ${selector}: ${others.length} ways`);
  const hits = [];
  for (const other of others) {
    for (const point of other.points) {
      let best = { km: Infinity, at: 0 };
      for (let index = 0; index < chain.length; index += 1) {
        const km = distanceKm(chain[index], point);
        if (km < best.km) best = { km, at: cumulative[index] };
      }
      if (best.km < 0.08) hits.push({ ...best, name: other.tags.name ?? other.tags.ref ?? other.id, point });
    }
  }
  // Collapse the many vertices of one feature into a single reported touch point.
  const grouped = [];
  for (const hit of hits.sort((a, b) => a.at - b.at)) {
    const last = grouped.at(-1);
    if (last && last.name === hit.name && hit.at - last.at < 0.3) continue;
    grouped.push(hit);
  }
  for (const hit of grouped) {
    console.log(
      `  ${hit.name} @ ${key(hit.point)} · ${hit.at.toFixed(2)} km from ${key(chain[0])} end · off channel ${hit.km.toFixed(3)} km`,
    );
  }
}
