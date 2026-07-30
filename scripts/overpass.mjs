// Minimal Overpass helper shared by the waterway build scripts.
// Data © OpenStreetMap contributors, ODbL.

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const HEADERS = {
  // Overpass mirrors answer 406 to requests without a descriptive user agent.
  "user-agent": "bc-salmon-map/1.0 (DFO Region 2 reach builder)",
  accept: "application/json,text/plain,*/*",
};

const CACHE_DIR = new URL("./.cache/", import.meta.url);
const memory = new Map();
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function overpass(query) {
  const key = query.replace(/\s+/g, " ").trim();
  if (memory.has(key)) return memory.get(key);

  const digest = createHash("sha1").update(key).digest("hex").slice(0, 16);
  const cacheFile = new URL(`${digest}.json`, CACHE_DIR);
  try {
    const cached = JSON.parse(await readFile(cacheFile, "utf8"));
    memory.set(key, cached);
    return cached;
  } catch {
    // Not cached yet.
  }

  let lastError;
  for (let attempt = 0; attempt < ENDPOINTS.length * 4; attempt += 1) {
    const endpoint = ENDPOINTS[Math.floor(attempt / 4)];
    try {
      await waitForSlot(endpoint);
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { ...HEADERS, "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ data: `[out:json][timeout:180];${query}` }),
        signal: AbortSignal.timeout(240000),
      });
      if (!response.ok) throw new Error(`${endpoint} -> ${response.status}`);
      const elements = (await response.json()).elements ?? [];
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(cacheFile, JSON.stringify(elements));
      memory.set(key, elements);
      return elements;
    } catch (error) {
      lastError = error;
      await wait(15000);
    }
  }
  throw lastError;
}

// Overpass answers 429 whenever no slot is free, so poll /api/status first.
async function waitForSlot(endpoint) {
  const statusUrl = endpoint.replace(/interpreter$/, "status");
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      const response = await fetch(statusUrl, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (!response.ok) return;
      const text = await response.text();
      if (!/Rate limit:/.test(text) || /\d+ slots? available now/.test(text)) return;
      const seconds = [...text.matchAll(/in (\d+) seconds/g)].map((match) => Number(match[1]));
      await wait(seconds.length ? Math.min(...seconds) * 1000 + 1000 : 12000);
    } catch {
      return;
    }
  }
}

const EARTH_RADIUS_KM = 6371;

export function distanceKm(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b[0] - a[0]) * rad;
  const dLon = (b[1] - a[1]) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function pathLengthKm(path) {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    total += distanceKm(path[index - 1], path[index]);
  }
  return total;
}

export function nearestIndex(path, point) {
  let best = 0;
  let bestDistance = Infinity;
  path.forEach((vertex, index) => {
    const distance = distanceKm(vertex, point);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });
  return { index: best, distanceKm: bestDistance };
}
