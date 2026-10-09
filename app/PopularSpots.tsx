import { FishingHook } from "lucide-react";
import { speciesName, type Language } from "./fishing-data";
import { popularSpotsOn, type PopularSpot, type PopularSpotKind, type SpotSourceKind } from "./popular-spots";

const text = {
  en: {
    title: "Popular spots",
    hint: "Where anglers say they fish this reach. What you may keep is the DFO rule above, not what any post says.",
    targets: "Anglers mention",
    access: "Getting there",
    sources: "Mentioned in",
    today: "This reach today",
    show: "Show on map",
  },
  zh: {
    title: "常去钓点",
    hint: "钓友分享的这段河常去的位置。能否带走、带几条只看上方的 DFO 规定，不看任何帖子的说法。",
    targets: "钓友常提到",
    access: "怎么去",
    sources: "来源",
    today: "这段今天",
    show: "在地图上显示",
  },
};

const kindName: Record<Language, Record<PopularSpotKind, string>> = {
  en: { pool: "Pool", bar: "Gravel bar", access: "Access point", bank: "Bank" },
  zh: { pool: "水潭", bar: "砾石滩", access: "下河入口", bank: "岸边" },
};

const sourceKindName: Record<Language, Record<SpotSourceKind, string>> = {
  en: {
    forum: "Forum",
    report: "Fishing report",
    blog: "Blog",
    video: "Video",
    osm: "OpenStreetMap",
    social: "Social media",
    news: "News",
    official: "Official",
    user: "Shared by a reader",
  },
  zh: {
    forum: "论坛",
    report: "渔情报告",
    blog: "博客",
    video: "视频",
    osm: "OpenStreetMap",
    social: "社交媒体",
    news: "新闻",
    official: "官方",
    user: "用户提供",
  },
};

const monthName = {
  en: ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  zh: ["", "1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"],
};

// Runs of consecutive months read as one span, so Sep, Oct, Nov becomes Sep–Nov.
function monthSpans(months: number[], language: Language) {
  const sorted = [...new Set(months)].sort((a, b) => a - b);
  const spans: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    let j = i;
    while (j + 1 < sorted.length && sorted[j + 1] === sorted[j] + 1) j++;
    const names = monthName[language];
    spans.push(i === j ? names[sorted[i]] : `${names[sorted[i]]}–${names[sorted[j]]}`);
    i = j;
  }
  return spans.join(language === "zh" ? "、" : ", ");
}

function targets(spot: PopularSpot, language: Language) {
  const species = spot.species?.map((name) => speciesName[language][name]).join(language === "zh" ? "、" : ", ");
  const months = spot.months?.length ? monthSpans(spot.months, language) : "";
  if (!species && !months) return "";
  if (language === "zh") return [months, species].filter(Boolean).join(" · ");
  return [species, months].filter(Boolean).join(" · ");
}

// lucide's fishing-hook, inlined because map markers are plain markup.
export const popularMarkerHtml = (label: string) =>
  `<span class="popular-marker" title="${escape(label)}"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m17.586 11.414-5.93 5.93a1 1 0 0 1-8-8l3.137-3.137a.707.707 0 0 1 1.207.5V10"/><path d="M20.414 8.586 22 7"/><circle cx="19" cy="10" r="2"/></svg></span>`;

function escape(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

// Leaflet popups take markup rather than React nodes, so every string from the
// data is escaped on the way in.
export function popularSpotPopup(spot: PopularSpot, language: Language, todayLabel: string) {
  const t = text[language];
  const about = targets(spot, language);
  const sources = spot.sources
    .map(
      (source) =>
        `<li><a href="${escape(source.url)}" target="_blank" rel="noreferrer">${escape(source.title)}</a><small>${escape(sourceKindName[language][source.kind])}</small></li>`,
    )
    .join("");
  return [
    `<div class="popular-popup" data-popular-popup="${escape(spot.id)}">`,
    `<span class="popular-popup-kind">${escape(kindName[language][spot.kind])}</span>`,
    `<strong>${escape(spot.name[language])}</strong>`,
    `<p class="popular-popup-today"><span>${escape(t.today)}</span>${escape(todayLabel)}</p>`,
    about ? `<p><span>${escape(t.targets)}</span>${escape(about)}</p>` : "",
    `<p><span>${escape(t.access)}</span>${escape(spot.access[language])}</p>`,
    `<div class="popular-popup-sources"><span>${escape(t.sources)}</span><ul>${sources}</ul></div>`,
    "</div>",
  ].join("");
}

export default function PopularSpotList({
  reachId,
  language,
  onShow,
}: {
  reachId: string;
  language: Language;
  onShow: (id: string) => void;
}) {
  const spots = popularSpotsOn(reachId);
  if (!spots.length) return null;
  const t = text[language];
  return (
    <section className="popular-list" aria-label={t.title}>
      <div className="popular-list-heading">
        <strong><FishingHook size={15} />{t.title}</strong>
        <p>{t.hint}</p>
      </div>
      <ul>
        {spots.map((spot) => {
          const about = targets(spot, language);
          return (
            <li key={spot.id}>
              <button type="button" onClick={() => onShow(spot.id)} data-popular-show={spot.id} aria-label={`${t.show}: ${spot.name[language]}`}>
                <span className="popular-list-kind">{kindName[language][spot.kind]}</span>
                <strong>{spot.name[language]}</strong>
                {about && <small>{about}</small>}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
