import type { WeatherLocation } from "./live-weather";
import type { WeatherHistory } from "./weather-history";

const dayMs = 86_400_000;
export function collectionWindow(now = new Date()) {
  const endDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const startDate = new Date(Date.parse(`${endDate}T00:00:00Z`) - 29 * dayMs).toISOString().slice(0, 10);
  return { startDate, endDate };
}

export interface CollectedRecord {
  area_id: string;
  source: string;
  model: string;
  valid_at: string;
  fetched_at: string;
  temperature_c: number;
  humidity_percent: number;
}

export function aggregateCollectedHistory(rows: CollectedRecord[], location: WeatherLocation, now = new Date()): WeatherHistory {
  const window = collectionWindow(now);
  const days = new Map<string, Map<string, CollectedRecord>>();
  const start = Date.parse(`${window.startDate}T00:00:00Z`);
  for (let d = 0; d < 30; d++) days.set(new Date(start + d * dayMs).toISOString().slice(0, 10), new Map());
  for (const row of rows) {
    const valid = Date.parse(row.valid_at), fetched = Date.parse(row.fetched_at);
    if (row.area_id !== location.area.id || row.source !== "open-meteo" || row.model !== "best_match" || !Number.isFinite(valid) || !Number.isFinite(fetched) || valid > now.getTime() || fetched > now.getTime() || !Number.isFinite(row.temperature_c) || row.temperature_c < -150 || row.temperature_c > 150 || !Number.isFinite(row.humidity_percent) || row.humidity_percent < 0 || row.humidity_percent > 100) throw new Error("Invalid collected weather record");
    // Latest snapshot per Bangkok hour prevents repeated collection weighting.
    const localHour = new Date(valid + 7 * 3_600_000).toISOString().slice(0, 13);
    const hours = days.get(localHour.slice(0, 10));
    if (!hours) continue;
    const previous = hours.get(localHour);
    if (!previous || valid > Date.parse(previous.valid_at) || (valid === Date.parse(previous.valid_at) && fetched > Date.parse(previous.fetched_at))) hours.set(localHour, row);
  }
  return {
    areaId: location.area.id,
    location: location.area.level === "province" ? location.area.name : `${location.area.name} · ${location.area.provinceName}`,
    ...window, fetchedAt: now.toISOString(), model: "best_match",
    history: [...days].map(([date, hours]) => {
      const values = [...hours.values()];
      return { date, samples: values.length,
        temperature: values.length ? values.reduce((sum, row) => sum + row.temperature_c, 0) / values.length : null,
        humidity: values.length ? values.reduce((sum, row) => sum + row.humidity_percent, 0) / values.length : null };
    }),
  };
}
