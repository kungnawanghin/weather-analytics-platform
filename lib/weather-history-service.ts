import { findWeatherLocation } from "./live-weather";
import { historyWindow, parseWeatherHistory, type WeatherHistory } from "./weather-history";

const cache = new Map<string, { data: WeatherHistory; expires: number }>();
const pending = new Map<string, Promise<WeatherHistory>>();
export async function getAreaHistory(id: string): Promise<WeatherHistory> {
  const location = findWeatherLocation(id);
  if (!location) throw new Error("Unknown area");
  const window = historyWindow();
  const saved = cache.get(id);
  if (saved && saved.expires > Date.now() && saved.data.endDate === window.endDate) return saved.data;
  const key = `${id}:${window.endDate}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const url = new URL("https://archive-api.open-meteo.com/v1/archive");
    url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), start_date: window.startDate, end_date: window.endDate, hourly: "temperature_2m,relative_humidity_2m", models: "era5", timezone: "Asia/Bangkok", temperature_unit: "celsius" }).toString();
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error("Historical provider unavailable");
    const data = parseWeatherHistory(await response.json(), location, window, new Date().toISOString());
    // Retry empty responses later rather than caching an outage as weather.
    if (data.history.some(row => row.temperature !== null || row.humidity !== null)) cache.set(id, { data, expires: Date.now() + 3600000 });
    return data;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}
