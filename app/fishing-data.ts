import { generatedRegions, generatedSpots } from "./region-data.generated";
import { waterwayPaths } from "./waterway-paths";

export type Language = "en" | "zh";
export type LocalizedText = { en: string; zh: string };
export type RuleKind = "retain" | "release" | "gear" | "closed" | "pending";
export type Species =
  | "Chinook"
  | "Coho"
  | "Sockeye"
  | "Pink"
  | "Chum"
  | "Steelhead"
  | "Eulachon"
  | "All";

export type FishingRule = {
  species: Species[];
  season: LocalizedText;
  regulation: LocalizedText;
  kind: RuleKind;
  start?: [number, number];
  end?: [number, number];
  always?: boolean;
};

export type FishingSpot = {
  id: string;
  // Which DFO freshwater region publishes this row.
  region: string;
  water: LocalizedText;
  area: LocalizedText;
  // Absent until a water has been located; those rows stay text-only.
  coordinates?: [number, number];
  rules: FishingRule[];
  // Region 6 groups its table into lettered sections.
  section?: LocalizedText;
  notes?: LocalizedText[];
  sourceAnchor?: string;
};

export type RegionInfo = {
  id: string;
  name: LocalizedText;
  sourceUrl: string;
  waters: number;
  notes: LocalizedText[];
};

export type BoundaryPoint = {
  coordinates: [number, number];
  label: LocalizedText;
  kind: "start" | "reference";
  approximate?: boolean;
};

const t = (en: string, zh: string): LocalizedText => ({ en, zh });

const rule = (
  species: Species | Species[],
  seasonEn: string,
  seasonZh: string,
  regulationEn: string,
  regulationZh: string,
  kind: RuleKind,
  start?: [number, number],
  end?: [number, number],
  always?: boolean,
): FishingRule => ({
  species: Array.isArray(species) ? species : [species],
  season: t(seasonEn, seasonZh),
  regulation: t(regulationEn, regulationZh),
  kind,
  start,
  end,
  always,
});

