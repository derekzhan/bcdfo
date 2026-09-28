"use client";

import { Camera, ExternalLink, Fish, MapPin, Ruler, ShieldAlert, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  checkCatch,
  listedSpecies,
  salmonSpecies,
  type FinClip,
  type Limit,
  type Salmon,
  type Verdict,
} from "./catch-check";
import {
  fishingSpots,
  regionById,
  regions,
  speciesName,
  type FishingRule,
  type FishingSpot,
  type Language,
  type LocalizedText,
} from "./fishing-data";

const provincialRegulations =
  "https://www2.gov.bc.ca/gov/content/sports-culture/recreation/fishing-hunting/fishing/fishing-regulations";

const t = (en: string, zh: string): LocalizedText => ({ en, zh });

const copy = {
  en: {
    eyebrow: "Catch check",
    title: "Can I keep this fish?",
    close: "Close",
    place: "Where are you fishing?",
    region: "Region",
    water: "Water and reach",
    pickWater: "Choose a water…",
    photo: "Photo (optional)",
    takePhoto: "Take or choose a photo",
    retakePhoto: "Change photo",
    photoNote: "Stays on this phone—it is never uploaded. Use it to compare against the guide below.",
    species: "Which salmon is it?",
    notListed: "not named for this reach",
    other: "Not a salmon / not sure",
    otherBody:
      "Trout, steelhead and other freshwater fish fall under the provincial Freshwater Fishing Regulations, not these DFO salmon tables. If you cannot tell which salmon it is, release it.",
    otherLink: "BC freshwater fishing regulations",
    yourPhoto: "Your photo",
    fin: "Adipose fin",
    finHint: "The small fleshy fin on the back between the dorsal fin and the tail. Hatchery fish have it clipped off, often leaving a healed scar.",
    clipped: "Clipped",
    intact: "Present",
    unsure: "Can't tell",
    length: "Length",
    lengthHint: "Nose tip to the fork of the tail",
    verdict: "Result",
    chooseWater: "Choose a water above to check today's rules.",
    chooseSpecies: "Choose the species to see whether you may keep it.",
    retain: "You may keep it",
    release: "Release it",
    closed: "No fishing here today",
    needs: "One more answer",
    manual: "Check the DFO wording",
    needsFin: "This limit is for hatchery-marked fish only—check the adipose fin.",
    needsLength: "Measure the fish: this limit depends on length.",
    manualBody: "The rule here is worded in a way this checker does not decide for you. Read it below.",
    basis: "DFO rule applied",
    gear: "Also in effect",
    tally: "Count what you have already kept today, including the region-wide limit for all salmon.",
    official: "DFO table for this region",
    disclaimer:
      "For reference only. DFO notices and posted signs take precedence. If you are not sure of the species or the fin, release the fish.",
  },
  zh: {
    eyebrow: "识鱼助手",
    title: "这条鱼能带走吗？",
    close: "关闭",
    place: "你在哪里钓鱼？",
    region: "区域",
    water: "水域与河段",
    pickWater: "选择水域…",
    photo: "照片（可选）",
    takePhoto: "拍照或选择照片",
    retakePhoto: "换一张",
    photoNote: "照片只留在本机，不会上传。用来和下面的辨认要点对照。",
    species: "这是哪种鲑鱼？",
    notListed: "此河段未单独列出",
    other: "不是鲑鱼 / 不确定",
    otherBody: "鳟鱼、硬头鳟等淡水鱼归 BC 省淡水钓鱼规定管，不在 DFO 的鲑鱼表里。认不准是哪种鲑鱼时，请放生。",
    otherLink: "BC 省淡水钓鱼规定",
    yourPhoto: "你的照片",
    fin: "脂鳍",
    finHint: "背鳍和尾鳍之间的一片小肉鳍。孵化场放流的鱼会剪掉脂鳍，通常留有愈合的疤痕。",
    clipped: "已剪（有标记）",
    intact: "还在（无标记）",
    unsure: "看不清",
    length: "体长",
    lengthHint: "从鼻尖量到尾叉",
    verdict: "结论",
    chooseWater: "先在上面选择水域，才能按今天的规定判断。",
    chooseSpecies: "选择鱼种后显示能否带走。",
    retain: "可以带走",
    release: "必须放生",
    closed: "此处今天禁钓",
    needs: "还差一项",
    manual: "请按原文判断",
    needsFin: "这里只允许保留有孵化场标记的鱼，请检查脂鳍。",
    needsLength: "这条规定和体长有关，请量一下鱼。",
    manualBody: "这条规定的写法本助手不代为判断，请阅读下面的原文。",
    basis: "依据的 DFO 规定",
    gear: "同时有效",
    tally: "请自行核对今天已带走的数量，并注意本区所有鲑鱼合计的每日上限。",
    official: "本区 DFO 官方表格",
    disclaimer: "仅供参考，以 DFO 公告和现场标志为准；认不准鱼种或标记时请放生。",
  },
} as const;

