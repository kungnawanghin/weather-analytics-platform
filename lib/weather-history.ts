import type { WeatherHistoryDay } from "./weather-data";
import type { WeatherLocation } from "./live-weather";

export interface WeatherHistory {
  areaId: string;
  location: string;
  startDate: string;
  endDate: string;
  fetchedAt: string;
  model: "ERA5";
  history: WeatherHistoryDay[];
}
const dayMs = 86400000;
export function historyWindow(now = new Date()) {
  const today = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  // ERA5 has a five-day delay; seven days allow for UTC publication and local-day completion.
  const end = Date.parse(`${today}T00:00:00Z`) - 7 * dayMs;
  return { startDate: new Date(end - 29 * dayMs).toISOString().slice(0, 10), endDate: new Date(end).toISOString().slice(0, 10) };
}

export function parseWeatherHistory(input: unknown, location: WeatherLocation, window: ReturnType<typeof historyWindow>, fetchedAt: string): WeatherHistory {
  const body = input as { timezone?: unknown; hourly?: { time?: unknown; temperature_2m?: unknown; relative_humidity_2m?: unknown }; hourly_units?: Record<string, unknown> } | null;
  const hourly = body?.hourly;
  if (body?.timezone !== "Asia/Bangkok" || body.hourly_units?.temperature_2m !== "°C" || body.hourly_units?.relative_humidity_2m !== "%" || !Array.isArray(hourly?.time) || !Array.isArray(hourly.temperature_2m) || !Array.isArray(hourly.relative_humidity_2m)) throw new Error("Invalid historical response");
  const times = hourly.time, temperatures = hourly.temperature_2m, humidities = hourly.relative_humidity_2m;
  if (times.length !== temperatures.length || times.length !== humidities.length) throw new Error("Mismatched hourly arrays");
  const days = new Map<string, { temperature: number[]; humidity: number[] }>();
  const start = Date.parse(`${window.startDate}T00:00:00Z`);
  for (let i = 0; i < 30; i++) days.set(new Date(start + i * dayMs).toISOString().slice(0, 10), { temperature: [], humidity: [] });
  const seen = new Set<string>();
  times.forEach((time, i) => {
    if (typeof time !== "string" || !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):00$/.test(time) || !days.has(time.slice(0, 10)) || seen.has(time)) throw new Error("Invalid or duplicate historical hour");
    seen.add(time);
    const row = days.get(time.slice(0, 10))!;
    const t = temperatures[i], h = humidities[i];
    if (typeof t === "number" && Number.isFinite(t) && t >= -100 && t <= 70) row.temperature.push(t);
    if (typeof h === "number" && Number.isFinite(h) && h >= 0 && h <= 100) row.humidity.push(h);
  });
  const mean = (values: number[]) => values.length === 24 ? values.reduce((a, b) => a + b, 0) / 24 : null;
  return {
    areaId: location.area.id, location: location.area.level === "province" ? location.area.name : `${location.area.name} · ${location.area.provinceName}`,
    ...window, fetchedAt, model: "ERA5",
    history: [...days].map(([date, values]) => ({ date, temperature: mean(values.temperature), humidity: mean(values.humidity) })),
  };
}