// Region 2 stays hand written: its Chinese wording and its OSM boundary anchors
// were checked row by row against the published table, so it is not regenerated.
// scripts/build-region-data.mjs produces every other region, and a test asserts
// the DFO table behind this list has not changed underneath us.
export const region2Spots: FishingSpot[] = [
  {
    id: "alouette-upper",
    region: "2",
    water: t("Alouette River and tributaries", "Alouette 河及其支流"),
    area: t(
      "Upstream of the 216th Street bridge to a line between two fishing boundary signs at Allco Park",
      "从 216th Street 大桥向上游，至 Allco Park 两岸钓鱼边界标志之间的连线",
    ),
    coordinates: [49.2423, -122.578],
    rules: [
      rule("Chinook", "Sep 1–Nov 30", "9月1日–11月30日", "1 per day", "每日 1 条", "retain", [9, 1], [11, 30]),
      rule("Coho", "Sep 1–Sep 30", "9月1日–9月30日", "Non-retention", "不得保留，钓获即放", "release", [9, 1], [9, 30]),
      rule("Coho", "Oct 1–Dec 31", "10月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [10, 1], [12, 31]),
    ],
  },
  {
    id: "alouette-lower",
    region: "2",
    water: t("Alouette River and tributaries", "Alouette 河及其支流"),
    area: t(
      "Downstream of the 216th Street bridge to the confluence of the Pitt River",
      "从 216th Street 大桥向下游，至与 Pitt River 的汇流处",
    ),
    coordinates: [49.2305, -122.663],
    rules: [
      rule("Coho", "Oct 1–Dec 31", "10月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [10, 1], [12, 31]),
    ],
  },
  {
    id: "north-alouette",
    region: "2",
    water: t("Alouette River and tributaries", "Alouette 河及其支流"),
    area: t("North Alouette and tributaries", "North Alouette 河及其支流"),
    coordinates: [49.2588, -122.601],
    rules: [
      rule("Chinook", "Sep 1–Nov 30", "9月1日–11月30日", "1 per day", "每日 1 条", "retain", [9, 1], [11, 30]),
      rule("Coho", "Sep 1–Nov 30", "9月1日–11月30日", "Non-retention", "不得保留，钓获即放", "release", [9, 1], [11, 30]),
    ],
  },
  {
    id: "ashlu-creek",
    region: "2",
    water: t("Ashlu Creek", "Ashlu Creek"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.90061, -123.30329],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Bait ban", "禁止使用鱼饵", "gear", undefined, undefined, true),
      rule("Coho", "Sep 15–Jan 31", "9月15日–次年1月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 15], [1, 31]),
    ],
  },
  {
    id: "capilano",
    region: "2",
    water: t("Capilano River", "Capilano River"),
    area: t("Including tributaries", "包括支流"),
    coordinates: [49.331, -123.121],
    rules: [
      rule("Coho", "Apr 1–Jun 30", "4月1日–6月30日", "2 hatchery-marked per day", "每日 2 条有孵化场标记的鱼", "retain", [4, 1], [6, 30]),
      rule("Coho", "Jul 1–Mar 31", "7月1日–次年3月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [7, 1], [3, 31]),
      rule("Coho", "Aug 1–Oct 31", "8月1日–10月31日", "Bait ban", "禁止使用鱼饵", "gear", [8, 1], [10, 31]),
      rule("Chinook", "Aug 1–Nov 30", "8月1日–11月30日", "4 per day, only 2 over 62 cm", "每日 4 条，其中超过 62 厘米的最多 2 条", "retain", [8, 1], [11, 30]),
      rule("Chinook", "Aug 1–Oct 31", "8月1日–10月31日", "Bait ban", "禁止使用鱼饵", "gear", [8, 1], [10, 31]),
    ],
  },
  {
    id: "chapman",
    region: "2",
    water: t("Chapman Creek", "Chapman Creek"),
    area: t(
      "Upstream of tidal-water boundary signs below the Hwy 101 Bridge to 100 m below the falls; the falls are about 550 m upstream of the powerline crossing",
      "从 Hwy 101 大桥下方的潮水边界标志向上游，至瀑布下方 100 米；瀑布约在电力线横跨处上游 550 米",
    ),
    coordinates: [49.476, -123.752],
    rules: [
      rule("Coho", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", undefined, undefined, true),
      rule("Chinook", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day, only 1 over 50 cm", "每日 4 条，其中超过 50 厘米的最多 1 条", "retain", undefined, undefined, true),
    ],
  },
  {
    id: "cheakamus",
    region: "2",
    water: t("Cheakamus River", "Cheakamus River"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.846, -123.144],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Bait ban", "禁止使用鱼饵", "gear", undefined, undefined, true),
      rule("Coho", "Sep 15–Jan 31", "9月15日–次年1月31日", "1 per day, hatchery-marked only", "每日 1 条，仅限有孵化场标记的鱼", "retain", [9, 15], [1, 31]),
    ],
  },
  {
    id: "chehalis",
    region: "2",
    water: t("Chehalis River", "Chehalis River"),
    area: t(
      "Downstream of the logging bridge 2.4 km downstream of Chehalis Lake, including tributaries to that part",
      "从 Chehalis Lake 下游 2.4 公里的伐木桥向下游，包括汇入该河段的支流",
    ),
    coordinates: [49.28, -121.955],
    rules: [
      rule("Chinook", "Jun 1–Aug 31", "6月1日–8月31日", "1 per day", "每日 1 条", "retain", [6, 1], [8, 31]),
      rule("Chinook", "Sep 1–Dec 31", "9月1日–12月31日", "4 per day, only 1 over 62 cm", "每日 4 条，其中超过 62 厘米的最多 1 条", "retain", [9, 1], [12, 31]),
      rule("Coho", "Jun 1–Aug 31", "6月1日–8月31日", "Non-retention", "不得保留，钓获即放", "release", [6, 1], [8, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "chilliwack-vedder",
    region: "2",
    water: t("Chilliwack/Vedder River (including Sumas River)", "Chilliwack／Vedder River（包括 Sumas River）"),
    area: t(
      "From boundary signs 100 m downstream of the Chilliwack–Slesse confluence, downstream; includes Sumas River from Barrow Town Pump Station to boundary signs near the Fraser confluence",
      "从 Chilliwack River 与 Slesse Creek 汇流处下游 100 米的两岸边界标志开始向下游；并包括 Sumas River 从 Barrow Town Pump Station 至接近 Fraser River 汇流处边界标志的河段",
    ),
    coordinates: [49.11, -121.966],
    sourceAnchor: "chilliwack",
    rules: [
      rule("Chinook", "Jul 1–Aug 31", "7月1日–8月31日", "1 per day", "每日 1 条", "retain", [7, 1], [8, 31]),
      rule("Chinook", "Sep 1–Dec 31", "9月1日–12月31日", "4 per day, only 2 over 62 cm", "每日 4 条，其中超过 62 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
      rule("Coho", "Jul 1–Aug 31", "7月1日–8月31日", "Non-retention", "不得保留，钓获即放", "release", [7, 1], [8, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "coquitlam",
    region: "2",
    water: t("Coquitlam River", "Coquitlam River"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.284, -122.789],
    rules: [
      rule("Chinook", "Sep 1–Dec 31", "9月1日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [9, 1], [12, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "de-boville",
    region: "2",
    water: t("De Boville Slough", "De Boville Slough"),
    area: t("Downstream of the confluence of Cedar Creek and Hyde Creek", "从 Cedar Creek 与 Hyde Creek 汇流处向下游"),
    coordinates: [49.272, -122.731],
    rules: [
      rule("Coho", "Oct 1–Dec 31", "10月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [10, 1], [12, 31]),
    ],
  },
  {
    id: "fraser-mission",
    region: "2",
    water: t("Fraser River", "Fraser River"),
    area: t("Mainstem waters upstream of the CPR Bridge at Mission, BC", "Mission 的 CPR 铁路桥以上 Fraser River 主河道"),
    coordinates: [49.164, -122.19],
    rules: [
      rule("All", "Apr 1 until further notice", "4月1日起，直至另行通知", "No fishing for salmon", "禁止垂钓三文鱼", "closed", undefined, undefined, true),
    ],
  },
  {
    id: "harrison-upper",
    region: "2",
    water: t("Harrison River", "Harrison River"),
    area: t("From the outlet of Harrison Lake downstream to the Highway 7 Bridge", "从 Harrison Lake 出口向下游至 Highway 7 大桥"),
    coordinates: [49.295, -121.938],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "harrison-lower",
    region: "2",
    water: t("Harrison River", "Harrison River"),
    area: t("From the Highway 7 Bridge downstream to the Fraser River confluence", "从 Highway 7 大桥向下游至 Fraser River 汇流处"),
    coordinates: [49.252, -121.95],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "kanaka",
    region: "2",
    water: t("Kanaka Creek", "Kanaka Creek"),
    area: t("Downstream of the 112th Street bridge", "112th Street 大桥以下河段"),
    coordinates: [49.205, -122.498],
    rules: [
      rule("Coho", "Nov 1–Nov 30", "11月1日–11月30日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [11, 1], [11, 30]),
    ],
  },
  {
    id: "khartoum",
    region: "2",
    water: t("Khartoum Lake", "Khartoum Lake"),
    area: t("Entire lake", "全湖"),
    coordinates: [49.88536, -124.09835],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Single barbless hook", "仅可使用单枚无倒刺鱼钩", "gear", undefined, undefined, true),
      rule("Chinook", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
      rule("Coho", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
    ],
  },
  {
    id: "little-campbell",
    region: "2",
    water: t("Little Campbell River", "Little Campbell River"),
    area: t("Downstream of 12th Avenue, including tributaries to that part", "12th Avenue 以下河段，包括汇入该河段的支流"),
    coordinates: [49.02392, -122.71943],
    rules: [
      rule("Chinook", "Aug 15–Sep 15", "8月15日–9月15日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [8, 15], [9, 15]),
      rule("Chinook", "Sep 16–Dec 31", "9月16日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [9, 16], [12, 31]),
      rule("Coho", "Aug 15–Sep 15", "8月15日–9月15日", "Non-retention", "不得保留，钓获即放", "release", [8, 15], [9, 15]),
      rule("Coho", "Sep 16–Dec 31", "9月16日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 16], [12, 31]),
    ],
  },
  {
    id: "little-campbell-closure",
    region: "2",
    water: t("Little Campbell River", "Little Campbell River"),
    area: t(
      "From a line between two fishing boundary signs downstream to the pedestrian bridge at the foot of Stayte Road",
      "从河流两岸两个钓鱼边界标志之间的连线向下游，至 Stayte Road 尽头的人行桥",
    ),
    coordinates: [49.015, -122.853],
    rules: [
      rule("All", "Aug 15–Sep 30", "8月15日–9月30日", "No fishing for salmon", "禁止垂钓三文鱼", "closed", [8, 15], [9, 30]),
    ],
  },
  {
    id: "lois",
    region: "2",
    water: t("Lois Lake", "Lois Lake"),
    area: t("Entire lake", "全湖"),
    coordinates: [49.83389, -124.25835],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Single barbless hook", "仅可使用单枚无倒刺鱼钩", "gear", undefined, undefined, true),
      rule("Chinook", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
      rule("Coho", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
    ],
  },
  {
    id: "mamquam",
    region: "2",
    water: t("Mamquam River", "Mamquam River"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.721, -123.13],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Bait ban", "禁止使用鱼饵", "gear", undefined, undefined, true),
      rule("Coho", "Sep 15–Jan 31", "9月15日–次年1月31日", "1 per day, hatchery-marked only", "每日 1 条，仅限有孵化场标记的鱼", "retain", [9, 15], [1, 31]),
    ],
  },
  {
    id: "nicomekl",
    region: "2",
    water: t("Nicomekl River", "Nicomekl River"),
    area: t("Downstream of 208th Street", "208th Street 以下河段"),
    coordinates: [49.10053, -122.64402],
    rules: [
      rule("Chinook", "Sep 1–Nov 30", "9月1日–11月30日", "1 per day", "每日 1 条", "retain", [9, 1], [11, 30]),
      rule("Chinook", "Dec 1–Dec 31", "12月1日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [12, 1], [12, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "nicomen",
    region: "2",
    water: t("Nicomen (including Dewdney) Slough", "Nicomen Slough（包括 Dewdney Slough）"),
    area: t("From the confluence of Siddle (Bell's) Creek downstream to the Fraser River", "从 Siddle（Bell's）Creek 汇流处向下游至 Fraser River"),
    coordinates: [49.169, -122.075],
    sourceAnchor: "nicomen",
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "norrish",
    region: "2",
    water: t("Norrish (Suicide) Creek", "Norrish（Suicide）Creek"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.172778, -122.135278],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "serpentine",
    region: "2",
    water: t("Serpentine River", "Serpentine River"),
    area: t("Downstream of 168th Street at Bothwell Park", "Bothwell Park 的 168th Street 以下河段"),
    coordinates: [49.115, -122.759],
    rules: [
      rule("Chinook", "Sep 1–Nov 30", "9月1日–11月30日", "1 per day", "每日 1 条", "retain", [9, 1], [11, 30]),
      rule("Chinook", "Dec 1–Dec 31", "12月1日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [12, 1], [12, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "squamish",
    region: "2",
    water: t("Squamish River (including Powerhouse Channel)", "Squamish River（包括 Powerhouse Channel）"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.758, -123.141],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Bait ban", "禁止使用鱼饵", "gear", undefined, undefined, true),
      rule("Coho", "Sep 15–Jan 31", "9月15日–次年1月31日", "1 per day, hatchery-marked only", "每日 1 条，仅限有孵化场标记的鱼", "retain", [9, 15], [1, 31]),
    ],
  },
  {
    id: "stave",
    region: "2",
    water: t("Stave River", "Stave River"),
    area: t(
      "Downstream of the B.C. Hydro Dam to the CPR Railway Bridge, excluding the Ruskin and Northrop spawning channels described by DFO",
      "从 B.C. Hydro 大坝向下游至 CPR 铁路桥；不包括 DFO 所述的 Ruskin 与 Northrop 产卵水道",
    ),
    coordinates: [49.19605, -122.40781],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
    ],
  },
];

export const sourceUrl =
  "https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region2-eng.html";

export const defaultRegionId = "2";

// The notes DFO prints above the Region 2 table; they apply to every row below.
export const regionRules: LocalizedText[] = [
  t(
    "You can only fish for salmon in Region 2 during daylight hours.",
    "第 2 区仅可在白天垂钓三文鱼。",
  ),
  t(
    "No fishing within 100 m of any government facility operated for counting, passing or rearing fish.",
    "政府运营的鱼类计数、通行或养殖设施周围 100 米内禁止钓鱼。",
  ),
  t(
    "The daily limit for all species of Pacific salmon from tidal and fresh waters combined is 4; individual species limits also apply.",
    "潮水与淡水合计，所有太平洋三文鱼每日上限为 4 条；同时仍须遵守各鱼种的单独限额。",
  ),
  t(
    "The possession limit is twice the daily limit: you cannot possess more than 8 salmon in total, except salmon kept at your ordinary residence.",
    "持有上限为每日限额的两倍：合计不得持有超过 8 条三文鱼，存放在常住居所的三文鱼除外。",
  ),
  t(
    "The annual limit is 10 chinook over 50 cm from all fresh waters combined.",
    "所有淡水合计，每年最多可保留 10 条超过 50 厘米的帝王鲑。",
  ),
  t(
    "Squamish watershed: the aggregate daily limit of hatchery-marked coho across the entire Squamish non-tidal systems combined is 1.",
    "Squamish 流域：整个 Squamish 非潮水水系合计，每日最多保留 1 条有孵化场标记的银鲑。",
  ),
  t(
    "Retained coho must measure 25 cm or more; retained chinook, chum, pink and sockeye must measure 30 cm or more, measured from nose tip to tail fork.",
    "保留的银鲑须达 25 厘米以上；保留的帝王鲑、粉鲑、红鲑及狗鲑须达 30 厘米以上，由吻端量至尾叉。",
  ),
  t(
    "An adult chinook is over 50 cm, except over 62 cm on the Fraser River (Sep 1–Dec 31), the Chehalis River (Sep 1–Dec 31), the Chilliwack/Vedder River (including Sumas River) and the Capilano River.",
    "成年帝王鲑指超过 50 厘米，但在 Fraser River（9月1日–12月31日）、Chehalis River（9月1日–12月31日）、Chilliwack／Vedder River（含 Sumas River）及 Capilano River 为超过 62 厘米。",
  ),
  t(
    "There is no fishing for salmon in Region 2 waters flowing into Areas 28 and 29 except the opportunities listed here, and unless stated otherwise the daily limit for waters flowing into Areas 13, 15 and 16 is zero.",
    "除本表列出的机会外，流入 28 区和 29 区的第 2 区水域禁止垂钓三文鱼；除另有说明外，流入 13、15、16 区的水域每日限额为 0。",
  ),
];

const region2: RegionInfo = {
  id: "2",
  name: t("Lower Mainland", "低陆平原"),
  sourceUrl,
  waters: region2Spots.length,
  notes: regionRules,
};

// Camera framing only, so the map opens over the right part of BC when a region
// has no mapped waters yet. These are deliberately generous and carry no
// regulatory meaning—DFO's own wording is the boundary.
export const regionExtents: Record<string, [[number, number], [number, number]]> = {
  "1": [[48.3, -128.6], [51.0, -123.0]],
  "2": [[48.9, -124.6], [50.4, -121.0]],
  "3": [[49.2, -122.2], [52.4, -118.8]],
  "4": [[48.9, -118.6], [51.7, -113.9]],
  "5": [[51.2, -126.2], [54.1, -119.8]],
  "6": [[52.0, -134.6], [57.6, -124.8]],
  "7": [[53.0, -127.2], [58.6, -118.8]],
  "8": [[48.9, -120.6], [50.9, -117.9]],
};

// Region 2 first because it is the only one with hand-verified reaches; the rest
// follow DFO's own numbering.
export const regions: RegionInfo[] = [region2, ...generatedRegions].sort(
  (a, b) => Number(a.id) - Number(b.id),
);

export const fishingSpots: FishingSpot[] = [...region2Spots, ...generatedSpots];

export const spotsForRegion = (regionId: string) =>
  fishingSpots.filter((spot) => spot.region === regionId);

export const regionById = (regionId: string) =>
  regions.find((region) => region.id === regionId) ?? region2;

// Only the rows whose DFO boundary cannot be placed on a map line need a
// hand-written point; everything else is derived from the generated geometry so
// the marker can never drift away from the drawn reach.
const referencePoints: Record<string, BoundaryPoint> = {
  "fraser-mission": {
    coordinates: [49.12505, -122.29903],
    label: t("CPR Railway Bridge at Mission", "Mission CPR 铁路桥"),
    kind: "start",
  },
  "little-campbell-closure": {
    coordinates: [49.01615, -122.7795],
    label: t(
      "Pedestrian bridge at the foot of Stayte Road (downstream end)",
      "Stayte Road 尽头的人行桥（下游端）",
    ),
    kind: "reference",
    approximate: true,
  },
  khartoum: {
    coordinates: [49.88536, -124.09835],
    label: t("Khartoum Lake", "Khartoum Lake"),
    kind: "reference",
  },
  lois: {
    coordinates: [49.83389, -124.25835],
    label: t("Lois Lake", "Lois Lake"),
    kind: "reference",
  },
};

// Null when DFO's wording has not been tied to a location yet: those rows are
// listed with their regulations but cannot be drawn.
export function getBoundaryStart(spot: FishingSpot): BoundaryPoint | null {
  const waterway = waterwayPaths[spot.id];
  if (waterway) {
    return {
      coordinates: waterway.pin,
      label: waterway.pinLabel,
      kind: waterway.pinKind,
      approximate: waterway.pinApproximate,
    };
  }
  const reference = referencePoints[spot.id];
  if (reference) return reference;
  if (!spot.coordinates) return null;
  return {
    coordinates: spot.coordinates,
    label: spot.area,
    kind: "reference",
    approximate: true,
  };
}

// DFO writes its openings as BC local dates, and the server renders in UTC, so
// both have to resolve "today" in Pacific time or the two disagree all evening.
const pacificDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Vancouver",
  month: "2-digit",
  day: "2-digit",
});

export function monthDay(date: Date) {
  const parts = pacificDate.formatToParts(date);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return month * 100 + day;
}

export function isRuleActive(rule: FishingRule, date = new Date()) {
  if (rule.always) return true;
  if (!rule.start || !rule.end) return false;
  const value = monthDay(date);
  const start = rule.start[0] * 100 + rule.start[1];
  const end = rule.end[0] * 100 + rule.end[1];
  return start <= end ? value >= start && value <= end : value >= start || value <= end;
}

export function currentKind(spot: FishingSpot, date = new Date()): RuleKind | "inactive" {
  const active = spot.rules.filter((item) => isRuleActive(item, date));
  if (!active.length) return "inactive";
  if (active.some((item) => item.kind === "closed")) return "closed";
  if (active.some((item) => item.kind === "retain")) return "retain";
  if (active.some((item) => item.kind === "release")) return "release";
  return "gear";
}
