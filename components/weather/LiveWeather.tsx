"use client";

import { useEffect, useState } from "react";
import type { WeatherArea, WeatherSnapshot } from "../../lib/weather-data";
import CurrentWeather from "./CurrentWeather";
import WeatherForecast from "./WeatherForecast";

type Resource = { status: "loading" } | { status: "error" } | { status: "ready"; weather: WeatherSnapshot };

// Parent keys this component by area ID, so a new selection starts at loading.
export default function LiveWeather({ area }: { area: WeatherArea }) {
  const [resource, setResource] = useState<Resource>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/weather?areaId=${encodeURIComponent(area.id)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Weather unavailable");
        const weather: WeatherSnapshot = await response.json();
        if (!controller.signal.aborted) setResource({ status: "ready", weather });
      } catch {
        if (!controller.signal.aborted) setResource({ status: "error" });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt, area.id]);

  if (resource.status === "loading") return <div role="status" className="surface rounded-3xl p-8 text-sm leading-7 text-sky-100">กำลังโหลดสภาพอากาศ{area.name}จาก Open-Meteo…</div>;
  if (resource.status === "error") return <div role="alert" className="surface rounded-3xl p-8 text-sm leading-7 text-slate-300"><p>ยังไม่มีข้อมูลอากาศ{area.name}ให้แสดง โหลดจาก Open-Meteo ไม่สำเร็จหรือข้อมูลไม่ครบ</p><p className="mt-2 text-xs text-slate-400">ไม่ได้ใช้ข้อมูลสมมติแทนข้อมูลจริง</p><button type="button" className="primary-action mt-5" onClick={() => { setResource({ status: "loading" }); setAttempt((value) => value + 1); }}>ลองอีกครั้ง</button></div>;
  return <><CurrentWeather weather={resource.weather} /><WeatherForecast weather={resource.weather} /></>;
}
