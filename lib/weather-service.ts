import { findWeatherLocation, parseLiveWeather } from "./live-weather";
import type { WeatherSnapshot } from "./weather-data";

const ttl = 5 * 60 * 1000;
type Entry = { day: string; expires: number; weather: WeatherSnapshot };
// Bounded by the 85 allowed IDs; cache is per server process, not a database.
const cache = new Map<string, Entry>();
const pending = new Map<string, Promise<WeatherSnapshot>>();
const bangkokDay = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });

export async function getAreaWeather(id: string): Promise<WeatherSnapshot> {
  const location = findWeatherLocation(id);
  if (!location) throw new Error("Unknown weather area");
  const day = bangkokDay();
  const entry = cache.get(id);
  if (entry && entry.expires > Date.now() && entry.day === day) return entry.weather;
  const key = `${day}:${id}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(location.latitude), longitude: String(location.longitude),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code",
      daily: "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
      timezone: "Asia/Bangkok", forecast_days: "3", temperature_unit: "celsius", wind_speed_unit: "kmh",
    }).toString();
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error(`Weather provider returned ${response.status}`);
    const weather = parseLiveWeather(await response.json(), new Date().toISOString(), location);
    cache.set(id, { day, expires: Date.now() + ttl, weather });
    return weather;
  })();
  pending.set(key, request);
  try { return await request; }
  finally { pending.delete(key); }
}
