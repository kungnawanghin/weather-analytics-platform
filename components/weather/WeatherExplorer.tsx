"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useWeatherBoundaries } from "../../lib/use-weather-boundaries";
import { getMockWeather, provinceArea, type WeatherArea } from "../../lib/weather-data";
import WeatherMap from "./WeatherMap";
import WeatherAnalytics from "./WeatherAnalytics";
import LiveWeather from "./LiveWeather";
import { latPhrao } from "../../lib/live-weather";

export default function WeatherExplorer() {
  // One selection controls the map, current conditions, and historical chart.
  const [selected, setSelected] = useState<WeatherArea | null>(latPhrao.area);
  const { resource, retry } = useWeatherBoundaries();
  const detailsRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const area = selected ?? provinceArea("TH-10");
  const weather = getMockWeather(area);

  function exploreDetails() {
    const element = detailsRef.current;
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
  }

  return (
    <>
      <div className="mb-10 flex flex-wrap items-center justify-between gap-5 border-b border-white/10 pb-6">
        <div><p className="eyebrow">The weather observatory</p><p className="mt-2 text-sm text-slate-400">หนึ่งแผนที่ หลายมุมมองของอากาศรอบตัวคุณ</p></div>
        <div className="flex gap-6 text-xs text-slate-400"><span><strong className="mr-2 text-lg font-normal tabular-nums text-sky-100">06</strong>จังหวัด</span><span><strong className="mr-2 text-lg font-normal tabular-nums text-sky-100">79</strong>เขต / อำเภอ</span></div>
      </div>
      <WeatherMap resource={resource} selected={selected} onSelect={setSelected} onExplore={exploreDetails} onRetry={retry} />
      <div id="weather-details" ref={detailsRef} tabIndex={-1} aria-label={`ข้อมูลอากาศ ${weather.location}`} className="scroll-mt-8 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50">
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <p className="text-sm text-slate-400">{selected ? "ข้อมูลพื้นที่ที่เลือก" : "เริ่มต้นแสดงจุดอ้างอิงกรุงเทพฯ · เลือกพื้นที่อื่นบนแผนที่ได้"}<span className="ml-2 text-sky-200">{weather.location}</span></p>
          <a href="#weather-map" className="rounded px-2 py-1 text-xs text-sky-300 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-300">กลับไปแผนที่ ↑</a>
        </div>
        <p className="mb-6 text-xs leading-6 text-slate-400">Current Weather และพยากรณ์ใช้ Open-Meteo ตามจุดอ้างอิงพื้นที่ที่เลือก · สีและตัวเลขบนแผนที่ รวมถึง Analytics ยังเป็นข้อมูลสมมติ</p>
        <LiveWeather key={area.id} area={area} />
        <WeatherAnalytics weather={weather} />
      </div>
      <footer className="mt-20 flex flex-wrap items-center justify-between gap-5 border-t border-white/10 pt-7 text-xs leading-6 text-slate-400">
        <div><p className="font-medium tracking-[.12em] text-slate-200">BEYOND THE FORECAST.</p><p className="mt-1">Weather, with a little more perspective.</p></div>
        <p>กรุงเทพมหานครและปริมณฑล · Portfolio project<br/>Current Weather / Forecast ทุกพื้นที่จาก Open-Meteo · สีและตัวเลขบนแผนที่กับ Analytics ยังใช้ข้อมูลสมมติ</p>
        <a href="#top" className="rounded-full border border-white/15 px-4 py-2 text-sky-200 transition hover:bg-white/5">กลับด้านบน ↑</a>
      </footer>
    </>
  );
}
