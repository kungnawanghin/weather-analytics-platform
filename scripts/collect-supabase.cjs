/* eslint-disable @typescript-eslint/no-require-imports */
const locations = require("../lib/weather-locations.json");
const { selectLocations, weatherValues } = require("./collect-weather.cjs");
const { loadEnvironment, createStore } = require("./supabase-store.cjs");

function parseCurrent(body, location, fetchedAt = new Date().toISOString()) {
  const c = body?.current, units = body?.current_units;
  // Request Unix seconds to avoid interpreting the machine's local timezone.
  if (!Number.isInteger(c?.time) || c.time <= 0 || units?.time !== "unixtime" || units?.temperature_2m !== "°C" || units?.relative_humidity_2m !== "%" || units?.wind_speed_10m !== "km/h") throw new Error("ข้อมูลเวลาหรือหน่วยจาก Open-Meteo ไม่ถูกต้อง");
  const weather = {
    location: location.area.level === "province" ? location.area.name : `${location.area.name} · ${location.area.provinceName}`,
    temperature: c.temperature_2m, humidity: c.relative_humidity_2m, windSpeed: c.wind_speed_10m,
    live: { validAt: new Date(c.time * 1000).toISOString(), fetchedAt },
  };
  const values = weatherValues(weather, location);
  return Object.fromEntries(["area_id", "source", "model", "valid_at", "fetched_at", "temperature_c", "humidity_percent", "wind_speed_kmh"].map((key, i) => [key, values[i]]));
}

async function fetchCurrent(location) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: String(location.latitude), longitude: String(location.longitude), current: "temperature_2m,relative_humidity_2m,wind_speed_10m", temperature_unit: "celsius", wind_speed_unit: "kmh", timeformat: "unixtime", timezone: "UTC", forecast_days: "1" }).toString();
  let response;
  try { response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: "error" }); }
  catch { throw new Error("เชื่อมต่อ Open-Meteo ไม่สำเร็จ"); }
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  return parseCurrent(await response.json(), location);
}

async function collect({ store, selected, fetchWeather = fetchCurrent, onProgress = () => {} }) {
  const ids = new Set((await store.areas()).map(row => row.id));
  const result = { requested: selected.length, inserted: 0, duplicates: 0, failed: 0 };
  for (const [i, location] of selected.entries()) {
    try {
      if (!ids.has(location.area.id)) throw new Error("ยังไม่มีพื้นที่นี้ ให้รัน seed-supabase.cjs ก่อน");
      const status = await store.save(await fetchWeather(location));
      result[status]++;
      onProgress(i + 1, location, status);
    } catch (error) {
      result.failed++;
      onProgress(i + 1, location, "failed", error.message);
    }
  }
  return result;
}

async function main() {
  loadEnvironment();
  const store = createStore();
  const selected = selectLocations(locations, process.argv.slice(2));
  const result = await collect({ store, selected, onProgress: (i, location, status, error) => console.log(`[${i}/${selected.length}] ${location.area.name}: ${error || status}`) });
  console.table(result);
  if (result.failed) process.exitCode = 1;
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { parseCurrent, collect };
