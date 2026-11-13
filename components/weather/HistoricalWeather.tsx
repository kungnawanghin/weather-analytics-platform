"use client";

import { useEffect, useState } from "react";
import type { WeatherArea } from "../../lib/weather-data";
import { historyWindow, type WeatherHistory } from "../../lib/weather-history";
import WeatherAnalytics from "./WeatherAnalytics";

type Resource = { status: "loading" } | { status: "error" } | { status: "ready"; data: WeatherHistory };
const cache = new Map<string, { data: WeatherHistory; expires: number }>();

// Keyed by selection: old-area responses cannot populate the new area's charts.
export default function HistoricalWeather({ area }: { area: WeatherArea }) {
  const [state, setState] = useState<Resource>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      await Promise.resolve();
      try {
        const saved = cache.get(area.id);
        if (saved && saved.expires > Date.now() && saved.data.endDate === historyWindow().endDate) {
          if (!controller.signal.aborted) setState({ status: "ready", data: saved.data });
          return;
        }
        const response = await fetch(`/api/weather/history?areaId=${encodeURIComponent(area.id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("History unavailable");
        const data: WeatherHistory = await response.json();
        if (controller.signal.aborted) return;
        if (data.history.some(row => row.temperature !== null || row.humidity !== null)) cache.set(area.id, { data, expires: Date.now() + 3600000 });
        setState({ status: "ready", data });
      } catch { if (!controller.signal.aborted) setState({ status: "error" }); }
    }
    void load();
    return () => controller.abort();
  }, [area.id, attempt]);
  if (state.status === "ready") return <WeatherAnalytics weather={state.data} />;
  return <section id="weather-analytics" aria-labelledby="analytics-loading-title" className="mt-20 border-t border-white/10 pt-12"><h2 id="analytics-loading-title" className="section-title">Weather Analytics · {area.name}</h2><div className="surface mt-6 rounded-3xl p-7 text-sm leading-7" role={state.status === "error" ? "alert" : "status"}>{state.status === "loading" ? "กำลังโหลดข้อมูลย้อนหลัง ERA5 สำหรับกราฟและ Insights…" : <><p>โหลดข้อมูลย้อนหลังไม่สำเร็จ ยังไม่มีกราฟและ Insights ให้แสดง</p><button type="button" className="primary-action mt-4" onClick={() => { setState({ status: "loading" }); setAttempt(value => value + 1); }}>ลองโหลดข้อมูลย้อนหลังอีกครั้ง</button></>}</div></section>;
}
