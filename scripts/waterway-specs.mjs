// One spec per DFO table row that describes a mappable water.
//
// `channel` selects the OpenStreetMap ways that form the water. Rows that name
// a specific area get `from`/`to` anchors so the drawn reach stops exactly where
// the table says it stops. Rows with no specific area are marked `entire` and
// draw the whole mapped channel, with `pin` giving the marker a locatable spot.
// Anything the table leaves unlocatable is deliberately absent from this file.
//
// `id` is the spot id the reach belongs to: the hand-written ids in
// app/fishing-data.ts for Region 2, and the DRAWN_IDS entries in
// scripts/build-region-data.mjs for the generated regions.
//
// A row whose range carries its own year-round closure is still drawn end to
// end; the closure is quoted on the card instead, because carving it out would
// mean choosing between DFO's wording and DFO's own coordinates where the two
// disagree.

const bilingual = (en, zh) => ({ en, zh });

const label = {
  fraser: bilingual("Confluence with the Fraser River", "与 Fraser River 的汇流处"),
  pitt: bilingual("Confluence with the Pitt River", "与 Pitt River 的汇流处"),
  squamish: bilingual("Confluence with the Squamish River", "与 Squamish River 的汇流处"),
  street216: bilingual("216th Street bridge", "216th Street 大桥"),
  highway7: bilingual("Highway 7 bridge", "Highway 7 大桥"),
};

const crossing216 = {
  kind: "crossing",
  selector: 'way["highway"]["name"~"^216 Street$"]',
  bbox: [49.22, -122.64, 49.26, -122.6],
  label: label.street216,
};

const crossingHighway7 = {
  kind: "crossing",
  selector: 'way["highway"]["name"~"Lougheed Highway|Highway 7"]',
  bbox: [49.23, -121.98, 49.28, -121.9],
  label: label.highway7,
};

// Two Region 3 rows meet at this park, which OSM spells as one word. The park
// straddles the river bank, so the downstream-most crossing is its lower edge.
const goldpanBoundary = {
  kind: "crossing",
  pick: "downstream",
  selector: 'nwr["name"="Goldpan Provincial Park"]',
  bbox: [50.31, -121.44, 50.39, -121.33],
  approximate: true,
  label: bilingual(
    "Fishing boundary signs just downstream of Goldpan Provincial Park",
    "Goldpan 省立公园下游的钓鱼边界标志",
  ),
};

const shuswapChannel = { names: ["Shuswap River"], bbox: [50.2, -119.25, 50.9, -118.3] };
const thompsonChannel = { names: ["Thompson River"], bbox: [50.15, -121.7, 50.8, -120.35] };
const mabelLake = {
  selector: 'nwr["natural"="water"]["name"="Mabel Lake"]',
  bbox: [50.3, -119.0, 50.7, -118.5],
  label: bilingual("Mabel Lake", "Mabel Lake"),
};

