"use client";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ExternalLink,
  Fish,
  Flag,
  Globe,
  Languages,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Satellite,
  Search,
  ShieldAlert,
  Sparkles,
  Waves,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  currentKind,
  defaultRegionId,
  fishingSpots,
  getBoundaryStart,
  isRuleActive,
  regionById,
  regionExtents,
  regions,
  type FishingSpot,
  type Language,
  type Species,
} from "./fishing-data";
import { waterwayPaths } from "./waterway-paths";

type Filter = "all" | "today" | "closures" | Species;
type Basemap = "street" | "satellite";

// Region 2's reaches are hand verified; the other regions are generated from the
// DFO tables and carry no geometry yet, so the map has to cover all of BC and
// tolerate rows that cannot be placed.
const speciesFilters: Species[] = ["Chinook", "Coho", "Sockeye", "Pink", "Chum"];

// Esri serves the imagery tiles with a matching label overlay, so place names
// stay readable once the street basemap is swapped out.
const basemapTiles = {
  street: [
    {
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  ],
  satellite: [
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      attribution: 'Imagery © <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    },
    {
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
      attribution: "",
    },
  ],
} as const;

const ui = {
  en: {
    eyebrow: "DFO freshwater salmon regions",
    title: "Salmon Water Guide",
    subtitle: "Explore listed salmon opportunities, boundaries and limits—without wrestling with a giant table.",
    search: "Search water or boundary…",
    all: "All waters",
    today: "Listed today",
    closures: "Closures",
    results: "DFO waters",
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
    pending: "To be determined by DFO",
    disclaimer:
      "Red lines are clipped to the boundaries the DFO table names, or show the whole mapped channel where the table lists a water with no specific area. They follow OpenStreetMap geometry for visual guidance and are not legal boundaries. Waters DFO does not locate stay text-and-marker only. Confirm written areas, notices, provincial rules and posted signs.",
    sourceNote: "Salmon rules only",
    locate: "Show my location",
    waters: "listed waters",
    liveNow: "with a current listing",
    listTitle: "Water directory",
    listHint: "Select a water to see boundaries and limits",
    explore: "Explore the map",
    boundaryStart: "Boundary start",
    referencePoint: "Water reference",
    approximate: "Approximate—confirm posted signs",
    highlightedRange: "Highlighted regulation reach",
    textOnlyRange: "DFO text only · no inferred boundary line",
    rangeStart: "Start",
    rangeEnd: "End",
    closedRange: "Highlighted no-salmon-fishing reach",
    entireRange: "DFO lists this whole water · full mapped channel shown",
    regionTitle: "Region-wide DFO rules",
    region: "DFO region",
    regionEmpty: "DFO publishes no water-by-water table for this region—the region-wide rules below are the whole listing.",
    unlocated: "Not located yet · regulations from the DFO table only",
    unmapped: "waters in this region are not on the map yet",
    regionUnmapped: "This region's waters are not drawn yet · regulations are listed in full",
    section: "Table section",
    note: "DFO note",
    basemap: "Base map",
    basemapStreet: "Street",
    basemapSatellite: "Satellite",
    tileError: "Base map tiles failed to load—check your connection",
  },
  zh: {
    eyebrow: "DFO 淡水三文鱼分区",
    title: "三文鱼钓场指南",
    subtitle: "把官方表格变成好查、好懂、可导航的钓场地图。",
    search: "搜索河流、湖泊或边界…",
    all: "全部水域",
    today: "在表列日期内",
    chinook: "帝王鲑",
    coho: "银鲑",
    closures: "禁钓区域",
    results: "个 DFO 水域",
    active: "个在表列日期内",
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
    closed: "禁止垂钓三文鱼",
    pending: "DFO 尚未公布，待定",
    disclaimer: "红线严格裁剪到 DFO 表格写明的边界；表格未写具体范围时，红线覆盖该水域已测绘的全部主河道。红线基于 OpenStreetMap 几何，仅供直观参考，并非法律边界。DFO 未给出可定位范围的条目只显示文字与位置标记。出发前请核对文字范围、季中公告、省级规定及现场标志。",
    sourceNote: "仅限三文鱼规定",
    locate: "显示我的位置",
    waters: "个 DFO 水域",
    liveNow: "个在表列日期内",
    listTitle: "水域目录",
    listHint: "选择水域查看边界与限额",
    explore: "开始查看地图",
    boundaryStart: "区域起点",
    referencePoint: "水域参考点",
    approximate: "约略位置，请以现场标志为准",
    highlightedRange: "红线为当前规定河段",
    textOnlyRange: "仅按 DFO 文字说明，不推测绘制边界",
    rangeStart: "起点",
    rangeEnd: "终点",
    closedRange: "高亮河段禁止垂钓三文鱼",
    entireRange: "DFO 表格列出整条水域 · 已绘制全部主河道",
    regionTitle: "全区通用 DFO 规定",
    region: "DFO 区域",
    regionEmpty: "DFO 未为本区发布逐条水域表格，下方全区规定即为全部内容。",
    unlocated: "尚未定位 · 仅显示 DFO 表格中的规定",
    unmapped: "个水域尚未标注到地图上",
    regionUnmapped: "本区水域尚未绘制到地图 · 规定已完整列出",
    section: "表格分节",
    note: "DFO 提示",
    basemap: "底图",
    basemapStreet: "街道图",
    basemapSatellite: "卫星影像",
    tileError: "底图瓦片加载失败，请检查网络",
  },
} as const;

const speciesName: Record<Language, Record<Species, string>> = {
  en: {
    Chinook: "Chinook",
    Coho: "Coho",
    Sockeye: "Sockeye",
    Pink: "Pink",
    Chum: "Chum",
    Steelhead: "Steelhead",
    Eulachon: "Eulachon",
    All: "All salmon",
  },
  zh: {
    Chinook: "帝王鲑",
    Coho: "银鲑",
    Sockeye: "红鲑",
    Pink: "粉鲑",
    Chum: "狗鲑",
    Steelhead: "虹鳟",
    Eulachon: "油胡瓜鱼",
    All: "所有三文鱼",
  },
};

const statusRank: Record<ReturnType<typeof currentKind>, number> = {
  closed: 0,
  retain: 1,
  release: 2,
  gear: 3,
  pending: 4,
  inactive: 5,
};

function markerClass(kind: ReturnType<typeof currentKind>, selected: boolean) {
  return `map-marker marker-${kind}${selected ? " is-selected" : ""}`;
}

function FishingMap({
  spots,
  selected,
  language,
  regionId,
  onSelect,
}: {
  spots: FishingSpot[];
  selected: FishingSpot | null;
  language: Language;
  regionId: string;
  onSelect: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const markerLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const waterwayLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const locationLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const baseLayersRef = useRef<Record<Basemap, import("leaflet").TileLayer[]> | null>(null);
  // Counts map instances rather than flagging readiness: a hot update rebuilds
  // the map while React keeps state, and a boolean would stop re-running the
  // layer effects below, leaving the new map empty.
  const [mapEpoch, setMapEpoch] = useState(0);
  const [locationError, setLocationError] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [basemap, setBasemap] = useState<Basemap>("street");

  useEffect(() => {
    let active = true;
    void import("leaflet").then(({ default: leaflet }) => {
      if (!active || !containerRef.current || mapRef.current) return;
      leafletRef.current = leaflet;
      // Wide enough for every DFO freshwater region, from the Okanagan across
      // to Haida Gwaii and up the Skeena.
      const map = leaflet.map(containerRef.current, {
        zoomControl: false,
        minZoom: 5,
        maxBounds: [
          [47.5, -140.5],
          [61.0, -112.5],
        ],
      }).setView([49.45, -122.72], 8);

      // Both basemaps stop at z18: past that the imagery only exists over the
      // towns and returns a placeholder tile over the backcountry reaches.
      const build = (tiles: readonly { url: string; attribution: string }[]) =>
        tiles.map(({ url, attribution }, index) =>
          leaflet
            .tileLayer(url, { attribution, maxZoom: 18, zIndex: index + 1 })
            .on("tileerror", () => setTileError(true)),
        );
      baseLayersRef.current = {
        street: build(basemapTiles.street),
        satellite: build(basemapTiles.satellite),
      };
      leaflet.control.zoom({ position: "bottomright" }).addTo(map);
      waterwayLayerRef.current = leaflet.layerGroup().addTo(map);
      markerLayerRef.current = leaflet.layerGroup().addTo(map);
      locationLayerRef.current = leaflet.layerGroup().addTo(map);
      mapRef.current = map;
      setMapEpoch((epoch) => epoch + 1);
      requestAnimationFrame(() => map.invalidateSize());
    });

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layers = baseLayersRef.current;
    if (!map || !layers) return;
    const previous = basemap === "street" ? layers.satellite : layers.street;
    previous.forEach((layer) => layer.remove());
    layers[basemap].forEach((layer) => {
      if (!map.hasLayer(layer)) layer.addTo(map);
    });
  }, [basemap, mapEpoch]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    // Regions whose waters are not located yet would otherwise leave the camera
    // over the region the reader just left.
    if (spots.some((spot) => getBoundaryStart(spot))) return;
    const extent = regionExtents[regionId];
    if (extent) map.fitBounds(L.latLngBounds(extent), { padding: [22, 22] });
  }, [regionId, spots, mapEpoch]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();

    spots.forEach((spot, index) => {
      const kind = currentKind(spot);
      const point = getBoundaryStart(spot);
      // Waters DFO describes but we have not located keep their list number so
      // the numbering still lines up; they simply get no marker.
      if (!point) return;
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

    const placed = spots
      .map((spot) => getBoundaryStart(spot)?.coordinates)
      .filter((value): value is [number, number] => Boolean(value));
    if (placed.length > 1 && !selected) {
      map.fitBounds(L.latLngBounds(placed), { padding: [34, 34], maxZoom: 9 });
    }

  }, [spots, selected, language, onSelect, mapEpoch]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = waterwayLayerRef.current;
    if (!L || !map || !layer) return;
    layer.clearLayers();
    if (!selected) return;

    const waterway = waterwayPaths[selected.id];
    if (!waterway?.paths.length) {
      const point = getBoundaryStart(selected);
      if (point) map.flyTo(point.coordinates, Math.max(map.getZoom(), 11), { duration: 0.65 });
      return;
    }

    const selectedKind = currentKind(selected);
    const closed = selectedKind === "closed";
    waterway.paths.forEach((path) => {
      L.polyline(path, {
        color: "#ffffff",
        weight: 11,
        opacity: 0.94,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(layer);
      L.polyline(path, {
        color: closed ? "#7f1d1d" : "#dc2626",
        weight: 7,
        opacity: 0.94,
        dashArray: closed ? "12 9" : undefined,
        lineCap: "round",
        lineJoin: "round",
        interactive: false,
      }).addTo(layer);
    });

    // On a phone the two labels of a short reach are wider than the gap between
    // their points, so the start label drops below its point to clear the end.
    const narrowMap = map.getSize().x < 520;
    waterway.endpoints.forEach((endpoint) => {
      const below = narrowMap && endpoint.role === "start";
      L.circleMarker(endpoint.coordinates, {
        radius: 7,
        color: "#ffffff",
        weight: 3,
        fillColor: closed ? "#7f1d1d" : "#dc2626",
        fillOpacity: 1,
      })
        .bindTooltip(
          `${endpoint.role === "start" ? ui[language].rangeStart : ui[language].rangeEnd} · ${endpoint.label[language]}`,
          {
            permanent: true,
            direction: below ? "bottom" : "top",
            offset: [0, below ? 7 : -7],
            className: "range-endpoint-tooltip",
          },
        )
        .addTo(layer);
    });

    const bounds = L.latLngBounds(waterway.paths.flat());
    // DFO measures a few reaches in metres. At the zoom that suits a 40 km river
    // those are a couple of pixels long, so close in on a short one instead.
    const spanMetres = bounds.getNorthWest().distanceTo(bounds.getSouthEast());
    // Those labels are centred on their point, so a phone-width map needs side
    // room or they are clipped by the map edge.
    map.fitBounds(bounds, {
      padding: narrowMap ? [80, 46] : [48, 48],
      maxZoom: spanMetres < 400 ? 16 : spanMetres < 2000 ? 14 : 13,
      animate: true,
      duration: 0.65,
    });
  }, [selected, language, mapEpoch]);

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
    <div className={`map-wrap${basemap === "satellite" ? " is-satellite" : ""}`}>
      {/* Leaflet adds its own classes to this node, so its className has to stay
          a constant: re-rendering it would wipe leaflet-container and with it
          the tile sizing rules. Basemap styling hangs off .map-wrap instead. */}
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label={language === "zh" ? "钓场互动地图" : "Interactive fishing map"}
      />
      <div className="map-topline">
        <span><MapPin size={15} />{ui[language].mapHint}</span>
        <div className="map-controls">
          <div className="basemap-switch" role="group" aria-label={ui[language].basemap}>
            {(["street", "satellite"] as const).map((option) => {
              const label = option === "street" ? ui[language].basemapStreet : ui[language].basemapSatellite;
              return (
                <button
                  key={option}
                  type="button"
                  className={basemap === option ? "is-active" : undefined}
                  onClick={() => {
                    setTileError(false);
                    setBasemap(option);
                  }}
                  aria-pressed={basemap === option}
                  aria-label={label}
                >
                  {option === "street" ? <MapIcon size={15} /> : <Satellite size={15} />}
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <button type="button" className="map-location-button" onClick={locate} aria-label={ui[language].locate}>
            <LocateFixed size={17} />
          </button>
        </div>
      </div>
      {locationError && (
        <div className="location-error">{language === "zh" ? "无法读取当前位置" : "Location unavailable"}</div>
      )}
      {tileError && <div className="location-error is-tile-error">{ui[language].tileError}</div>}
      {!spots.some((spot) => getBoundaryStart(spot)) && (
        <div className="range-status is-text-only">
          <MapPin size={15} />
          {ui[language].regionUnmapped}
        </div>
      )}
      {selected && (
        <div
          className={`range-status${!waterwayPaths[selected.id]?.paths.length ? " is-text-only" : ""}${currentKind(selected) === "closed" ? " is-closed" : ""}`}
        >
          {waterwayPaths[selected.id]?.paths.length
            ? <span className="range-line-swatch" />
            : <MapPin size={15} />}
          {!waterwayPaths[selected.id]?.paths.length
            ? ui[language].textOnlyRange
            : currentKind(selected) === "closed"
              ? ui[language].closedRange
              : waterwayPaths[selected.id]?.entire
                ? ui[language].entireRange
                : ui[language].highlightedRange}
        </div>
      )}
      <div className="map-legend" aria-label={language === "zh" ? "地图图例" : "Map legend"}>
        <span className="boundary-legend"><i>{language === "zh" ? "起" : "S"}</i>{ui[language].boundaryStart}</span>
        <span className="boundary-legend is-reference"><i>{language === "zh" ? "参" : "R"}</i>{ui[language].referencePoint}</span>
        {(["retain", "release", "gear", "closed", "pending", "inactive"] as const).map((kind) => (
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
          <div className={`rule-row rule-${item.kind}${active ? " is-active" : ""}`} key={`${item.species.join("-")}-${index}`}>
            <div className="rule-species">
              <Fish size={16} />
              <strong>{item.species.map((name) => speciesName[language][name]).join(language === "zh" ? "、" : ", ")}</strong>
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
  const [regionId, setRegionId] = useState(defaultRegionId);
  const [selectedId, setSelectedId] = useState<string | null>("alouette-upper");

  useEffect(() => {
    const saved = window.localStorage.getItem("salmon-guide-language");
    if (saved === "en" || saved === "zh") setLanguage(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("salmon-guide-language", language);
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  }, [language]);

  const region = regionById(regionId);
  const regionSpots = useMemo(
    () => fishingSpots.filter((spot) => spot.region === regionId),
    [regionId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase();
    return regionSpots
      .filter((spot) => {
        const searchable = `${spot.water.en} ${spot.water.zh} ${spot.area.en} ${spot.area.zh}`.toLocaleLowerCase();
        if (needle && !searchable.includes(needle)) return false;
        if (filter === "today") return spot.rules.some((item) => isRuleActive(item));
        if (filter === "closures") return spot.rules.some((item) => item.kind === "closed");
        if (filter !== "all") {
          // "All" rows cover every species, so they answer a species filter too.
          return spot.rules.some(
            (item) => item.species.includes(filter) || item.species.includes("All"),
          );
        }
        return true;
      })
      .sort((a, b) => {
        const status = statusRank[currentKind(a)] - statusRank[currentKind(b)];
        return status || a.water[language].localeCompare(b.water[language], language === "zh" ? "zh-CN" : "en-CA");
      });
  }, [filter, language, query, regionSpots]);

  const selected = regionSpots.find((spot) => spot.id === selectedId) ?? null;
  const activeCount = regionSpots.filter((spot) => spot.rules.some((item) => isRuleActive(item))).length;
  const unmappedCount = regionSpots.filter((spot) => !getBoundaryStart(spot)).length;

  const changeRegion = (nextId: string) => {
    setRegionId(nextId);
    setSelectedId(null);
    setFilter("all");
    setQuery("");
  };

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

  // Only offer a species chip when the region actually lists that species.
  const regionSpecies = speciesFilters.filter((species) =>
    regionSpots.some((spot) => spot.rules.some((item) => item.species.includes(species))),
  );

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: ui[language].all },
    { id: "today", label: ui[language].today },
    ...regionSpecies.map((species) => ({ id: species as Filter, label: speciesName[language][species] })),
    { id: "closures", label: ui[language].closures },
  ];

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Waves size={21} /></div>
          <div className="brand-copy">
            <span>{`${language === "zh" ? "DFO 第 " + region.id + " 区" : "DFO Region " + region.id} · ${region.name[language]}`}</span>
            <strong>{language === "zh" ? "BC 三文鱼地图" : "BC Salmon Map"}</strong>
          </div>
        </div>
        <div className="topbar-spacer" />
        <a className="source-link" href={region.sourceUrl} target="_blank" rel="noreferrer">
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
            <strong>{regionSpots.length}</strong>
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
        <label className="region-picker">
          <span className="sr-only">{ui[language].region}</span>
          <Globe size={17} />
          <select value={regionId} onChange={(event) => changeRegion(event.target.value)}>
            {regions.map((item) => (
              <option key={item.id} value={item.id}>
                {`${language === "zh" ? "第 " + item.id + " 区" : "Region " + item.id} · ${item.name[language]} (${item.waters})`}
              </option>
            ))}
          </select>
          <ChevronDown size={15} />
        </label>
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
        <FishingMap
          spots={filtered}
          selected={selected}
          language={language}
          regionId={regionId}
          onSelect={selectSpot}
        />

        <aside className="water-list" aria-label={language === "zh" ? "水域列表" : "Water list"}>
          <div className="list-header">
            <div>
              <strong>{ui[language].listTitle}</strong>
              <span>{ui[language].listHint}</span>
            </div>
            <span className="list-count">{filtered.length}</span>
          </div>
          {unmappedCount > 0 && (
            <p className="list-notice">
              <MapPin size={14} />
              {language === "zh"
                ? `${unmappedCount} ${ui.zh.unmapped}`
                : `${unmappedCount} ${ui.en.unmapped}`}
            </p>
          )}
          {regionSpots.length === 0 ? (
            // Region 5 publishes prose instead of a table, so there is nothing
            // to filter and the region-wide rules below are the full listing.
            <div className="empty-state">
              <ShieldAlert size={26} />
              <p>{ui[language].regionEmpty}</p>
            </div>
          ) : filtered.length === 0 ? (
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
              const waterway = waterwayPaths[spot.id];
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
                    <span className={`list-index marker-${kind}`}><b>{index + 1}</b></span>
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
                      {spot.section && (
                        <div className="area-copy">
                          <span>{ui[language].section}</span>
                          <p>{spot.section[language]}</p>
                        </div>
                      )}
                      <div className="area-copy">
                        <span>{ui[language].area}</span>
                        <p>{spot.area[language]}</p>
                      </div>
                      {spot.notes?.map((note) => (
                        <div className="area-copy" key={note.en}>
                          <span>{ui[language].note}</span>
                          <p>{note[language]}</p>
                        </div>
                      ))}
                      {boundaryPoint ? (
                        <div className={`boundary-point${boundaryPoint.kind === "reference" ? " is-reference" : ""}`}>
                          <Flag size={17} />
                          <div>
                            <span>{boundaryPoint.kind === "start" ? ui[language].boundaryStart : ui[language].referencePoint}</span>
                            <p>{boundaryPoint.label[language]}</p>
                            {boundaryPoint.approximate && <small>{ui[language].approximate}</small>}
                          </div>
                        </div>
                      ) : (
                        <div className="boundary-point is-unlocated">
                          <MapPin size={17} />
                          <div>
                            <span>{ui[language].unlocated}</span>
                          </div>
                        </div>
                      )}
                      {boundaryPoint && waterway?.endpoints
                        .filter(
                          (endpoint) =>
                            endpoint.coordinates[0] !== boundaryPoint.coordinates[0] ||
                            endpoint.coordinates[1] !== boundaryPoint.coordinates[1],
                        )
                        .map((endpoint) => (
                          <div
                            className="boundary-point boundary-end"
                            key={`${endpoint.coordinates[0]},${endpoint.coordinates[1]}`}
                          >
                            <MapPin size={17} />
                            <div>
                              <span>
                                {endpoint.role === "start" ? ui[language].rangeStart : ui[language].rangeEnd}
                              </span>
                              <p>{endpoint.label[language]}</p>
                              {endpoint.approximate && <small>{ui[language].approximate}</small>}
                            </div>
                          </div>
                        ))}
                      <RuleList spot={spot} language={language} />
                      <div className="detail-actions">
                        {boundaryPoint && (
                          <a
                            className="navigate-button"
                            href={`https://www.google.com/maps/dir/?api=1&destination=${boundaryPoint.coordinates[0]},${boundaryPoint.coordinates[1]}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Navigation size={17} />{ui[language].navigate}
                          </a>
                        )}
                        <a className="official-button" href={`${region.sourceUrl}${spot.sourceAnchor ? `#${spot.sourceAnchor}` : ""}`} target="_blank" rel="noreferrer">
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
        <div className="region-rules">
          <strong>{ui[language].regionTitle}</strong>
          <ul>
            {region.notes.map((item) => (
              <li key={item.en}>{item[language]}</li>
            ))}
          </ul>
        </div>
      </section>

      <footer>
        <span>Built from the Fisheries and Oceans Canada recreational salmon tables.</span>
        <a href={region.sourceUrl} target="_blank" rel="noreferrer">DFO Pacific Region <ExternalLink size={13} /></a>
      </footer>
    </main>
  );
}
