// Rebuilds app/waterway-paths.ts from OpenStreetMap geometry.
//
// Usage:
//   node scripts/build-waterway-paths.mjs            # rebuild every spec
//   node scripts/build-waterway-paths.mjs --report   # resolve anchors, print, write nothing
//   node scripts/build-waterway-paths.mjs stave      # limit to matching spec ids (report only)
//
// Responses are cached in scripts/.cache so repeated runs do not hammer Overpass.

import { writeFile } from "node:fs/promises";
import { distanceKm, nearestIndex, overpass, pathLengthKm } from "./overpass.mjs";
import { waterwaySpecs } from "./waterway-specs.mjs";

const args = process.argv.slice(2);
const reportOnly = args.includes("--report");
const filters = args.filter((arg) => !arg.startsWith("--"));

const MIN_COMPONENT_KM = 0.4;
// Keeps the shipped geometry small; 8 m is under a pixel until zoom 15.
const SIMPLIFY_KM = 0.008;
// Largest gap between two ways of the same water that still counts as joined.
const CONNECT_KM = 0.05;
const round = (value) => Number(value.toFixed(7));
const key = (point) => `${point[0].toFixed(6)},${point[1].toFixed(6)}`;
const asPoint = ({ lat, lon }) => [round(lat), round(lon)];

async function fetchGeometries(selector, bbox) {
  const [south, west, north, east] = bbox;
  const elements = await overpass(`${selector}(${south},${west},${north},${east});out geom;`);
  const geometries = [];
  for (const element of elements) {
    if (Array.isArray(element.geometry)) {
      const points = element.geometry.filter(Boolean).map(asPoint);
      if (points.length > 1) geometries.push(points);
    }
    // Lakes are often multipolygon relations; their rings live on the members.
    for (const member of element.members ?? []) {
      const points = (member.geometry ?? []).filter(Boolean).map(asPoint);
      if (points.length > 1) geometries.push(points);
    }
  }
  return geometries;
}

function channelSelector(names) {
  const pattern = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  return `way["waterway"~"^(river|stream|canal|tidal_channel)$"]["name"~"^(${pattern})$"]`;
}

// OSM splits each water into many ways; rebuild the continuous channels.
function components(ways) {
  const remaining = ways.map((points, index) => ({ points, index, length: pathLengthKm(points) }));
  const chains = [];

  while (remaining.length) {
    const chain = longestChain(remaining);
    if (!chain.points.length) break;
    chains.push(chain.points);
    const used = new Set(chain.used);
    for (let index = remaining.length - 1; index >= 0; index -= 1) {
      if (used.has(remaining[index].index)) remaining.splice(index, 1);
    }
  }

  return chains.filter((chain) => pathLengthKm(chain) >= MIN_COMPONENT_KM);
}

function longestChain(segments) {
  // Ways of the same water sometimes stop a few metres short of each other, so
  // cluster near-identical endpoints instead of matching them exactly.
  const clusters = [];
  const nodeId = (point) => {
    const found = clusters.findIndex((candidate) => distanceKm(candidate, point) <= CONNECT_KM);
    if (found >= 0) return found;
    clusters.push(point);
    return clusters.length - 1;
  };

  const nodes = new Map();
  segments.forEach((segment, position) => {
    const from = nodeId(segment.points[0]);
    const to = nodeId(segment.points.at(-1));
    if (!nodes.has(from)) nodes.set(from, []);
    if (!nodes.has(to)) nodes.set(to, []);
    nodes.get(from).push({ position, forward: true });
    nodes.get(to).push({ position, forward: false });
  });

  let best = { length: -1, edges: [] };
  const used = new Set();
  let steps = 0;

  const walk = (node, chain, length) => {
    steps += 1;
    if (steps > 500000) return;
    if (length > best.length) best = { length, edges: [...chain] };
    for (const { position, forward } of nodes.get(node) ?? []) {
      if (used.has(position)) continue;
      used.add(position);
      chain.push({ position, forward });
      const tail = forward ? segments[position].points.at(-1) : segments[position].points[0];
      walk(nodeId(tail), chain, length + segments[position].length);
      chain.pop();
      used.delete(position);
    }
  };
  for (const node of nodes.keys()) walk(node, [], 0);

  const points = [];
  let naturalKm = 0;
  let reversedKm = 0;
  for (const { position, forward } of best.edges) {
    const segment = segments[position];
    if (forward) naturalKm += segment.length;
    else reversedKm += segment.length;
    for (const point of forward ? segment.points : [...segment.points].reverse()) {
      if (!points.length || key(points.at(-1)) !== key(point)) points.push(point);
    }
  }

  return {
    // OSM digitises waterways downstream, so follow the dominant direction.
    points: reversedKm > naturalKm ? points.reverse() : points,
    used: best.edges.map(({ position }) => segments[position].index),
  };
}

