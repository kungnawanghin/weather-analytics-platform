"use client";

import { useEffect, useRef, useState } from "react";
import type { WeatherSnapshot } from "./weather-data";

export type AreaWeatherState = { status: "loading" } | { status: "error" } | { status: "ready"; weather: WeatherSnapshot };
export type AreaWeatherStates = Record<string, AreaWeatherState | undefined>;
type CacheEntry = { weather: WeatherSnapshot; expires: number; day: string };
const day = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

// One parent owns these snapshots: the map and detail cards read identical objects.
export function useAreaWeather(ids: string[]) {
  const [states, setStates] = useState<AreaWeatherStates>({});
  const cache = useRef(new Map<string, CacheEntry>());
  const [attempt, setAttempt] = useState(0);
  const key = [...new Set(ids)].join(",");
  useEffect(() => {
    const controller = new AbortController();
    const queue = key ? key.split(",") : [];
    function publish(id: string, value: AreaWeatherState) {
      if (!controller.signal.aborted) setStates(previous => ({ ...previous, [id]: value }));
    }
    async function worker() {
      // Avoid synchronous state changes during effect setup, including cached results.
      await Promise.resolve();
      while (queue.length && !controller.signal.aborted) {
        const id = queue.shift()!;
        const saved = cache.current.get(id);
        if (saved && saved.expires > Date.now() && saved.day === day()) {
          publish(id, { status: "ready", weather: saved.weather });
          continue;
        }
        publish(id, { status: "loading" });
        try {
          const response = await fetch(`/api/weather?areaId=${encodeURIComponent(id)}`, { signal: controller.signal });
          if (!response.ok) throw new Error("Weather unavailable");
          const weather: WeatherSnapshot = await response.json();
          if (controller.signal.aborted) return;
          cache.current.set(id, { weather, expires: Date.now() + 300000, day: day() });
          publish(id, { status: "ready", weather });
        } catch {
          if (!controller.signal.aborted) publish(id, { status: "error" });
        }
      }
    }
    // Load the selected area first, then at most three visible-area requests at a time.
    void Promise.all([worker(), worker(), worker()]);
    return () => controller.abort();
  }, [key, attempt]);
  return { states, retry: () => setAttempt(value => value + 1) };
}
