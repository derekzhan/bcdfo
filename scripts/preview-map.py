"""Scratch helper: draw the generated reaches over map tiles for eyeball review.

Usage: python3 scripts/preview-map.py [zoom] [out.png] [spot-id ...] [--satellite]

--satellite renders the same Esri World Imagery basemap the app offers, which is
how to check that a reach follows the real channel rather than the OSM drawing.
"""

import io
import json
import math
import os
import re
import sys
import urllib.request

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "scripts", ".cache", "tiles")
TILE = 256


def load_waterways():
    source = open(os.path.join(ROOT, "app", "waterway-paths.ts"), encoding="utf-8").read()
    start = source.index("= ", source.index("export const waterwayPaths")) + 2
    return json.loads(source[start:].rstrip().rstrip(";"))


def project(lat, lon, zoom):
    scale = TILE * 2**zoom
    x = (lon + 180.0) / 360.0 * scale
    sin = math.sin(math.radians(lat))
    y = (0.5 - math.log((1 + sin) / (1 - sin)) / (4 * math.pi)) * scale
    return x, y


ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile"


def tile(zoom, x, y, satellite=False):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, f"{'esri' if satellite else 'osm'}-{zoom}-{x}-{y}.png")
    if not os.path.exists(path):
        url = f"{ESRI}/{zoom}/{y}/{x}" if satellite else f"https://tile.openstreetmap.org/{zoom}/{x}/{y}.png"
        request = urllib.request.Request(url, headers={"User-Agent": "bc-salmon-map-dev/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            open(path, "wb").write(response.read())
    return Image.open(path).convert("RGB")


def main():
    args = [arg for arg in sys.argv[1:] if arg != "--satellite"]
    satellite = "--satellite" in sys.argv
    zoom = int(args[0]) if args else 9
    out = args[1] if len(args) > 1 else os.path.join(ROOT, "scripts", "preview.png")
    wanted = args[2:]

    waterways = load_waterways()
    if wanted:
        waterways = {k: v for k, v in waterways.items() if k in wanted}

    points = [point for water in waterways.values() for path in water["paths"] for point in path]
    xs, ys = zip(*[project(lat, lon, zoom) for lat, lon in points])
    pad = TILE // 2
    left, right = min(xs) - pad, max(xs) + pad
    top, bottom = min(ys) - pad, max(ys) + pad

    tx0, tx1 = int(left // TILE), int(right // TILE)
    ty0, ty1 = int(top // TILE), int(bottom // TILE)
    canvas = Image.new("RGB", ((tx1 - tx0 + 1) * TILE, (ty1 - ty0 + 1) * TILE), "white")
    for tx in range(tx0, tx1 + 1):
        for ty in range(ty0, ty1 + 1):
            canvas.paste(tile(zoom, tx, ty, satellite), ((tx - tx0) * TILE, (ty - ty0) * TILE))

    origin_x, origin_y = tx0 * TILE, ty0 * TILE
    draw = ImageDraw.Draw(canvas)
    for water_id, water in sorted(waterways.items()):
        for path in water["paths"]:
            pixels = [
                (project(lat, lon, zoom)[0] - origin_x, project(lat, lon, zoom)[1] - origin_y)
                for lat, lon in path
            ]
            draw.line(pixels, fill=(255, 255, 255), width=5, joint="curve")
            draw.line(pixels, fill=(220, 38, 38), width=3, joint="curve")
        px, py = project(*water["pin"], zoom)
        px, py = px - origin_x, py - origin_y
        draw.ellipse([px - 4, py - 4, px + 4, py + 4], fill=(20, 108, 90), outline="white", width=2)
        draw.text((px + 7, py - 6), re.sub(r"-", " ", water_id), fill=(255, 255, 255) if satellite else (15, 40, 30))
        for endpoint in water["endpoints"]:
            ex, ey = project(*endpoint["coordinates"], zoom)
            ex, ey = ex - origin_x, ey - origin_y
            draw.ellipse([ex - 3, ey - 3, ex + 3, ey + 3], fill=(255, 255, 255), outline=(190, 20, 20), width=2)

    canvas.save(out)
    print(f"{out} {canvas.size[0]}x{canvas.size[1]} zoom {zoom} waters {len(waterways)}")


main()
