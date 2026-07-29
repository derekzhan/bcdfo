export type Language = "en" | "zh";
export type LocalizedText = { en: string; zh: string };
export type RuleKind = "retain" | "release" | "gear" | "closed";
export type Species = "Chinook" | "Coho" | "All";

export type FishingRule = {
  species: Species;
  season: LocalizedText;
  regulation: LocalizedText;
  kind: RuleKind;
  start?: [number, number];
  end?: [number, number];
  always?: boolean;
};

export type FishingSpot = {
  id: string;
  water: LocalizedText;
  area: LocalizedText;
  coordinates: [number, number];
  rules: FishingRule[];
  sourceAnchor?: string;
};

const t = (en: string, zh: string): LocalizedText => ({ en, zh });

const rule = (
  species: Species,
  seasonEn: string,
  seasonZh: string,
  regulationEn: string,
  regulationZh: string,
  kind: RuleKind,
  start?: [number, number],
  end?: [number, number],
  always?: boolean,
): FishingRule => ({
  species,
  season: t(seasonEn, seasonZh),
  regulation: t(regulationEn, regulationZh),
  kind,
  start,
  end,
  always,
});

export const fishingSpots: FishingSpot[] = [
  {
    id: "alouette-upper",
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
    water: t("Ashlu Creek", "Ashlu Creek"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.79, -123.322],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Bait ban", "禁止使用鱼饵", "gear", undefined, undefined, true),
      rule("Coho", "Sep 15–Jan 31", "9月15日–次年1月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 15], [1, 31]),
    ],
  },
  {
    id: "capilano",
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
    water: t("De Boville Slough", "De Boville Slough"),
    area: t("Downstream of the confluence of Cedar Creek and Hyde Creek", "从 Cedar Creek 与 Hyde Creek 汇流处向下游"),
    coordinates: [49.272, -122.731],
    rules: [
      rule("Coho", "Oct 1–Dec 31", "10月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [10, 1], [12, 31]),
    ],
  },
  {
    id: "fraser-mission",
    water: t("Fraser River", "Fraser River"),
    area: t("Mainstem waters upstream of the CPR Bridge at Mission, BC", "Mission 的 CPR 铁路桥以上 Fraser River 主河道"),
    coordinates: [49.164, -122.19],
    rules: [
      rule("All", "Apr 1 until further notice", "4月1日起，直至另行通知", "No fishing for salmon", "禁止垂钓鲑鱼", "closed", undefined, undefined, true),
    ],
  },
  {
    id: "harrison-upper",
    water: t("Harrison River", "Harrison River"),
    area: t("From the outlet of Harrison Lake downstream to the Highway 7 Bridge", "从 Harrison Lake 出口向下游至 Highway 7 大桥"),
    coordinates: [49.295, -121.938],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "harrison-lower",
    water: t("Harrison River", "Harrison River"),
    area: t("From the Highway 7 Bridge downstream to the Fraser River confluence", "从 Highway 7 大桥向下游至 Fraser River 汇流处"),
    coordinates: [49.252, -121.95],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day", "每日 4 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "kanaka",
    water: t("Kanaka Creek", "Kanaka Creek"),
    area: t("Downstream of the 112th Street bridge", "112th Street 大桥以下河段"),
    coordinates: [49.205, -122.498],
    rules: [
      rule("Coho", "Nov 1–Nov 30", "11月1日–11月30日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [11, 1], [11, 30]),
    ],
  },
  {
    id: "khartoum",
    water: t("Khartoum Lake", "Khartoum Lake"),
    area: t("Entire lake", "全湖"),
    coordinates: [49.881944, -124.109722],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Single barbless hook", "仅可使用单枚无倒刺鱼钩", "gear", undefined, undefined, true),
      rule("Chinook", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
      rule("Coho", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
    ],
  },
  {
    id: "little-campbell",
    water: t("Little Campbell River", "Little Campbell River"),
    area: t("Downstream of 12th Avenue, including tributaries to that part", "12th Avenue 以下河段，包括汇入该河段的支流"),
    coordinates: [49.026, -122.858],
    rules: [
      rule("Chinook", "Aug 15–Sep 15", "8月15日–9月15日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [8, 15], [9, 15]),
      rule("Chinook", "Sep 16–Dec 31", "9月16日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [9, 16], [12, 31]),
      rule("Coho", "Aug 15–Sep 15", "8月15日–9月15日", "Non-retention", "不得保留，钓获即放", "release", [8, 15], [9, 15]),
      rule("Coho", "Sep 16–Dec 31", "9月16日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 16], [12, 31]),
    ],
  },
  {
    id: "little-campbell-closure",
    water: t("Little Campbell River", "Little Campbell River"),
    area: t(
      "From a line between two fishing boundary signs downstream to the pedestrian bridge at the foot of Stayte Road",
      "从河流两岸两个钓鱼边界标志之间的连线向下游，至 Stayte Road 尽头的人行桥",
    ),
    coordinates: [49.015, -122.853],
    rules: [
      rule("All", "Aug 15–Sep 30", "8月15日–9月30日", "No fishing for salmon", "禁止垂钓鲑鱼", "closed", [8, 15], [9, 30]),
    ],
  },
  {
    id: "lois",
    water: t("Lois Lake", "Lois Lake"),
    area: t("Entire lake", "全湖"),
    coordinates: [49.7699, -124.317],
    rules: [
      rule("All", "Apr 1–Mar 31", "4月1日–次年3月31日", "Single barbless hook", "仅可使用单枚无倒刺鱼钩", "gear", undefined, undefined, true),
      rule("Chinook", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
      rule("Coho", "Apr 1–Mar 31", "4月1日–次年3月31日", "4 per day", "每日 4 条", "retain", undefined, undefined, true),
    ],
  },
  {
    id: "mamquam",
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
    water: t("Nicomekl River", "Nicomekl River"),
    area: t("Downstream of 208th Street", "208th Street 以下河段"),
    coordinates: [49.103, -122.87],
    rules: [
      rule("Chinook", "Sep 1–Nov 30", "9月1日–11月30日", "1 per day", "每日 1 条", "retain", [9, 1], [11, 30]),
      rule("Chinook", "Dec 1–Dec 31", "12月1日–12月31日", "Non-retention", "不得保留，钓获即放", "release", [12, 1], [12, 31]),
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "1 hatchery-marked per day", "每日 1 条有孵化场标记的鱼", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "nicomen",
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
    water: t("Norrish (Suicide) Creek", "Norrish（Suicide）Creek"),
    area: t("Entire listed water", "该水域"),
    coordinates: [49.172778, -122.135278],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
    ],
  },
  {
    id: "serpentine",
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
    water: t("Stave River", "Stave River"),
    area: t(
      "Downstream of the B.C. Hydro Dam to the CPR Railway Bridge, excluding the Ruskin and Northrop spawning channels described by DFO",
      "从 B.C. Hydro 大坝向下游至 CPR 铁路桥；不包括 DFO 所述的 Ruskin 与 Northrop 产卵水道",
    ),
    coordinates: [49.221, -122.359],
    rules: [
      rule("Coho", "Sep 1–Dec 31", "9月1日–12月31日", "4 hatchery-marked per day, only 2 over 35 cm", "每日 4 条有孵化场标记的鱼，其中超过 35 厘米的最多 2 条", "retain", [9, 1], [12, 31]),
    ],
  },
];

export const sourceUrl =
  "https://www.pac.dfo-mpo.gc.ca/fm-gp/rec/fresh-douce/region2-eng.html";

export function isRuleActive(rule: FishingRule, date = new Date()) {
  if (rule.always) return true;
  if (!rule.start || !rule.end) return false;
  const value = (date.getMonth() + 1) * 100 + date.getDate();
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
