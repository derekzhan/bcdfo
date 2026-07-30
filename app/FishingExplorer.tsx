"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Fish,
  Flag,
  Languages,
  LocateFixed,
  MapPin,
  Navigation,
  Search,
  ShieldAlert,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  currentKind,
  fishingSpots,
  getBoundaryStart,
  isRuleActive,
  sourceUrl,
  type FishingSpot,
  type Language,
  type RuleKind,
} from "./fishing-data";

type Filter = "all" | "today" | "chinook" | "coho" | "closures";

const ui = {
  en: {
    eyebrow: "DFO Region 2 · Lower Mainland",
    title: "Salmon Water Guide",
    subtitle: "Explore listed salmon opportunities, boundaries and limits—without wrestling with a giant table.",
    search: "Search water or boundary…",
    all: "All waters",
    today: "Listed today",
    chinook: "Chinook",
    coho: "Coho",
    closures: "Closures",
    results: "mapped areas",
    active: "listed today",
    source: "Official DFO table",
    updated: "Source modified Apr 1, 2026",
    mapHint: "Tap a start marker or select a water",
    details: "Rules & limits",
    area: "Regulated area",
    season: "Season",
    regulation: "Regulation",
    navigate: "Navigate",
    official: "View official source",
    close: "Close details",
    noResults: "No waters match these filters.",
    reset: "Clear filters",
    todayLabel: "Today",
    inactive: "Outside listed season",
    retain: "Retention listed",
    release: "Non-retention",
    gear: "Gear restriction",
    closed: "No salmon fishing",
    disclaimer:
      "Map pins are reference points, not legal boundaries. Confirm the written area, in-season notices, provincial rules and posted signs before fishing.",
    daylight: "Salmon fishing is permitted only during daylight hours in Region 2.",
    facilities: "No fishing within 100 m of a government fish-counting, passage or rearing facility.",
    sourceNote: "Salmon rules only",
    locate: "Show my location",
    waters: "mapped waters",
    liveNow: "with a current listing",
    listTitle: "Water directory",
    listHint: "Select a water to see boundaries and limits",
    explore: "Explore the map",
    boundaryStart: "Boundary start",
    referencePoint: "Water reference",
    approximate: "Approximate—confirm posted signs",
  },
  zh: {
    eyebrow: "DFO 第 2 区 · 大温及低陆平原",
    title: "鲑鱼钓场指南",
    subtitle: "把官方表格变成好查、好懂、可导航的钓场地图。",
    search: "搜索河流、湖泊或边界…",
    all: "全部水域",
    today: "今天有条目",
    chinook: "帝王鲑",
    coho: "银鲑",
    closures: "禁钓区域",
    results: "个地图区域",
    active: "个今天有条目",
    source: "DFO 官方表格",
    updated: "来源更新于 2026年4月1日",
    mapHint: "点击起点标记或选择水域",
    details: "规定与限额",
    area: "适用范围",
    season: "日期",
    regulation: "规定",
    navigate: "导航",
    official: "查看官方来源",
    close: "关闭详情",
    noResults: "没有符合当前筛选条件的水域。",
    reset: "清除筛选",
    todayLabel: "今天",
    inactive: "不在表列日期内",
    retain: "允许按限额保留",
    release: "不得保留",
    gear: "渔具限制",
    closed: "禁止垂钓鲑鱼",
    disclaimer: "地图标点仅供定位参考，并非法律边界。出发前请核对文字范围、季中公告、省级规定及现场标志。",
    daylight: "第 2 区仅可在白天垂钓鲑鱼。",
    facilities: "政府运营的鱼类计数、通行或养殖设施周围 100 米内禁止钓鱼。",
    sourceNote: "仅限鲑鱼规定",
    locate: "显示我的位置",
    waters: "个已标注水域",
    liveNow: "个当前有条目",
    listTitle: "水域目录",
    listHint: "选择水域查看边界与限额",
    explore: "开始查看地图",
    boundaryStart: "区域起点",
    referencePoint: "水域参考点",
    approximate: "约略位置，请以现场标志为准",
  },
} as const;

const speciesName = {
  en: { Chinook: "Chinook", Coho: "Coho", All: "All salmon" },
  zh: { Chinook: "帝王鲑", Coho: "银鲑", All: "所有鲑鱼" },
} as const;

const statusRank: Record<ReturnType<typeof currentKind>, number> = {
  closed: 0,
  retain: 1,
  release: 2,
  gear: 3,
  inactive: 4,
};

