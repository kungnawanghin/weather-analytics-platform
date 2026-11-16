import "server-only";
import { findWeatherLocation } from "./live-weather";
import { aggregateCollectedHistory, collectionWindow, type CollectedRecord } from "./collected-weather-history";
import type { WeatherHistory } from "./weather-history";

const cache = new Map<string, { data: WeatherHistory; expires: number }>();
const pending = new Map<string, Promise<WeatherHistory>>();
export async function getAreaHistory(id: string): Promise<WeatherHistory> {
  const location = findWeatherLocation(id);
  if (!location) throw new Error("Unknown area");
  const now = new Date();
  const window = collectionWindow(now);
  const saved = cache.get(id);
  if (saved && saved.expires > Date.now() && saved.data.endDate === window.endDate) return saved.data;
  const key = `${id}:${window.endDate}`;
  const existing = pending.get(key);
  if (existing) return existing;
  const request = (async () => {
    const base = new URL(process.env.SUPABASE_URL || "https://invalid.invalid");
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (base.protocol !== "https:" || !base.hostname.endsWith(".supabase.co") || base.username || base.password || base.pathname !== "/" || base.search || base.hash || !secret?.startsWith("sb_secret_")) throw new Error("Database not configured");
    const rows: CollectedRecord[] = [];
    // Read all pages using a stable order and fixed cutoff, including API row caps.
    for (let page = 0; ; page++) {
      if (page >= 25) throw new Error("Historical response exceeds safe size");
      const url = new URL("/rest/v1/weather_records", base);
      url.searchParams.set("select", "area_id,source,model,valid_at,fetched_at,temperature_c,humidity_percent");
      url.searchParams.set("area_id", `eq.${id}`);
      url.searchParams.set("source", "eq.open-meteo");
      url.searchParams.set("model", "eq.best_match");
      url.searchParams.append("valid_at", `gte.${window.startDate}T00:00:00+07:00`);
      url.searchParams.append("valid_at", `lte.${now.toISOString()}`);
      url.searchParams.set("fetched_at", `lte.${now.toISOString()}`);
      url.searchParams.set("order", "valid_at.asc,id.asc");
      url.searchParams.set("offset", String(rows.length));
      url.searchParams.set("limit", "500");
      const response = await fetch(url, { headers: { apikey: secret }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error("Collection database unavailable");
      const batch: unknown = await response.json();
      if (!Array.isArray(batch)) throw new Error("Invalid collection response");
      if (!batch.length) break;
      rows.push(...batch);
    }
    const data = aggregateCollectedHistory(rows, location, now);
    cache.set(id, { data, expires: Date.now() + 5 * 60_000 });
    return data;
  })();
  pending.set(key, request);
  try { return await request; } finally { pending.delete(key); }
}
