// Popular spots come from what anglers post, so the checks here are about
// keeping that hearsay honest: every spot is sourced twice over, sits on the
// reach it claims, and none points anglers at water DFO keeps closed.

import assert from "node:assert/strict";
import test from "node:test";

import { region2Spots } from "../app/fishing-data.ts";
import { popularSpots } from "../app/popular-spots.ts";
import { waterwayPaths } from "../app/waterway-paths.ts";

// Region 2 bans fishing within 100 m of any government facility for counting,
// passing or rearing fish. Coordinates are the OpenStreetMap features.
const facilities = [
  ["Capilano River Hatchery", 49.35665, -123.11014],
  ["Capilano Hatchery Diversion Weir", 49.35645, -123.11089],
  ["Allco hatchery (Alouette)", 49.24704, -122.53268],
  ["Bell-Irving hatchery (Kanaka Creek)", 49.21112, -122.50948],
  ["Hoy Creek hatchery (Coquitlam)", 49.28698, -122.79713],
  ["Chehalis River Hatchery", 49.29009, -121.94312],
  ["Chilliwack River Hatchery", 49.07955, -121.70426],
  ["Tenderfoot Creek Hatchery", 49.83275, -123.1497],
  ["Little Campbell River Hatchery", 49.02498, -122.70795],
  ["Chapman Creek Hatchery", 49.44515, -123.71656],
  ["Tynehead Hatchery (Serpentine)", 49.17791, -122.76266],
];

const metres = ([lat1, lon1], [lat2, lon2]) => {
  const rad = Math.PI / 180;
  const x = (lon2 - lon1) * rad * Math.cos(((lat1 + lat2) / 2) * rad);
  const y = (lat2 - lat1) * rad;
  return Math.hypot(x, y) * 6371000;
};

// Distance to the nearest segment, flattened locally; fine at reach scale.
function toPath(point, path) {
  const rad = Math.PI / 180;
  const k = Math.cos(point[0] * rad);
  const flat = ([lat, lon]) => [lon * k, lat];
  const [px, py] = flat(point);
  let best = Infinity;
  for (let i = 1; i < path.length; i++) {
    const [ax, ay] = flat(path[i - 1]);
    const [bx, by] = flat(path[i]);
    const dx = bx - ax;
    const dy = by - ay;
    const t = dx || dy ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))) : 0;
    const nearest = [ay + t * dy, (ax + t * dx) / k];
    best = Math.min(best, metres(point, nearest));
  }
  return best;
}

const reaches = new Map(region2Spots.map((spot) => [spot.id, spot]));

test("every popular spot is unique, sourced twice and on a Region 2 reach", () => {
  const ids = new Set();
  for (const spot of popularSpots) {
    assert.ok(!ids.has(spot.id), `${spot.id} is listed once`);
    ids.add(spot.id);
    assert.ok(reaches.has(spot.reach), `${spot.id}: ${spot.reach} is a Region 2 reach`);
    assert.ok(spot.name.en && spot.name.zh && spot.access.en && spot.access.zh, `${spot.id} is bilingual`);
    for (const source of spot.sources) {
      assert.match(source.url, /^https:\/\//, `${spot.id}: ${source.url}`);
      assert.match(source.accessed, /^\d{4}-\d{2}-\d{2}$/);
    }
    const sites = new Set(spot.sources.map((source) => new URL(source.url).hostname.replace(/^www\./, "")));
    assert.ok(sites.size >= 2, `${spot.id} has two independent sources, got ${[...sites].join(", ")}`);
    for (const month of spot.months ?? []) assert.ok(month >= 1 && month <= 12);
  }
});

test("each spot sits on the reach it belongs to", () => {
  for (const spot of popularSpots) {
    const paths = waterwayPaths[spot.reach]?.paths;
    assert.ok(paths?.length, `${spot.id}: ${spot.reach} has drawn geometry`);
    const distance = Math.min(...paths.map((path) => toPath(spot.coordinates, path)));
    // A parking area or trailhead can sit back from the water.
    const limit = spot.kind === "access" ? 400 : 150;
    assert.ok(distance <= limit, `${spot.id} is ${Math.round(distance)} m from ${spot.reach} (limit ${limit} m)`);
  }
});

test("no spot is inside the 100 m no-fishing zone around a fish facility", () => {
  for (const spot of popularSpots) {
    for (const [name, lat, lon] of facilities) {
      const distance = metres(spot.coordinates, [lat, lon]);
      assert.ok(distance > 150, `${spot.id} is ${Math.round(distance)} m from ${name}`);
    }
  }
});

test("no spot sits on a reach closed all year", () => {
  for (const spot of popularSpots) {
    const reach = reaches.get(spot.reach);
    const closedAllYear = reach.rules.every((rule) => rule.kind === "closed" && rule.always);
    assert.ok(!closedAllYear, `${spot.id} is on ${spot.reach}, which is closed all year`);
  }
});