export const waterwaySpecs = [
  {
    id: "alouette-upper",
    channel: { names: ["Alouette River", "South Alouette River"], bbox: [49.19, -122.68, 49.29, -122.47] },
    from: crossing216,
    to: {
      kind: "coord",
      coord: [49.24388, -122.53368],
      approximate: true,
      label: bilingual("Fishing boundary signs at Allco Park", "Allco Park 的钓鱼边界标志"),
    },
  },
  {
    id: "alouette-lower",
    channel: { names: ["Alouette River", "South Alouette River"], bbox: [49.19, -122.75, 49.29, -122.47] },
    from: crossing216,
    to: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Pitt River"]',
      bbox: [49.2, -122.79, 49.35, -122.66],
      label: label.pitt,
    },
  },
  {
    id: "north-alouette",
    entire: true,
    channel: { names: ["North Alouette River"], bbox: [49.2, -122.75, 49.34, -122.5] },
    pin: {
      kind: "mouth",
      label: bilingual("Confluence with the Alouette River", "与 Alouette River 的汇流处"),
    },
  },
  {
    id: "ashlu-creek",
    entire: true,
    channel: { names: ["Ashlu Creek"], bbox: [49.88, -123.66, 50.11, -123.28] },
    pin: { kind: "mouth", label: label.squamish },
  },
  {
    id: "capilano",
    entire: true,
    channel: { names: ["Capilano River"], bbox: [49.29, -123.2, 49.56, -123.04] },
    pin: {
      kind: "coord",
      coord: [49.36016, -123.11052],
      approximate: true,
      label: bilingual("Cleveland Dam", "Cleveland 大坝"),
    },
  },
  {
    id: "chapman",
    channel: { names: ["Chapman Creek"], bbox: [49.43, -123.82, 49.56, -123.6] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"~"Sunshine Coast Highway|Highway 101"]',
      bbox: [49.43, -123.75, 49.46, -123.69],
      approximate: true,
      label: bilingual(
        "Tidal-water boundary signs below the Highway 101 bridge",
        "Highway 101 大桥下方的潮水边界标志",
      ),
    },
    to: {
      kind: "offset",
      from: { kind: "crossing", selector: 'way["power"="line"]', bbox: [49.43, -123.82, 49.55, -123.6] },
      upstreamKm: 0.45,
      approximate: true,
      label: bilingual(
        "100 m below the falls, about 550 m above the powerline crossing",
        "电力线横跨处上游约 550 米的瀑布下方 100 米",
      ),
    },
  },
  {
    id: "cheakamus",
    entire: true,
    channel: { names: ["Cheakamus River"], bbox: [49.72, -123.35, 50.15, -122.6] },
    pin: { kind: "mouth", label: label.squamish },
  },
  {
    id: "chehalis",
    channel: { names: ["Chehalis River"], bbox: [49.2, -122.12, 49.55, -121.85] },
    from: {
      kind: "offset",
      from: {
        kind: "shoreline",
        selector: 'nwr["natural"="water"]["name"="Chehalis Lake"]',
        bbox: [49.38, -122.06, 49.49, -121.98],
      },
      downstreamKm: 2.4,
      approximate: true,
      label: bilingual(
        "Logging bridge 2.4 km downstream of Chehalis Lake",
        "Chehalis Lake 下游约 2.4 公里的伐木桥",
      ),
    },
    to: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Harrison River"]',
      bbox: [49.2, -122.05, 49.32, -121.85],
      label: bilingual("Confluence with the Harrison River", "与 Harrison River 的汇流处"),
    },
  },
  {
    id: "chilliwack-vedder",
    // OSM keeps this water as Chilliwack River, then Vedder River, then Vedder
    // Canal; the canal ends where the Sumas River channel carries on to the Fraser.
    channel: { names: ["Chilliwack River", "Vedder River", "Vedder Canal"], bbox: [49.0, -122.16, 49.2, -121.44] },
    from: {
      kind: "offset",
      from: {
        kind: "confluence",
        selector: 'way["waterway"~"^(river|stream)$"]["name"="Slesse Creek"]',
        bbox: [49.03, -121.75, 49.12, -121.65],
      },
      downstreamKm: 0.1,
      approximate: true,
      label: bilingual(
        "Boundary signs 100 m downstream of the Slesse Creek confluence",
        "Slesse Creek 汇流处下游 100 米的边界标志",
      ),
    },
    to: {
      kind: "mouth",
      label: bilingual(
        "Vedder Canal at the Sumas River channel",
        "Vedder Canal 与 Sumas River 河道的交汇处",
      ),
    },
    extra: [
      {
        channel: { names: ["Sumas River"], bbox: [49.05, -122.2, 49.17, -122.04] },
        from: {
          kind: "coord",
          coord: [49.11378, -122.11133],
          approximate: true,
          label: bilingual("Barrow Town Pump Station", "Barrow Town 抽水站"),
        },
        to: {
          kind: "mouth",
          approximate: true,
          label: bilingual(
            "Boundary signs near the Fraser River confluence",
            "接近 Fraser River 汇流处的边界标志",
          ),
        },
      },
    ],
  },
  {
    id: "coquitlam",
    entire: true,
    channel: { names: ["Coquitlam River"], bbox: [49.2, -122.85, 49.42, -122.7] },
    pin: { kind: "mouth", label: label.fraser },
  },
  {
    id: "de-boville",
    channel: { names: ["De Boville Slough", "DeBoville Slough"], bbox: [49.24, -122.78, 49.31, -122.68] },
    from: {
      kind: "confluence",
      selector: 'way["waterway"~"^(stream|river|ditch)$"]["name"~"^(Hyde Creek|Cedar Creek)$"]',
      bbox: [49.24, -122.78, 49.31, -122.68],
      approximate: true,
      label: bilingual("Confluence of Cedar Creek and Hyde Creek", "Cedar Creek 与 Hyde Creek 汇流处"),
    },
    to: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Pitt River"]',
      bbox: [49.24, -122.78, 49.32, -122.66],
      label: label.pitt,
    },
  },
  {
    id: "harrison-upper",
    channel: { names: ["Harrison River"], bbox: [49.2, -122.0, 49.33, -121.75] },
    from: {
      kind: "shoreline",
      selector: 'nwr["natural"="water"]["name"="Harrison Lake"]',
      bbox: [49.29, -121.9, 49.36, -121.75],
      approximate: true,
      label: bilingual("Outlet of Harrison Lake", "Harrison Lake 出水口"),
    },
    to: crossingHighway7,
  },
  {
    id: "harrison-lower",
    channel: { names: ["Harrison River"], bbox: [49.2, -122.0, 49.33, -121.75] },
    from: crossingHighway7,
    to: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Fraser River"]',
      bbox: [49.18, -122.0, 49.3, -121.85],
      label: label.fraser,
    },
  },
  {
    id: "kanaka",
    channel: { names: ["Kanaka Creek"], bbox: [49.15, -122.6, 49.25, -122.4] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"~"^112 Avenue$"]',
      bbox: [49.18, -122.53, 49.23, -122.46],
      approximate: true,
      label: bilingual("112th Street bridge (112 Avenue crossing)", "112th Street 大桥（112 Avenue 跨河处）"),
    },
    to: { kind: "mouth", label: label.fraser },
  },
  {
    id: "little-campbell",
    // OSM names the Little Campbell River simply "Campbell River".
    channel: { names: ["Campbell River"], bbox: [48.98, -122.85, 49.07, -122.5] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"~"^12 Avenue$"]',
      bbox: [49.0, -122.78, 49.05, -122.66],
      label: bilingual("12th Avenue crossing", "12th Avenue 跨河处"),
    },
    to: {
      kind: "mouth",
      approximate: true,
      label: bilingual(
        "Downstream end of the mapped channel at Semiahmoo Bay",
        "已绘制河道的下游端（Semiahmoo Bay）",
      ),
    },
  },
  {
    id: "mamquam",
    entire: true,
    channel: { names: ["Mamquam River"], bbox: [49.6, -123.2, 49.82, -122.78] },
    pin: { kind: "mouth", label: label.squamish },
  },
  {
    id: "nicomekl",
    channel: { names: ["Nicomekl River"], bbox: [49.02, -122.92, 49.15, -122.5] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"~"^208 Street$"]',
      bbox: [49.08, -122.66, 49.13, -122.62],
      label: bilingual("208th Street crossing", "208th Street 跨河处"),
    },
    to: { kind: "mouth", label: bilingual("Mouth at Mud Bay", "汇入 Mud Bay 的河口") },
  },
  {
    id: "nicomen",
    channel: { names: ["Nicomen Slough", "Dewdney Slough"], bbox: [49.13, -122.25, 49.23, -121.95] },
    from: {
      kind: "confluence",
      // OSM spells the creek "Siddall"; only its upper part is mapped.
      selector: 'way["waterway"~"^(stream|river|ditch)$"]["name"~"Siddall|Siddle"]',
      bbox: [49.13, -122.1, 49.25, -121.95],
      toleranceKm: 2.5,
      approximate: true,
      label: bilingual("Confluence of Siddle (Bell's) Creek", "Siddle（Bell's）Creek 汇流处"),
    },
    to: { kind: "mouth", label: label.fraser },
  },
  {
    id: "norrish",
    entire: true,
    channel: { names: ["Norrish Creek", "Suicide Creek"], bbox: [49.14, -122.25, 49.35, -122.03] },
    pin: { kind: "mouth", label: label.fraser },
  },
  {
    id: "serpentine",
    channel: { names: ["Serpentine River"], bbox: [49.05, -122.9, 49.2, -122.7] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"~"^168 Street$"]',
      bbox: [49.15, -122.78, 49.2, -122.74],
      label: bilingual("168th Street at Bothwell Park", "Bothwell Park 的 168th Street"),
    },
    to: { kind: "mouth", label: bilingual("Mouth at Mud Bay", "汇入 Mud Bay 的河口") },
  },
  {
    id: "squamish",
    entire: true,
    channel: { names: ["Squamish River", "Powerhouse Channel"], bbox: [49.68, -123.5, 50.4, -123.0] },
    pin: { kind: "mouth", label: bilingual("Mouth at Howe Sound", "汇入 Howe Sound 的河口") },
  },
  {
    id: "stave",
    channel: { names: ["Stave River"], bbox: [49.14, -122.48, 49.25, -122.34] },
    from: {
      kind: "coord",
      coord: [49.1961, -122.40788],
      approximate: true,
      label: bilingual("B.C. Hydro Ruskin Dam", "B.C. Hydro Ruskin 大坝"),
    },
    to: {
      kind: "crossing",
      selector: 'way["railway"]',
      bbox: [49.16, -122.44, 49.18, -122.41],
      label: bilingual("CPR Railway Bridge", "CPR 铁路桥"),
    },
  },

  // Region 3 · Thompson-Nicola. The lakes this region lists stay text-only:
  // a lake is an area, not a reach, so drawing its shoreline would read as a
  // river running in a circle.
  {
    id: "r3-bridge-river",
    entire: true,
    channel: { names: ["Bridge River"], bbox: [50.55, -123.4, 51.05, -121.85] },
    pin: { kind: "mouth", label: label.fraser },
  },
  {
    id: "r3-clearwater-river",
    entire: true,
    channel: { names: ["Clearwater River"], bbox: [51.5, -120.5, 52.3, -119.7] },
    pin: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="North Thompson River"]',
      bbox: [51.55, -120.25, 51.75, -119.9],
      label: bilingual(
        "Confluence with the North Thompson River",
        "与 North Thompson River 的汇流处",
      ),
    },
  },
  {
    id: "r3-fraser-lillooet",
    channel: { names: ["Fraser River"], bbox: [50.5, -122.1, 50.9, -121.7] },
    from: {
      // OSM stops the Seton short of the Fraser's centre line, so this lands
      // about 200 m from the confluence itself.
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Seton River"]',
      bbox: [50.6, -122.05, 50.75, -121.88],
      approximate: true,
      label: bilingual("Confluence with the Seton River", "与 Seton River 的汇流处"),
    },
    to: {
      kind: "offset",
      // The table measures from the town, whose river frontage is this bridge.
      from: {
        kind: "crossing",
        selector: 'way["highway"]["name"~"Twenty-Three Camels"]',
        bbox: [50.66, -121.96, 50.71, -121.9],
      },
      downstreamKm: 4,
      approximate: true,
      label: bilingual(
        "Fishing boundary signs about 4 km downstream of Lillooet",
        "Lillooet 镇下游约 4 公里的钓鱼边界标志",
      ),
    },
  },
  {
    id: "r3-thompson-upper",
    channel: thompsonChannel,
    from: {
      kind: "shoreline",
      selector: 'nwr["natural"="water"]["name"="Kamloops Lake"]',
      bbox: [50.55, -120.95, 50.85, -120.3],
      label: bilingual("Outlet of Kamloops Lake", "Kamloops Lake 出水口"),
    },
    to: goldpanBoundary,
  },
  {
    id: "r3-thompson-lower",
    channel: thompsonChannel,
    from: goldpanBoundary,
    to: {
      // The table gives this boundary as coordinates, so use them verbatim.
      kind: "coord",
      coord: [50.256389, -121.515278],
      label: bilingual(
        "Easterly border of the Skihist Ecological Reserve",
        "Skihist 生态保护区东界",
      ),
    },
  },

  // Region 7 · Omineca-Peace.
  {
    id: "r7-nechako",
    channel: { names: ["Nechako River"], bbox: [53.8, -123.6, 54.05, -122.6] },
    from: {
      kind: "crossing",
      selector: 'way["highway"]["name"="Foothills Boulevard"]["bridge"="yes"]',
      bbox: [53.93, -122.85, 53.96, -122.78],
      approximate: true,
      label: bilingual(
        "Downstream edge of the Foothills Boulevard bridge",
        "Foothills Boulevard 大桥下游侧",
      ),
    },
    to: {
      kind: "confluence",
      selector: 'way["waterway"="river"]["name"="Fraser River"]',
      bbox: [53.85, -122.85, 53.98, -122.65],
      label: bilingual(
        "Boundary signs at the Fraser River confluence",
        "与 Fraser River 汇流处的边界标志",
      ),
    },
  },

  // Region 8 · Okanagan. OSM draws the Shuswap River through Mabel Lake, so the
  // lake is reached as a crossing: the first one going downstream is the inlet
  // the middle reach ends at, the last one is the outlet the lower reach starts
  // from.
  {
    id: "r8-shuswap-middle",
    channel: shuswapChannel,
    from: {
      kind: "coord",
      coord: [50.29579, -118.8116],
      approximate: true,
      label: bilingual("Shuswap Falls", "Shuswap Falls 瀑布"),
    },
    to: { kind: "crossing", ...mabelLake },
  },
  {
    id: "r8-shuswap-lower",
    channel: shuswapChannel,
    from: {
      // OSM names the road over the Shuswap at Mara "Rosemond Lake Road".
      kind: "crossing",
      selector: 'way["highway"]["name"="Rosemond Lake Road"]',
      bbox: [50.67, -119.09, 50.7, -119.05],
      approximate: true,
      label: bilingual(
        "White triangular boundary signs above the Mara bridge",
        "Mara 桥上游的白色三角钓鱼边界标志",
      ),
    },
    to: { kind: "shoreline", ...mabelLake, label: bilingual("Outlet of Mabel Lake", "Mabel Lake 出水口") },
  },
  {
    id: "r8-shuswap-trinity",
    channel: shuswapChannel,
    from: {
      kind: "offset",
      from: {
        kind: "crossing",
        selector: 'way["highway"]["name"="Trinity Valley Road"]',
        bbox: [50.53, -119.03, 50.56, -118.99],
      },
      upstreamKm: 0.05,
      label: bilingual(
        "50 m above the Trinity Valley Road bridge",
        "Trinity Valley Road 大桥上游 50 米",
      ),
    },
    to: {
      kind: "offset",
      from: {
        kind: "crossing",
        selector: 'way["highway"]["name"="Trinity Valley Road"]',
        bbox: [50.53, -119.03, 50.56, -118.99],
      },
      downstreamKm: 0.05,
      label: bilingual(
        "50 m below the Trinity Valley Road bridge",
        "Trinity Valley Road 大桥下游 50 米",
      ),
    },
  },
];
