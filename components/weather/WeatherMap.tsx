"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { geoIdentity, geoPath } from "d3-geo";
import type { FeatureCollection } from "geojson";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { provinceConfigs } from "../../lib/map-config";
import type { BoundaryResource, MapBoundary } from "../../lib/use-weather-boundaries";
import { getMockWeather, metricColor, metricConfigs, type WeatherArea, type WeatherMetric } from "../../lib/weather-data";
import { mapPerspective, perspectiveTransform, projectMapPoint } from "../../lib/map-perspective";
import MapRegion from "./MapRegion";

interface WeatherMapProps {
  resource: BoundaryResource;
  selected: WeatherArea | null;
  onSelect: (area: WeatherArea | null) => void;
  onExplore: () => void;
  onRetry: () => void;
}

export default function WeatherMap({ resource, selected, onSelect, onExplore, onRetry }: WeatherMapProps) {
  const [metric, setMetric] = useState<WeatherMetric>("temperature");
  const [hovered, setHovered] = useState<WeatherArea | null>(null);
  const [query, setQuery] = useState("");
  const [width, setWidth] = useState(1000);
  const [viewPreference, setViewPreference] = useState<"2d" | "2.5d" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const reduceMotion = useReducedMotion();
  const gridId = `map-grid-${useId().replace(/:/g, "")}`;
  const shadowId = `map-shadow-${useId().replace(/:/g, "")}`;
  const height = width < 600 ? 440 : 610;
  const focusedProvinceId = selected?.provinceId ?? null;
  const focusedProvince = provinceConfigs.find((item) => item.id === focusedProvinceId);
  const viewMode = reduceMotion ? "2d" : viewPreference ?? (width >= 640 ? "2.5d" : "2d");
  const isTilted = viewMode === "2.5d";
  const depth = isTilted ? focusedProvinceId ? 6 : 16 : 0;
  const surfaceView = useMemo(() => mapPerspective(width, height, isTilted, Boolean(focusedProvinceId)), [width, height, isTilted, focusedProvinceId]);
  const transition = { duration: reduceMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] };

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  function selectArea(area: WeatherArea | null) {
    setHovered(null);
    setQuery("");
    onSelect(area);
  }

  const geometry = useMemo(() => {
    if (resource.status !== "ready") return null;
    const collection: FeatureCollection = {
      type: "FeatureCollection",
      features: [...resource.provinces, ...resource.districts].map((item) => item.feature),
    };
    const projection = geoIdentity().reflectY(true).fitExtent([[30, 36], [width - 30, height - 36]], collection);
    const path = geoPath(projection);
    const shape = (item: MapBoundary) => ({
      ...item, d: path(item.feature) ?? "", center: path.centroid(item.feature),
    });
    return { provinces: resource.provinces.map(shape), districts: resource.districts.map(shape), path };
  }, [resource, width, height]);

  const districts = geometry?.districts.filter((item) => item.area.provinceId === focusedProvinceId) ?? [];
  const camera = useMemo(() => {
    if (!geometry || !focusedProvinceId) return { x: 0, y: 0, scale: 1 };
    const children = geometry.districts.filter((item) => item.area.provinceId === focusedProvinceId);
    if (!children.length) return { x: 0, y: 0, scale: 1 };
    const [[x0, y0], [x1, y1]] = geometry.path.bounds({ type: "FeatureCollection", features: children.map((item) => item.feature) });
    const scale = Math.min(8, (width - 64) / Math.max(x1 - x0, 1), (height - 88) / Math.max(y1 - y0, 1));
    return { scale, x: width / 2 - ((x0 + x1) / 2) * scale, y: height / 2 - ((y0 + y1) / 2) * scale };
  }, [geometry, focusedProvinceId, width, height]);

  // Screen-space labels keep their size during zoom. Omit colliding labels;
  // every district remains available through the searchable list below.
  const labels = useMemo(() => {
    if (!geometry) return [];
    const candidates = focusedProvinceId
      ? geometry.districts.filter((item) => item.area.provinceId === focusedProvinceId)
      : geometry.provinces;
    const priority = (id: string) => id === hovered?.id ? 3 : id === selected?.id ? 2 : 0;
    const ranked = [...candidates].sort((a, b) => priority(b.area.id) - priority(a.area.id));
    const occupied: { x: number; y: number; w: number; h: number }[] = [];
    return ranked.flatMap((item) => {
      const lift = isTilted ? item.area.id === hovered?.id ? focusedProvinceId ? 4 : 10 : selected?.level === "district" && item.area.id === selected.id ? 2 : 0 : 0;
      const { x, y } = projectMapPoint(item.center[0] * camera.scale + camera.x, item.center[1] * camera.scale + camera.y - lift, surfaceView);
      const w = item.area.name.length * (width < 600 ? 6.8 : 7.5) + 20;
      const h = focusedProvinceId ? 22 : 44;
      if (!Number.isFinite(x) || !Number.isFinite(y) || x - w / 2 < 4 || x + w / 2 > width - 4 || y < 15 || y + h > height) return [];
      if (occupied.some((box) => Math.abs(box.x - x) < (box.w + w) / 2 && Math.abs(box.y - y) < (box.h + h) / 2)) return [];
      occupied.push({ x, y, w, h });
      return [{ area: item.area, x, y }];
    });
  }, [geometry, focusedProvinceId, hovered, selected, camera, width, height, isTilted, surfaceView]);

  const visibleAreas = focusedProvinceId ? districts : geometry?.provinces ?? [];
  const matchingAreas = visibleAreas.filter((item) => `${item.area.name} ${item.feature.properties.shapeName}`.toLowerCase().includes(query.toLowerCase().trim()));
  const readout = hovered ?? selected;
  const readoutWeather = readout ? getMockWeather(readout) : null;
  const config = metricConfigs[metric];

  return (
    <section id="weather-map" aria-labelledby="weather-map-title" className="mb-16 scroll-mt-8">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Explore / The metropolitan atlas</p>
          <h2 id="weather-map-title" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Every area. A different story.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">สำรวจอากาศกรุงเทพฯ และปริมณฑล · เลือกจังหวัด แล้วเจาะลึกถึงเขต/อำเภอ</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-200/15 bg-amber-200/5 px-3 py-2 text-[11px] text-amber-200"><span className="h-1.5 w-1.5 rounded-full bg-amber-200" />DEMO · ไม่ใช่ข้อมูลอากาศจริง</span>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-sky-200/15 bg-[#0a1827] shadow-[0_32px_100px_-60px_#000]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-4 sm:px-7">
          <nav aria-label="เส้นทางพื้นที่" className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" onClick={() => selectArea(null)} className="rounded px-1 py-1 text-slate-400 transition hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-300">ภาพรวม</button>
            {focusedProvince && <><span className="text-slate-600">/</span><button type="button" onClick={() => selectArea(resource.status === "ready" ? resource.provinces.find((item) => item.area.id === focusedProvinceId)?.area ?? null : null)} className="rounded px-1 py-1 text-sky-200 focus-visible:outline-2 focus-visible:outline-sky-300">{focusedProvince.name}</button></>}
            {selected?.level === "district" && <><span className="text-slate-600">/</span><span aria-current="location" className="text-white">{selected.name}</span></>}
          </nav>
          <div role="group" aria-label="มุมมองแผนที่" className="flex rounded-xl border border-sky-200/15 bg-black/20 p-1">
            {(["2d", "2.5d"] as const).map((mode) => (
              <button key={mode} type="button" aria-pressed={viewMode === mode}
                disabled={mode === "2.5d" && Boolean(reduceMotion)}
                onClick={() => setViewPreference(mode)}
                title={mode === "2.5d" ? "มุมมองโมเดล ความสูงเป็นเอฟเฟกต์เท่านั้น" : "มุมมองจากด้านบน"}
                className={`min-h-9 rounded-lg px-4 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-sky-300 disabled:cursor-not-allowed disabled:opacity-40 ${viewMode === mode ? "bg-sky-200 text-slate-950 shadow-sm shadow-sky-200/20" : "text-slate-400 hover:text-sky-100"}`}>
                {mode === "2d" ? "2D" : "2.5D"}
              </button>
            ))}
          </div>
          <div role="group" aria-label="ตัวแปรอากาศ" className="flex rounded-xl border border-white/10 bg-black/15 p-1">
            {(Object.keys(metricConfigs) as WeatherMetric[]).map((key) => <button type="button" key={key} aria-pressed={metric === key} onClick={() => setMetric(key)} className={`rounded-lg px-3 py-2 text-xs transition focus-visible:outline-2 focus-visible:outline-sky-300 ${metric === key ? "bg-sky-300/15 text-sky-200" : "text-slate-400 hover:text-white"}`}>{metricConfigs[key].name}</button>)}
          </div>
        </div>

        <div ref={containerRef} className="relative isolate w-full overflow-hidden bg-[radial-gradient(ellipse_at_center,#19384a_0%,#0a1827_72%)]">
          <div className="pointer-events-none absolute left-5 top-5 z-10 text-[10px] uppercase tracking-[0.2em] text-slate-400 sm:left-8"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-sky-300" />{focusedProvinceId ? `${districts.length} districts` : "06 provinces · 79 districts"}</div>
          <div className="pointer-events-none absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-sky-200/15 text-[10px] text-slate-300">N ↑</div>

          {resource.status === "loading" && <div role="status" className="flex min-h-[420px] items-center justify-center gap-3 text-sm text-sky-200"><span className="h-4 w-4 animate-spin rounded-full border border-sky-300/20 border-t-sky-300 motion-reduce:animate-none" />กำลังเตรียมแผนที่…</div>}
          {resource.status === "error" && <div role="alert" className="flex min-h-[420px] flex-col items-center justify-center gap-4 px-6 text-center"><p className="text-sm text-rose-200">{resource.message}</p><button type="button" onClick={onRetry} className="rounded-lg border border-white/20 px-4 py-2 text-sm">ลองโหลดใหม่</button></div>}

          {geometry && <svg viewBox={`0 0 ${width} ${height}`} style={{ aspectRatio: `${width} / ${height}` }} className="block w-full" role="group" aria-label={focusedProvince ? `เลือกเขตหรืออำเภอใน${focusedProvince.name}` : "เลือกจังหวัดบนแผนที่"}>
            <defs>
              <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.7" fill="#8cb4ca" opacity="0.13" /></pattern>
              <filter id={shadowId} x="-40%" y="-40%" width="180%" height="200%" colorInterpolationFilters="sRGB">
                <feDropShadow dx="0" dy="12" stdDeviation="11" floodColor="#00050e" floodOpacity="0.75" />
              </filter>
            </defs>
            <rect width={width} height={height} fill={`url(#${gridId})`} />
            <motion.g initial={false} animate={{ transform: perspectiveTransform(surfaceView) }} transition={transition} style={{ originX: 0, originY: 0, transformBox: "view-box" }}>
            <motion.g initial={false} animate={{ transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }} transition={transition} style={{ originX: 0, originY: 0, transformBox: "view-box" }}>
              {/* All sides have equal depth: elevation is decorative, never weather data. */}
              <g pointerEvents="none" aria-hidden="true">
                <motion.g initial={false} animate={{ y: depth / camera.scale, opacity: isTilted ? 0.7 : 0 }} transition={transition} filter={`url(#${shadowId})`}>
                  {(focusedProvinceId ? districts : geometry.provinces).map((item) => <path key={`shadow-${item.area.id}`} d={item.d} fill="#000a13" />)}
                </motion.g>
                {[1, 0.8, 0.6, 0.4, 0.2].map((layer) => (
                  <motion.g key={layer} initial={false} animate={{ y: depth * layer / camera.scale, opacity: isTilted ? 1 : 0 }} transition={transition}>
                    {(focusedProvinceId ? districts : geometry.provinces).map((item) => <path key={item.area.id} d={item.d} fill={layer > 0.6 ? "#112b3c" : "#244b5d"} stroke="#31596a" strokeOpacity={0.4} strokeWidth={0.5} vectorEffect="non-scaling-stroke" />)}
                  </motion.g>
                ))}
              </g>
              {geometry.provinces.map((item) => {
                const value = getMockWeather(item.area)[metric];
                return <MapRegion key={item.area.id} area={item.area} path={item.d} color={metricColor(value, metric)} value={value} unit={config.unit} selected={false} hovered={hovered?.id === item.area.id} interactive={!focusedProvinceId} focused={false} lift={isTilted && hovered?.id === item.area.id ? 10 : 0} scale={camera.scale} reducedMotion={Boolean(reduceMotion)} onSelect={selectArea} onHover={setHovered} onKeyboardSelect={(area) => { selectArea(area); requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true })); }} />;
              })}
              <AnimatePresence mode="wait">
                {focusedProvinceId && <motion.g key={focusedProvinceId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.25 }}>
                  {districts.map((item) => {
                    const value = getMockWeather(item.area)[metric];
                    const active = selected?.id === item.area.id;
                    return <MapRegion key={item.area.id} area={item.area} path={item.d} color={metricColor(value, metric)} value={value} unit={config.unit} selected={active} hovered={hovered?.id === item.area.id} interactive focused lift={isTilted ? hovered?.id === item.area.id ? 4 : active ? 2 : 0 : 0} scale={camera.scale} reducedMotion={Boolean(reduceMotion)} onSelect={selectArea} onHover={setHovered} onKeyboardSelect={selectArea} />;
                  })}
                </motion.g>}
              </AnimatePresence>
              {[...geometry.provinces, ...districts].filter((item) => item.area.id === hovered?.id || (selected?.level === "district" && item.area.id === selected.id)).map((item) => (
                <motion.path key={`outline-${item.area.id}`} d={item.d} initial={false}
                  animate={{ y: -(isTilted ? hovered?.id === item.area.id ? focusedProvinceId ? 4 : 10 : 2 : 0) / camera.scale }}
                  transition={{ duration: reduceMotion ? 0 : 0.24 }}
                  fill="none" stroke="#e0f7ff" strokeWidth={2} vectorEffect="non-scaling-stroke" pointerEvents="none" />
              ))}
            </motion.g>
            </motion.g>

            <AnimatePresence mode="wait">
              <motion.g key={`${viewMode}-${focusedProvinceId ?? "overview"}-${Math.round(width)}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.2, delay: reduceMotion ? 0 : 0.4 }} pointerEvents="none" aria-hidden="true">
                {labels.map(({ area, x, y }) => <motion.g key={area.id} initial={false} animate={{ x, y }} transition={transition}><text x={0} y={0} textAnchor="middle" dominantBaseline="middle" fontSize={width < 600 ? 11 : 12} fontWeight={600} fill="#f0f9ff" stroke="#0a1929" strokeWidth={3} strokeLinejoin="round" paintOrder="stroke"><tspan x={0}>{area.name}</tspan>{!focusedProvinceId && <tspan x={0} dy={21} fontSize={17}>{getMockWeather(area)[metric]}{config.unit}</tspan>}</text></motion.g>)}
              </motion.g>
            </AnimatePresence>
          </svg>}

          <AnimatePresence>
            {readout && readoutWeather && <motion.div key={readout.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.15 }} className="pointer-events-none absolute bottom-4 left-4 z-10 max-w-[calc(100%-2rem)] rounded-xl border border-sky-200/15 bg-[#07111f]/95 px-4 py-3 shadow-xl backdrop-blur-md sm:bottom-5 sm:left-7"><p className="text-xs text-slate-400">{readout.level === "district" ? readout.provinceName : "จุดอ้างอิงจังหวัด"} · ข้อมูลสมมติ</p><p className="mt-1 text-sm font-medium text-white">{readout.name}<span className="ml-4 text-sky-200">{readoutWeather[metric]}{config.unit}</span></p></motion.div>}
          </AnimatePresence>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.07] px-4 py-4 sm:px-7">
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400"><span>{config.name} ({config.unit})</span>{config.colors.map((color, index) => <span key={color} className="inline-flex items-center gap-1.5"><span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: color }} />{config.labels[index]}</span>)}</div>
          {focusedProvinceId ? <button type="button" onClick={() => selectArea(null)} className="rounded-lg px-2 py-1 text-xs text-sky-200 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-sky-300">↖ กลับสู่ภาพรวม</button> : <span className="text-[11px] text-slate-500">กดจังหวัดเพื่อสำรวจพื้นที่ ↗</span>}
        </div>

        <div className="border-t border-white/[0.07] bg-black/10 px-4 py-5 sm:px-7">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="province-select" className="text-xs text-slate-400">จังหวัด</label>
            <select id="province-select" aria-label="เลือกจังหวัด" value={focusedProvinceId ?? ""} disabled={resource.status !== "ready"} onChange={(event) => selectArea(resource.status === "ready" ? resource.provinces.find((item) => item.area.id === event.target.value)?.area ?? null : null)} className="min-h-10 rounded-lg border border-white/15 bg-[#102034] px-3 text-sm text-slate-200 focus:outline-sky-300 disabled:opacity-50"><option value="">ภาพรวม 6 จังหวัด</option>{provinceConfigs.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
            {focusedProvinceId && <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="ค้นหาเขต / อำเภอ" aria-label="ค้นหาเขตหรืออำเภอในจังหวัดที่เลือก" className="min-h-10 min-w-0 flex-1 basis-full rounded-lg border border-white/15 bg-[#102034] px-3 text-sm text-white placeholder:text-slate-500 focus:outline-sky-300 sm:basis-0" />}
            {selected && <button type="button" onClick={onExplore} className="ml-auto min-h-10 rounded-lg bg-sky-200 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">ดูข้อมูลพื้นที่นี้ ↓</button>}
          </div>
          {focusedProvinceId && <><p className="mt-4 text-[11px] text-slate-500">เลือกบนแผนที่หรือจากรายการ · {matchingAreas.length} พื้นที่</p><div role="group" aria-label="เขตและอำเภอในจังหวัดที่เลือก" className="mt-3 flex max-h-36 flex-wrap gap-2 overflow-y-auto p-1">{matchingAreas.map((item) => <button type="button" key={item.area.id} aria-pressed={selected?.id === item.area.id} onClick={() => selectArea(item.area)} className={`rounded-lg border px-3 py-2 text-xs transition focus-visible:outline-2 focus-visible:outline-sky-300 ${selected?.id === item.area.id ? "border-sky-200/60 bg-sky-200/15 text-sky-100" : "border-white/10 text-slate-400 hover:border-white/25 hover:text-white"}`}>{item.area.name}</button>)}{matchingAreas.length === 0 && <p role="status" className="py-3 text-sm text-slate-400">ไม่พบชื่อพื้นที่ ลองค้นหาใหม่</p>}</div></>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-between gap-2 text-[10px] leading-5 text-slate-500"><p>สีแทนค่าของจุดอ้างอิงสมมติ ไม่ใช่ข้อมูลทั่วทั้งพื้นที่หรือระดับเตือนภัย · เส้นขอบลดรายละเอียด · ความสูงในโหมด 2.5D เป็นเอฟเฟกต์เท่านั้น</p><p><a href="https://www.geoboundaries.org/" target="_blank" rel="noreferrer" className="underline hover:text-sky-200">geoBoundaries</a> · จังหวัด 2017: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline hover:text-sky-200">© OSM / ODbL</a> · เขต/อำเภอ 2019: <a href="https://data.humdata.org/dataset/thailand-administrative-boundaries" target="_blank" rel="noreferrer" className="underline hover:text-sky-200">RTSD / OCHA · CC BY 3.0 IGO</a></p></div>
    </section>
  );
}
