"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { useWeatherBoundaries } from "../../lib/use-weather-boundaries";
import { getMockWeather, provinceArea, type WeatherArea } from "../../lib/weather-data";
import WeatherMap from "./WeatherMap";
import CurrentWeather from "./CurrentWeather";
import WeatherAnalytics from "./WeatherAnalytics";

export default function WeatherExplorer() {
  // One selection controls the map, current conditions, and historical chart.
  const [selected, setSelected] = useState<WeatherArea | null>(null);
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
      <WeatherMap resource={resource} selected={selected} onSelect={setSelected} onExplore={exploreDetails} onRetry={retry} />
      <div id="weather-details" ref={detailsRef} tabIndex={-1} aria-label={`ข้อมูลอากาศ ${weather.location}`} className="scroll-mt-8 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sky-300/50">
        <div role="status" className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <p className="text-sm text-slate-400">{selected ? "ข้อมูลพื้นที่ที่เลือก" : "เริ่มต้นแสดงจุดอ้างอิงกรุงเทพฯ · เลือกพื้นที่อื่นบนแผนที่ได้"}<span className="ml-2 text-sky-200">{weather.location}</span></p>
          <a href="#weather-map" className="rounded px-2 py-1 text-xs text-sky-300 hover:text-white focus-visible:outline-2 focus-visible:outline-sky-300">กลับไปแผนที่ ↑</a>
        </div>
        <CurrentWeather weather={weather} />
        <WeatherAnalytics weather={weather} />
      </div>
    </>
  );
}
