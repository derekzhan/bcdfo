// Scratch helper: geocode the named landmarks used as DFO boundaries.
const places = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      "Khartoum Lake, British Columbia",
      "Lois Lake, British Columbia",
      "Harrison Lake, British Columbia",
      "Barrowtown, Abbotsford, British Columbia",
      "Norrish Creek, British Columbia",
      "Ashlu Creek, British Columbia",
      "Allco Park, Maple Ridge, British Columbia",
      "Bothwell Park, Surrey, British Columbia",
      "Ruskin Dam, British Columbia",
      "Chehalis Lake, British Columbia",
    ];

for (const place of places) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", place);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "3");
  url.searchParams.set("polygon_geojson", "0");
  const response = await fetch(url, {
    headers: { "user-agent": "bc-salmon-map-dev/1.0 (dfo boundary verification)" },
  });
  const results = await response.json();
  console.log(`\n=== ${place} ===`);
  for (const result of results) {
    console.log(
      `${result.category}/${result.type} ${Number(result.lat).toFixed(5)},${Number(result.lon).toFixed(5)} bbox=${result.boundingbox?.join(",")} :: ${result.display_name}`,
    );
  }
  await new Promise((resolve) => setTimeout(resolve, 1200));
}