function markerClass(kind: ReturnType<typeof currentKind>, selected: boolean) {
  return `map-marker marker-${kind}${selected ? " is-selected" : ""}`;
}

function FishingMap({
  spots,
  selected,
  language,
  onSelect,
}: {
  spots: FishingSpot[];
  selected: FishingSpot | null;
  language: Language;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet").default | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const locationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [locationError, setLocationError] = useState(false);

  useEffect(() => {
    let active = true;
    void import("leaflet").then(({ default: leaflet }) => {
      if (!active || !containerRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      const map = leaflet.map(containerRef.current, {
        zoomControl: false,
        minZoom: 7,
        maxBounds: [
          [47.8, -125.8],
          [51.1, -120.6],
        ],
      }).setView([49.45, -122.72], 8);

      leaflet.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      locationLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setMapReady(true);
      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    spots.forEach((spot, index) => {
      const kind = currentKind(spot);
      const point = getBoundaryStart(spot);
      const pointLabel = point.kind === "start" ? (language === "zh" ? "起" : "S") : (language === "zh" ? "参" : "R");
      const icon = L.divIcon({
        className: "marker-shell",
        html: `<span class="${markerClass(kind, selected?.id === spot.id)}${point.kind === "reference" ? " is-reference-point" : ""}"><b>${index + 1}</b><em>${pointLabel}</em></span>`,
        iconSize: [42, 48],
        iconAnchor: [21, 43],
      });
      const marker = L.marker(point.coordinates, { icon, keyboard: true });
      marker.bindTooltip(
        `${spot.water[language]} · ${point.kind === "start" ? ui[language].boundaryStart : ui[language].referencePoint}`,
        {
        direction: "top",
        offset: [0, -34],
        opacity: 0.96,
        },
      );
      marker.on("click", () => onSelect(spot.id));
      marker.addTo(layer);
    });

    if (spots.length > 1 && !selected) {
      const bounds = L.latLngBounds(spots.map((spot) => getBoundaryStart(spot).coordinates));
      map.fitBounds(bounds, { padding: [34, 34], maxZoom: 9 });
    }
  }, [spots, selected, language, onSelect, mapReady]);

  useEffect(() => {
    if (selected && mapRef.current) {
      mapRef.current.flyTo(getBoundaryStart(selected).coordinates, Math.max(mapRef.current.getZoom(), 11), {
        duration: 0.65,
      });
    }
  }, [selected]);

  const locate = () => {
    setLocationError(false);
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const L = leafletRef.current;
        const map = mapRef.current;
        const layer = locationLayerRef.current;
        if (!L || !map || !layer) return;
        layer.clearLayers();
        L.circleMarker([coords.latitude, coords.longitude], {
          radius: 7,
          weight: 3,
          color: "#ffffff",
          fillColor: "#146c5a",
          fillOpacity: 1,
        }).addTo(layer);
        L.circle([coords.latitude, coords.longitude], {
          radius: Math.min(coords.accuracy, 300),
          weight: 1,
          color: "#146c5a",
          fillColor: "#146c5a",
          fillOpacity: 0.1,
        }).addTo(layer);
        map.flyTo([coords.latitude, coords.longitude], 11);
      },
      () => setLocationError(true),
      { enableHighAccuracy: true, timeout: 9000 },
    );
  };

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map-canvas" aria-label={language === "zh" ? "钓场互动地图" : "Interactive fishing map"} />
      <div className="map-topline">
        <span><MapPin size={15} />{ui[language].mapHint}</span>
        <button type="button" className="map-location-button" onClick={locate} aria-label={ui[language].locate}>
          <LocateFixed size={17} />
        </button>
      </div>
      {locationError && (
        <div className="location-error">{language === "zh" ? "无法读取当前位置" : "Location unavailable"}</div>
      )}
      <div className="map-legend" aria-label={language === "zh" ? "地图图例" : "Map legend"}>
        <span className="boundary-legend"><i>{language === "zh" ? "起" : "S"}</i>{ui[language].boundaryStart}</span>
        <span className="boundary-legend is-reference"><i>{language === "zh" ? "参" : "R"}</i>{ui[language].referencePoint}</span>
        {(["retain", "release", "gear", "closed", "inactive"] as const).map((kind) => (
          <span key={kind}><i className={`legend-dot marker-${kind}`} />{ui[language][kind]}</span>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ kind, language }: { kind: ReturnType<typeof currentKind>; language: Language }) {
  return <span className={`status-pill status-${kind}`}>{ui[language][kind]}</span>;
}

function RuleList({ spot, language }: { spot: FishingSpot; language: Language }) {
  return (
    <div className="rule-list">
      {spot.rules.map((item, index) => {
        const active = isRuleActive(item);
        return (
          <div className={`rule-row rule-${item.kind}${active ? " is-active" : ""}`} key={`${item.species}-${index}`}>
            <div className="rule-species">
              <Fish size={16} />
              <strong>{speciesName[language][item.species]}</strong>
              {active && <span className="today-dot">{ui[language].todayLabel}</span>}
            </div>
            <div>
              <span className="rule-label">{ui[language].season}</span>
              <span>{item.season[language]}</span>
            </div>
            <div>
              <span className="rule-label">{ui[language].regulation}</span>
              <strong>{item.regulation[language]}</strong>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FishingExplorer() {
  const [language, setLanguage] = useState<Language>("zh");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>("alouette-upper");

  useEffect(() => {
    const saved = window.localStorage.getItem("salmon-guide-language");
    if (saved === "en" || saved === "zh") setLanguage(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("salmon-guide-language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return fishingSpots
      .filter((spot) => {
        const searchable = `${spot.water.en} ${spot.water.zh} ${spot.area.en} ${spot.area.zh}`.toLocaleLowerCase();
        if (needle && !searchable.includes(needle)) return false;
        if (filter === "today") return spot.rules.some((item) => isRuleActive(item));
        if (filter === "chinook") return spot.rules.some((item) => item.species === "Chinook");
        if (filter === "coho") return spot.rules.some((item) => item.species === "Coho");
        if (filter === "closures") return spot.rules.some((item) => item.kind === "closed");
        return true;
      })
      .sort((a, b) => {
        const status = statusRank[currentKind(a)] - statusRank[currentKind(b)];
        return status || a.water[language].localeCompare(b.water[language], language === "zh" ? "zh-CN" : "en-CA");
      });
  }, [filter, language, query]);

  const selected = fishingSpots.find((spot) => spot.id === selectedId) ?? null;
  const activeCount = fishingSpots.filter((spot) => spot.rules.some((item) => isRuleActive(item))).length;

  const selectSpot = (id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => {
      document.querySelector(`[data-spot="${id}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  };

  const resetFilters = () => {
    setFilter("all");
    setQuery("");
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: ui[language].all },
    { id: "today", label: ui[language].today },
    { id: "chinook", label: ui[language].chinook },
    { id: "coho", label: ui[language].coho },
    { id: "closures", label: ui[language].closures },
  ];

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Waves size={21} /></div>
          <div className="brand-copy">
            <span>{ui[language].eyebrow}</span>
            <strong>{language === "zh" ? "BC 鲑鱼地图" : "BC Salmon Map"}</strong>
          </div>
        </div>
        <div className="topbar-spacer" />
        <a className="source-link" href={sourceUrl} target="_blank" rel="noreferrer">
          <span><Check size={15} />{ui[language].source}</span>
          <ExternalLink size={14} />
        </a>
        <button
          className="language-button"
          type="button"
          onClick={() => setLanguage((current) => (current === "zh" ? "en" : "zh"))}
          aria-label={language === "zh" ? "Switch to English" : "切换到中文"}
        >
          <Languages size={17} />
          {language === "zh" ? "EN" : "中文"}
        </button>
      </header>

      <section className="intro">
        <div className="intro-content">
          <p className="eyebrow"><Sparkles size={13} />{ui[language].eyebrow}</p>
          <h1>{ui[language].title}</h1>
          <p className="intro-copy">{ui[language].subtitle}</p>
          <a className="intro-cta" href="#explorer">
            {ui[language].explore}<ChevronDown size={16} />
          </a>
        </div>
        <div className="hero-summary">
          <div className="hero-stat hero-stat-primary">
            <span><MapPin size={16} />{ui[language].waters}</span>
            <strong>{fishingSpots.length}</strong>
          </div>
          <div className="hero-stat">
            <span><CalendarDays size={16} />{ui[language].liveNow}</span>
            <strong>{activeCount}</strong>
          </div>
          <div className="intro-meta">
            <span>{ui[language].updated}</span>
            <span className="source-note"><Check size={12} />{ui[language].sourceNote}</span>
          </div>
        </div>
      </section>

      <section className="controlbar" aria-label={language === "zh" ? "搜索和筛选" : "Search and filters"}>
        <label className="searchbox">
          <Search size={18} />
          <span className="sr-only">{ui[language].search}</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={ui[language].search} />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={language === "zh" ? "清除搜索" : "Clear search"}>
              <X size={15} />
            </button>
          )}
        </label>
        <div className="filters">
          {filters.map((item) => (
            <button
              type="button"
              key={item.id}
              className={filter === item.id ? "is-active" : ""}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="result-count">
          <strong>{filtered.length}</strong> {ui[language].results}
          <span>·</span>
          <strong>{activeCount}</strong> {ui[language].active}
        </div>
      </section>

      <section className="explorer" id="explorer">
        <FishingMap spots={filtered} selected={selected} language={language} onSelect={selectSpot} />

        <aside className="water-list" aria-label={language === "zh" ? "水域列表" : "Water list"}>
          <div className="list-header">
            <div>
              <strong>{ui[language].listTitle}</strong>
              <span>{ui[language].listHint}</span>
            </div>
            <span className="list-count">{filtered.length}</span>
          </div>
          {filtered.length === 0 ? (
            <div className="empty-state">
              <Search size={26} />
              <p>{ui[language].noResults}</p>
              <button type="button" onClick={resetFilters}>{ui[language].reset}</button>
            </div>
          ) : (
            filtered.map((spot, index) => {
              const isSelected = selectedId === spot.id;
              const kind = currentKind(spot);
              const boundaryPoint = getBoundaryStart(spot);
              return (
                <article
                  className={`water-card${isSelected ? " is-selected" : ""}`}
                  key={spot.id}
                  data-spot={spot.id}
                >
                  <button
                    type="button"
                    className="water-card-summary"
                    onClick={() => setSelectedId(isSelected ? null : spot.id)}
                    aria-expanded={isSelected}
                  >
                    <span className={`list-index marker-${kind}`}>{index + 1}</span>
                    <span className="water-card-title">
                      <strong>{spot.water[language]}</strong>
                      <span>{spot.area[language]}</span>
                    </span>
                    <span className="card-meta">
                      <StatusPill kind={kind} language={language} />
                      <ChevronDown className="card-chevron" size={16} />
                    </span>
                  </button>

                  {isSelected && (
                    <div className="water-card-detail">
                      <div className="detail-heading">
                        <span>{ui[language].details}</span>
                        <button type="button" onClick={() => setSelectedId(null)} aria-label={ui[language].close}><X size={16} /></button>
                      </div>
                      <div className="area-copy">
                        <span>{ui[language].area}</span>
                        <p>{spot.area[language]}</p>
                      </div>
                      <div className={`boundary-point${boundaryPoint.kind === "reference" ? " is-reference" : ""}`}>
                        <Flag size={17} />
                        <div>
                          <span>{boundaryPoint.kind === "start" ? ui[language].boundaryStart : ui[language].referencePoint}</span>
                          <p>{boundaryPoint.label[language]}</p>
                          {boundaryPoint.approximate && <small>{ui[language].approximate}</small>}
                        </div>
                      </div>
                      <RuleList spot={spot} language={language} />
                      <div className="detail-actions">
                        <a
                          className="navigate-button"
                          href={`https://www.google.com/maps/dir/?api=1&destination=${boundaryPoint.coordinates[0]},${boundaryPoint.coordinates[1]}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Navigation size={17} />{ui[language].navigate}
                        </a>
                        <a className="official-button" href={`${sourceUrl}${spot.sourceAnchor ? `#${spot.sourceAnchor}` : ""}`} target="_blank" rel="noreferrer">
                          {ui[language].official}<ExternalLink size={15} />
                        </a>
                      </div>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </aside>
      </section>

      <section className="safety-strip">
        <div><ShieldAlert size={21} /><p>{ui[language].disclaimer}</p></div>
        <ul>
          <li>{ui[language].daylight}</li>
          <li>{ui[language].facilities}</li>
        </ul>
      </section>

      <footer>
        <span>Built from the Fisheries and Oceans Canada Region 2 salmon table.</span>
        <a href={sourceUrl} target="_blank" rel="noreferrer">DFO Pacific Region <ExternalLink size={13} /></a>
      </footer>
    </main>
  );
}