const guide: Record<Salmon, LocalizedText[]> = {
  Chinook: [
    t("Black gums and mouth", "牙龈和口腔是黑色的"),
    t("Large spots on the back and on both lobes of the tail", "背部和尾鳍上下两叶都有大斑点"),
    t("The largest salmon", "体型最大的鲑鱼"),
  ],
  Coho: [
    t("Dark mouth but white or grey gums at the base of the teeth", "口腔发黑，但齿根处的牙龈是白色或灰白色"),
    t("Small spots on the back; spots on the upper lobe of the tail only", "背部斑点细小；尾鳍只有上半叶有斑点"),
    t("Thick tail wrist; spawners turn red with a dark back", "尾柄粗壮；产卵期体侧变红、背部发黑"),
  ],
  Sockeye: [
    t("No distinct black spots on the back or tail", "背部和尾鳍没有明显的黑斑"),
    t("Spawners: bright red body with a green head", "产卵期：身体鲜红、头部绿色"),
    t("Slender body", "体型修长"),
  ],
  Pink: [
    t("Large oval black spots on both lobes of the tail", "尾鳍上下两叶都有椭圆形大黑斑"),
    t("Very small scales; spawning males grow a pronounced hump", "鳞片非常细小；产卵期雄鱼背部明显隆起"),
    t("The smallest salmon", "体型最小的鲑鱼"),
  ],
  Chum: [
    t("No black spots; fine silver streaks on the tail", "没有黑斑，尾鳍有细密的银色条纹"),
    t("Spawners: purple and green vertical bars", "产卵期体侧有紫绿相间的竖纹"),
    t("Spawning males have large canine-like teeth; lower fins tipped white", "产卵期雄鱼有大犬齿；腹鳍和臀鳍末端发白"),
  ],
};

type Palette = { back: string; belly: string; head?: string };
const palettes: Record<Salmon, Palette> = {
  Chinook: { back: "#44503f", belly: "#b8b59f" },
  Coho: { back: "#2f463c", belly: "#c4574a" },
  Sockeye: { back: "#b8302b", belly: "#d9473d", head: "#4f7a3c" },
  Pink: { back: "#56605d", belly: "#e2dfd4" },
  Chum: { back: "#666c42", belly: "#b4b28c" },
};

const bodyPath =
  "M6 44 C 18 30, 48 22, 80 22 C 110 22, 132 30, 148 37 L 180 18 L 170 44 L 180 70 L 148 51 C 132 58, 110 66, 80 66 C 48 66, 18 58, 6 44 Z";
const humpedBodyPath =
  "M6 44 C 16 28, 38 8, 74 8 C 106 8, 130 28, 148 37 L 180 18 L 170 44 L 180 70 L 148 51 C 132 58, 110 66, 80 66 C 48 66, 18 58, 6 44 Z";

const spots: Record<Salmon, Array<[number, number, number, number]>> = {
  Chinook: [
    [60, 28, 2.3, 2.3], [73, 26, 2.3, 2.3], [87, 27, 2.3, 2.3], [101, 28, 2.3, 2.3], [114, 31, 2.3, 2.3],
    [127, 34, 2, 2], [138, 38, 2, 2], [80, 33, 2, 2], [96, 34, 2, 2], [159, 31, 2, 2], [167, 27, 2, 2],
    [174, 23, 1.8, 1.8], [163, 37, 1.8, 1.8], [159, 57, 2, 2], [167, 61, 2, 2], [174, 65, 1.8, 1.8], [163, 51, 1.8, 1.8],
  ],
  Coho: [
    [64, 27, 1.4, 1.4], [80, 26, 1.4, 1.4], [96, 27, 1.4, 1.4], [110, 29, 1.4, 1.4], [124, 33, 1.4, 1.4],
    [159, 31, 1.6, 1.6], [167, 27, 1.6, 1.6], [174, 23, 1.5, 1.5],
  ],
  Sockeye: [],
  Pink: [
    [66, 16, 3, 1.8], [84, 13, 3, 1.8], [102, 17, 3, 1.8], [118, 25, 3, 1.8], [158, 31, 3.4, 2.1],
    [169, 25, 3.4, 2.1], [164, 39, 3, 1.9], [158, 57, 3.4, 2.1], [169, 63, 3.4, 2.1], [164, 49, 3, 1.9],
  ],
  Chum: [],
};