// Douglas-Peucker, so a 90 km reach does not ship thousands of survey points.
function simplify(path, epsilonKm = SIMPLIFY_KM) {
  if (path.length < 3) return path;
  let farthest = 0;
  let maxDistance = 0;
  for (let index = 1; index < path.length - 1; index += 1) {
    const distance = perpendicularKm(path[index], path[0], path.at(-1));
    if (distance > maxDistance) {
      maxDistance = distance;
      farthest = index;
    }
  }
  if (maxDistance <= epsilonKm) return [path[0], path.at(-1)];
  return [
    ...simplify(path.slice(0, farthest + 1), epsilonKm).slice(0, -1),
    ...simplify(path.slice(farthest), epsilonKm),
  ];
}

// Simplifies around vertices that must survive, such as an interior pin.
function simplifyPreserving(path, indices) {
  const cuts = [0, ...indices.filter((index) => index > 0 && index < path.length - 1).sort((a, b) => a - b), path.length - 1];
  const result = [];
  for (let cut = 0; cut < cuts.length - 1; cut += 1) {
    const piece = simplify(path.slice(cuts[cut], cuts[cut + 1] + 1));
    result.push(...(result.length ? piece.slice(1) : piece));
  }
  return result;
}

function perpendicularKm(point, start, end) {
  const scale = Math.cos((point[0] * Math.PI) / 180);
  const toXY = ([lat, lon]) => [lon * scale * 111.32, lat * 110.574];
  const [px, py] = toXY(point);
  const [ax, ay] = toXY(start);
  const [bx, by] = toXY(end);
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function crossings(chain, others) {
  const found = [];
  for (let index = 0; index < chain.length - 1; index += 1) {
    for (const other of others) {
      for (let j = 0; j < other.length - 1; j += 1) {
        const point = intersect(chain[index], chain[index + 1], other[j], other[j + 1]);
        if (point) found.push({ segment: index, point });
      }
    }
  }
  return found;
}

function intersect(a, b, c, d) {
  const denominator = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (Math.abs(denominator) < 1e-12) return null;
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / denominator;
  const u = ((c[0] - a[0]) * (b[1] - a[1]) - (c[1] - a[1]) * (b[0] - a[0])) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return [round(a[0] + t * (b[0] - a[0])), round(a[1] + t * (b[1] - a[1]))];
}

function nearestApproach(chain, others) {
  let best = { index: 0, distanceKm: Infinity };
  for (const other of others) {
    for (const point of other) {
      const candidate = nearestIndex(chain, point);
      if (candidate.distanceKm < best.distanceKm) best = candidate;
    }
  }
  return best;
}

function offsetIndex(chain, index, km, downstream) {
  let remaining = km;
  let cursor = index;
  while (remaining > 0) {
    const next = downstream ? cursor + 1 : cursor - 1;
    if (next < 0 || next >= chain.length) break;
    remaining -= distanceKm(chain[cursor], chain[next]);
    cursor = next;
  }
  return cursor;
}

// Resolves one DFO boundary onto a channel. `role` decides which side of a
// crossing segment the clipped reach keeps.
async function resolveAnchor(anchor, chain, role) {
  if (anchor.kind === "head") return { vertex: 0, gapKm: 0, note: "channel head" };
  if (anchor.kind === "mouth") return { vertex: chain.length - 1, gapKm: 0, note: "channel mouth" };

  if (anchor.kind === "coord") {
    const { index, distanceKm: gapKm } = nearestIndex(chain, anchor.coord);
    return { vertex: index, gapKm, note: `coord ${gapKm.toFixed(3)} km off channel` };
  }

  if (anchor.kind === "offset") {
    const inner = await resolveAnchor(anchor.from, chain, role);
    const km = anchor.downstreamKm ?? anchor.upstreamKm ?? 0;
    return {
      vertex: offsetIndex(chain, inner.vertex, km, anchor.downstreamKm !== undefined),
      gapKm: inner.gapKm,
      note: `${inner.note} ${anchor.downstreamKm !== undefined ? "+" : "-"}${km} km`,
    };
  }

  const others = await fetchGeometries(anchor.selector, anchor.bbox);
  if (!others.length) throw new Error(`no features for ${anchor.selector}`);

  const hits = crossings(chain, others);
  if (hits.length) {
    // A lake shoreline is crossed on the way in and on the way out; the outlet
    // is the downstream-most crossing.
    const hit = anchor.pick === "downstream" || anchor.kind === "shoreline"
      ? hits.reduce((a, b) => (b.segment > a.segment ? b : a))
      : hits.reduce((a, b) => (b.segment < a.segment ? b : a));
    return {
      vertex: role === "from" ? hit.segment + 1 : hit.segment,
      exact: hit.point,
      gapKm: 0,
      note: `${anchor.kind === "shoreline" ? "shoreline exit" : "segment crossing"} ${hits.length > 1 ? `(${hits.length} candidates)` : ""}`.trim(),
    };
  }

  if (anchor.kind === "shoreline") return { vertex: 0, gapKm: 0, note: "channel head (no shoreline crossing)" };

  const { index, distanceKm: gapKm } = nearestApproach(chain, others);
  const tolerance = anchor.toleranceKm ?? 0.35;
  if (gapKm > tolerance) throw new Error(`${anchor.selector} is ${gapKm.toFixed(3)} km from the channel`);
  return { vertex: index, gapKm, note: `nearest approach ${gapKm.toFixed(3)} km` };
}

async function pickChain(anchor, chains, role) {
  let best = null;
  for (const chain of chains) {
    try {
      const resolved = await resolveAnchor(anchor, chain, role);
      if (!best || resolved.gapKm < best.resolved.gapKm) best = { chain, resolved };
    } catch {
      // This component does not reach the anchor.
    }
  }
  if (!best) throw new Error(`no channel component reaches the ${role} boundary`);
  return best;
}

async function buildReach(reach, label) {
  const ways = await fetchGeometries(channelSelector(reach.channel.names), reach.channel.bbox);
  if (!ways.length) throw new Error(`${label}: no channel ways found`);
  const chains = components(ways);
  if (!chains.length) throw new Error(`${label}: channel did not stitch`);

  if (reach.entire) {
    const pin = await pickChain(reach.pin, chains, "to");
    const pinPoint = pin.resolved.exact ?? pin.chain[pin.resolved.vertex];
    return {
      paths: chains.map((chain) =>
        chain === pin.chain ? simplifyPreserving(chain, [pin.resolved.vertex]) : simplify(chain),
      ),
      pin: { coordinates: pinPoint, label: reach.pin.label, approximate: reach.pin.approximate, note: pin.resolved.note },
      channelKm: chains.reduce((total, chain) => total + pathLengthKm(chain), 0),
      entire: true,
    };
  }

  const picked = await pickChain(reach.from, chains, "from");
  const chain = picked.chain;
  const from = picked.resolved;
  const to = await resolveAnchor(reach.to, chain, "to");

  const forward = from.vertex <= to.vertex;
  const [firstVertex, lastVertex] = forward ? [from.vertex, to.vertex] : [to.vertex, from.vertex];
  const [firstExact, lastExact] = forward ? [from.exact, to.exact] : [to.exact, from.exact];

  const clipped = chain.slice(firstVertex, lastVertex + 1);
  if (firstExact && key(firstExact) !== key(clipped[0])) clipped.unshift(firstExact);
  if (lastExact && key(lastExact) !== key(clipped.at(-1))) clipped.push(lastExact);
  if (clipped.length < 2) throw new Error(`${label}: clipped reach is empty`);
  const path = simplify(clipped);

  return {
    paths: [path],
    channelKm: pathLengthKm(chain),
    from: {
      coordinates: forward ? path[0] : path.at(-1),
      label: reach.from.label,
      approximate: reach.from.approximate,
      note: from.note,
    },
    to: {
      coordinates: forward ? path.at(-1) : path[0],
      label: reach.to.label,
      approximate: reach.to.approximate,
      note: to.note,
    },
  };
}

// Keeps coordinate pairs and bilingual labels on one line each.
function serialize(value, indent = "") {
  if (Array.isArray(value)) {
    if (value.length === 2 && value.every((item) => typeof item === "number")) {
      return `[${value[0]}, ${value[1]}]`;
    }
    const items = value.map((item) => `${indent}  ${serialize(item, `${indent}  `)}`);
    return `[\n${items.join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const inline = JSON.stringify(value);
    if (Object.values(value).every((item) => typeof item === "string") && inline.length < 160) {
      return inline.replace(/","/g, '", "').replace(/^\{"/, '{ "').replace(/"\}$/, '" }');
    }
    const entries = Object.entries(value).map(
      ([name, item]) => `${indent}  ${JSON.stringify(name)}: ${serialize(item, `${indent}  `)}`,
    );
    return `{\n${entries.join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

const output = {};
const report = [];

for (const spec of waterwaySpecs) {
  if (filters.length && !filters.some((filter) => spec.id.includes(filter))) continue;
  try {
    const built = [await buildReach(spec, spec.id)];
    for (const extra of spec.extra ?? []) built.push(await buildReach(extra, `${spec.id} extra`));

    const primary = built[0];
    const endpoints = built.flatMap((reach) =>
      reach.entire
        ? []
        : [reach.from, reach.to].map((point, index) => ({
            coordinates: point.coordinates,
            label: point.label,
            role: index === 0 ? "start" : "end",
            ...(point.approximate ? { approximate: true } : {}),
          })),
    );
    const pin = primary.entire ? primary.pin : primary.from;

    output[spec.id] = {
      paths: built.flatMap((reach) => reach.paths),
      pin: pin.coordinates,
      pinLabel: pin.label,
      pinKind: primary.entire ? "reference" : "start",
      ...(pin.approximate ? { pinApproximate: true } : {}),
      ...(primary.entire ? { entire: true } : {}),
      endpoints,
    };

    report.push(
      `${spec.id}${primary.entire ? " (entire listed water)" : ""}\n` +
        built
          .map((reach, index) => {
            const drawn = reach.paths.reduce((total, path) => total + pathLengthKm(path), 0);
            const detail = reach.entire
              ? `    pin  ${reach.pin.coordinates} · ${reach.pin.note}`
              : `    from ${reach.from.coordinates} · ${reach.from.note}\n    to   ${reach.to.coordinates} · ${reach.to.note}`;
            return `  reach ${index}: ${drawn.toFixed(2)} km drawn of ${reach.channelKm.toFixed(2)} km channel (${reach.paths.length} path${reach.paths.length > 1 ? "s" : ""})\n${detail}`;
          })
          .join("\n"),
    );
  } catch (error) {
    report.push(`${spec.id}\n  FAILED: ${error.message}`);
  }
}

console.log(report.join("\n\n"));

if (!reportOnly && !filters.length) {
  const header = `// Derived from OpenStreetMap waterway geometry (© OpenStreetMap contributors, ODbL).
// Generated by scripts/build-waterway-paths.mjs; do not edit coordinates by hand.
// Every reach is clipped to a boundary the DFO Region 2 table names, and every
// pin sits on the drawn geometry so the map cannot disagree with the table.

export type WaterwayLabel = { en: string; zh: string };

export type WaterwayEndpoint = {
  coordinates: [number, number];
  label: WaterwayLabel;
  role: "start" | "end";
  approximate?: boolean;
};

export type WaterwayPath = {
  paths: [number, number][][];
  pin: [number, number];
  pinLabel: WaterwayLabel;
  pinKind: "start" | "reference";
  pinApproximate?: boolean;
  entire?: boolean;
  endpoints: WaterwayEndpoint[];
};

export const waterwayPaths: Partial<Record<string, WaterwayPath>> = `;

  await writeFile(
    new URL("../app/waterway-paths.ts", import.meta.url),
    `${header}${serialize(output)};\n`,
    "utf8",
  );
  console.log(`\nwrote ${Object.keys(output).length} waters to app/waterway-paths.ts`);
}