// Dashed rings around the feature each guide leads with.
const highlights: Record<Salmon, Array<[number, number, number]>> = {
  Chinook: [[14, 45, 11], [167, 44, 21]],
  Coho: [[14, 45, 11], [167, 34, 14]],
  Sockeye: [[26, 42, 18], [100, 36, 16]],
  Pink: [[84, 16, 20], [166, 44, 21]],
  Chum: [[96, 44, 24], [167, 44, 21]],
};

function SalmonFigure({ species, detailed }: { species: Salmon; detailed?: boolean }) {
  const id = useId().replace(/:/g, "");
  const palette = palettes[species];
  const body = species === "Pink" ? humpedBodyPath : bodyPath;
  const dorsal = species === "Pink" ? "M80 10 L 92 -2 L 104 12 Z" : "M74 23 L 86 8 L 100 23 Z";
  return (
    <svg className="salmon-figure" viewBox="0 -6 200 90" role="img" aria-label={speciesName.en[species]}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.back} />
          <stop offset="1" stopColor={palette.belly} />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={body} />
        </clipPath>
      </defs>
      <path d={dorsal} fill={palette.back} />
      <path d="M122 29 Q 128 21 134 30 Z" fill={palette.back} />
      <path d="M74 65 L 82 75 L 90 65 Z" fill={palette.back} opacity="0.85" />
      <path d="M112 61 L 122 71 L 128 58 Z" fill={palette.back} opacity="0.85" />
      <path d={body} fill={`url(#${id}-fill)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {palette.head && <path d="M0 0 H 40 C 44 30, 44 58, 40 90 H 0 Z" fill={palette.head} />}
        {species === "Chum" &&
          [58, 74, 90, 106, 122, 138].map((x) => (
            <path key={x} d={`M${x} 18 C ${x + 5} 34, ${x - 3} 50, ${x + 4} 70`} stroke="#6f3f63" strokeWidth="5" fill="none" opacity="0.7" />
          ))}
        {species === "Chum" && <path d="M150 44 L 178 30 M150 44 L 178 58 M152 44 L 178 44" stroke="#dfe3dc" strokeWidth="1" opacity="0.8" />}
      </g>
      {spots[species].map(([cx, cy, rx, ry]) => (
        <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx={rx} ry={ry} fill="#15201b" />
      ))}
      <path d="M36 31 C 42 40, 42 50, 36 58" stroke="#1d2a24" strokeOpacity="0.45" strokeWidth="1.4" fill="none" />
      <path d="M34 52 L 46 62 L 48 52 Z" fill={palette.back} opacity="0.7" />
      <path d="M6 44 L 22 47" stroke="#1d2a24" strokeWidth="1.3" />
      <circle cx="20" cy="39" r="2.6" fill="#101814" />
      <circle cx="20.8" cy="38.3" r="0.8" fill="#fff" />
      {detailed &&
        highlights[species].map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="none" stroke="#f0a020" strokeWidth="2" strokeDasharray="4 3" />
        ))}
    </svg>
  );
}

function AdiposeFigure({ language }: { language: Language }) {
  return (
    <svg className="adipose-figure" viewBox="0 -6 200 90" role="img" aria-label={copy[language].fin}>
      <path d="M74 23 L 86 8 L 100 23 Z" fill="#9aa8a1" />
      <path d="M122 29 Q 128 19 134 30 Z" fill="#f0a020" />
      <path d="M74 65 L 82 75 L 90 65 Z" fill="#9aa8a1" />
      <path d="M112 61 L 122 71 L 128 58 Z" fill="#9aa8a1" />
      <path d={bodyPath} fill="#c7d1cc" />
      <circle cx="20" cy="39" r="2.6" fill="#4f665f" />
      <circle cx="128" cy="25" r="11" fill="none" stroke="#f0a020" strokeWidth="2" strokeDasharray="4 3" />
      <text x="128" y="4" textAnchor="middle" fontSize="10" fontWeight="700" fill="#9a5a0a">
        {copy[language].fin}
      </text>
    </svg>
  );
}

const listJoin = (language: Language) => (language === "zh" ? "、" : ", ");

function describeLimit(limit: Limit, species: Salmon, lengthCm: number | undefined, language: Language) {
  const name = speciesName[language][species];
  if (language === "zh") {
    const parts = [`每日最多保留 ${limit.daily} 条${name}`];
    if (limit.markedOnly && limit.unmarkedMax !== undefined) parts.push(`其中无孵化场标记的最多 ${limit.unmarkedMax} 条`);
    else if (limit.markedOnly) parts.push("须有孵化场标记");
    if (limit.over && limit.over.max > 0) parts.push(`其中超过 ${limit.over.cm} 厘米的最多 ${limit.over.max} 条`);
    if (limit.over?.max === 0) parts.push(`不得超过 ${limit.over.cm} 厘米`);
    if (limit.maxCm !== undefined) parts.push(`不得超过 ${limit.maxCm} 厘米`);
    let text = `${parts.join("，")}。`;
    if (limit.over && limit.over.max > 0 && lengthCm !== undefined && lengthCm > limit.over.cm) {
      text += `这条超过 ${limit.over.cm} 厘米，计入「超过 ${limit.over.cm} 厘米」的名额。`;
    }
    return text;
  }
  const parts = [`Up to ${limit.daily} ${name} per day`];
  if (limit.markedOnly && limit.unmarkedMax !== undefined) parts.push(`no more than ${limit.unmarkedMax} unmarked`);
  else if (limit.markedOnly) parts.push("hatchery-marked only");
  if (limit.over && limit.over.max > 0) parts.push(`only ${limit.over.max} over ${limit.over.cm} cm`);
  if (limit.over?.max === 0) parts.push(`none over ${limit.over.cm} cm`);
  if (limit.maxCm !== undefined) parts.push(`none over ${limit.maxCm} cm`);
  let text = `${parts.join(", ")}.`;
  if (limit.over && limit.over.max > 0 && lengthCm !== undefined && lengthCm > limit.over.cm) {
    text += ` This one is over ${limit.over.cm} cm and counts toward that allowance.`;
  }
  return text;
}

function explain(verdict: Verdict, species: Salmon, fin: FinClip | undefined, lengthCm: number | undefined, language: Language) {
  const name = speciesName[language][species];
  const zh = language === "zh";
  switch (verdict.kind) {
    case "retain":
      return describeLimit(verdict.limit, species, lengthCm, language);
    case "closed":
      if (verdict.rule.species.includes("All")) {
        return zh ? "今天这里禁止垂钓三文鱼。" : "Salmon fishing is closed here today.";
      }
      return zh ? `今天这里禁钓${name}，误钓须立即放生。` : `Fishing for ${name} is closed here today; release any you hook.`;
    case "needs":
      return verdict.field === "fin" ? copy[language].needsFin : copy[language].needsLength;
    case "manual":
      return copy[language].manualBody;
    case "release":
      switch (verdict.reason) {
        case "rule":
          return zh ? `今天这里的${name}只能钓获即放。` : `${name} are catch-and-release here today.`;
        case "none":
          return zh ? `今天这里没有允许保留${name}的规定。` : `Nothing lets you keep ${name} here today.`;
        case "pending":
          return zh ? `DFO 尚未公布这里${name}的规定，按不得保留处理。` : `DFO has not announced ${name} rules here yet, so it may not be kept.`;
        case "zero":
          return zh ? "这里的每日限额为 0。" : "The daily limit here is zero.";
        case "unmarked":
          return fin === "unsure"
            ? zh
              ? `这里只允许保留有孵化场标记的${name}。看不清脂鳍时按野生鱼处理。`
              : `Only hatchery-marked ${name} may be kept here. A fin you cannot check counts as wild.`
            : zh
              ? `这里只允许保留有孵化场标记（脂鳍已剪）的${name}。`
              : `Only hatchery-marked (adipose-clipped) ${name} may be kept here.`;
        case "undersize":
          return zh ? `本区保留的${name}须达 ${verdict.cm} 厘米以上。` : `Retained ${name} must be at least ${verdict.cm} cm in this region.`;
        case "oversize":
          return zh
            ? `这里保留的${name}不得超过 ${verdict.cm} 厘米${lengthCm !== undefined ? `，这条 ${lengthCm} 厘米` : ""}。`
            : `${name} kept here may not exceed ${verdict.cm} cm${lengthCm !== undefined ? `; this one is ${lengthCm} cm` : ""}.`;
      }
  }
}

function verdictRules(verdict: Verdict): FishingRule[] {
  if (verdict.kind === "manual") return verdict.rules;
  if ("rule" in verdict && verdict.rule) return [verdict.rule];
  return [];
}

const verdictTone = (verdict: Verdict) =>
  verdict.kind === "retain" ? "retain" : verdict.kind === "release" ? "release" : verdict.kind === "closed" ? "closed" : "pending";

function RuleCitation({ rule, language }: { rule: FishingRule; language: Language }) {
  return (
    <li>
      <span>{rule.species.map((name) => speciesName[language][name]).join(listJoin(language))} · {rule.season[language]}</span>
      <strong>{rule.regulation[language]}</strong>
    </li>
  );
}

const shorten = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

export default function CatchChecker({
  language,
  initialSpot,
  initialRegionId,
  onClose,
}: {
  language: Language;
  initialSpot: FishingSpot | null;
  initialRegionId: string;
  onClose: () => void;
}) {
  const text = copy[language];
  const [today] = useState(() => new Date());
  const [regionId, setRegionId] = useState(initialSpot?.region ?? initialRegionId);
  const [spotId, setSpotId] = useState(initialSpot?.id ?? "");
  const [species, setSpecies] = useState<Salmon | "other" | null>(null);
  const [fin, setFin] = useState<FinClip | undefined>();
  const [length, setLength] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  const regionSpots = useMemo(
    () =>
      fishingSpots
        .filter((spot) => spot.region === regionId)
        .sort((a, b) =>
          a.water[language].localeCompare(b.water[language], language === "zh" ? "zh-CN" : "en-CA") ||
          a.area[language].localeCompare(b.area[language]),
        ),
    [language, regionId],
  );
  const spot = regionSpots.find((item) => item.id === spotId) ?? null;
  const region = regionById(regionId);

  const ordered = useMemo(() => {
    const named = spot ? listedSpecies(spot) : [];
    return [...named, ...salmonSpecies.filter((item) => !named.includes(item))].map((item) => ({
      species: item,
      named: !spot || named.includes(item) || spot.rules.some((rule) => rule.species.includes("All")),
    }));
  }, [spot]);

  const lengthCm = length.trim() === "" ? undefined : Number(length);
  const salmon = species && species !== "other" ? species : null;
  const result = spot && salmon ? checkCatch(spot, { species: salmon, fin, lengthCm }, today) : null;

  const changeRegion = (next: string) => {
    setRegionId(next);
    setSpotId("");
  };

  return (
    <div className="catch-backdrop" onClick={onClose}>
      <section
        className="catch-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="catch-head">
          <div>
            <span><Fish size={14} />{text.eyebrow}</span>
            <h2 id={titleId}>{text.title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label={text.close}><X size={18} /></button>
        </header>

        <div className="catch-body">
          <section className="catch-step">
            <h3><b>1</b>{text.place}</h3>
            <label className="catch-field">
              <span>{text.region}</span>
              <select value={regionId} onChange={(event) => changeRegion(event.target.value)}>
                {regions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {`${language === "zh" ? `第 ${item.id} 区` : `Region ${item.id}`} · ${item.name[language]}`}
                  </option>
                ))}
              </select>
            </label>
            <label className="catch-field">
              <span>{text.water}</span>
              <select value={spotId} onChange={(event) => setSpotId(event.target.value)} data-catch-spot>
                <option value="">{text.pickWater}</option>
                {regionSpots.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.area[language] ? `${item.water[language]} · ${shorten(item.area[language])}` : item.water[language]}
                  </option>
                ))}
              </select>
            </label>
            {spot?.area[language] && (
              <p className="catch-area"><MapPin size={13} />{spot.area[language]}</p>
            )}
          </section>

          <section className="catch-step">
            <h3><b>2</b>{text.photo}</h3>
            <label className="catch-photo-button">
              <Camera size={17} />
              {photo ? text.retakePhoto : text.takePhoto}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setPhoto(URL.createObjectURL(file));
                }}
              />
            </label>
            {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL, never optimised or uploaded */}
            {photo && <img className="catch-photo" src={photo} alt={text.yourPhoto} />}
            <p className="catch-note">{text.photoNote}</p>
          </section>

          <section className="catch-step">
            <h3><b>3</b>{text.species}</h3>
            <div className="species-grid">
              {ordered.map(({ species: item, named }) => (
                <button
                  type="button"
                  key={item}
                  className={`species-card${species === item ? " is-active" : ""}${named ? "" : " is-unlisted"}`}
                  aria-pressed={species === item}
                  onClick={() => setSpecies(item)}
                  data-species={item}
                >
                  <SalmonFigure species={item} />
                  <strong>{speciesName[language][item]}</strong>
                  {language === "zh" && <small>{speciesName.en[item]}</small>}
                  {!named && <em>{text.notListed}</em>}
                </button>
              ))}
              <button
                type="button"
                className={`species-card species-other${species === "other" ? " is-active" : ""}`}
                aria-pressed={species === "other"}
                onClick={() => setSpecies("other")}
                data-species="other"
              >
                <ShieldAlert size={22} />
                <strong>{text.other}</strong>
              </button>
            </div>
            {salmon && (
              <div className="species-guide">
                <div className="species-guide-art">
                  <SalmonFigure species={salmon} detailed />
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL */}
                  {photo && <img src={photo} alt={text.yourPhoto} />}
                </div>
                <ul>
                  {guide[salmon].map((point) => <li key={point.en}>{point[language]}</li>)}
                </ul>
              </div>
            )}
            {species === "other" && (
              <div className="species-guide is-other">
                <p>{text.otherBody}</p>
                <a href={provincialRegulations} target="_blank" rel="noreferrer">{text.otherLink}<ExternalLink size={13} /></a>
              </div>
            )}
          </section>

          {result?.asks.fin && (
            <section className="catch-step">
              <h3><b>4</b>{text.fin}</h3>
              <AdiposeFigure language={language} />
              <p className="catch-note">{text.finHint}</p>
              <div className="choice-row" role="group" aria-label={text.fin}>
                {(["clipped", "intact", "unsure"] as const).map((option) => (
                  <button
                    type="button"
                    key={option}
                    className={fin === option ? "is-active" : ""}
                    aria-pressed={fin === option}
                    onClick={() => setFin(option)}
                    data-fin={option}
                  >
                    {text[option]}
                  </button>
                ))}
              </div>
            </section>
          )}

          {result?.asks.length && (
            <section className="catch-step">
              <h3><b>{result.asks.fin ? 5 : 4}</b>{text.length}</h3>
              <label className="catch-length">
                <Ruler size={17} />
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="150"
                  step="0.5"
                  value={length}
                  onChange={(event) => setLength(event.target.value)}
                  aria-label={text.length}
                  data-catch-length
                />
                <span>cm</span>
              </label>
              <p className="catch-note">{text.lengthHint}</p>
            </section>
          )}

          {species !== "other" && (
            <section className={`catch-verdict tone-${result ? verdictTone(result.verdict) : "idle"}`} aria-live="polite" data-verdict={result?.verdict.kind ?? "idle"}>
              <span>{text.verdict}</span>
              {!spot ? (
                <p>{text.chooseWater}</p>
              ) : !result || !salmon ? (
                <p>{text.chooseSpecies}</p>
              ) : (
                <>
                  <strong>{text[result.verdict.kind]}</strong>
                  <p>{explain(result.verdict, salmon, fin, lengthCm, language)}</p>
                  {result.verdict.kind === "retain" && <p className="catch-tally">{text.tally}</p>}
                  {verdictRules(result.verdict).length > 0 && (
                    <div className="catch-basis">
                      <span>{text.basis}</span>
                      <ul>{verdictRules(result.verdict).map((rule, index) => <RuleCitation key={index} rule={rule} language={language} />)}</ul>
                    </div>
                  )}
                  {result.gear.length > 0 && (
                    <div className="catch-basis">
                      <span>{text.gear}</span>
                      <ul>{result.gear.map((rule, index) => <RuleCitation key={index} rule={rule} language={language} />)}</ul>
                    </div>
                  )}
                </>
              )}
              <a className="catch-official" href={`${region.sourceUrl}${spot?.sourceAnchor ? `#${spot.sourceAnchor}` : ""}`} target="_blank" rel="noreferrer">
                {text.official}<ExternalLink size={13} />
              </a>
            </section>
          )}

          <p className="catch-disclaimer"><ShieldAlert size={15} />{text.disclaimer}</p>
        </div>
      </section>
    </div>
  );
}
