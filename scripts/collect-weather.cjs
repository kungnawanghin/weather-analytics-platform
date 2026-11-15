/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");
const databasePath = path.join(projectRoot, "data", "weather.sqlite");
const locationsPath = path.join(projectRoot, "lib", "weather-locations.json");

function selectLocations(locations, args) {
  if (args.length === 0) return locations.slice(0, 3);
  if (args.length === 1 && args[0] === "--all") return locations;
  if (args.length === 2 && args[0] === "--limit" && /^\d+$/.test(args[1])) {
    const limit = Number(args[1]);
    if (limit >= 1 && limit <= locations.length) return locations.slice(0, limit);
  }
  throw new Error("ใช้: node scripts/collect-weather.cjs [--all | --limit จำนวนพื้นที่]");
}

function weatherValues(weather, location) {
  const expectedName = location.area.level === "province"
    ? location.area.name
    : `${location.area.name} · ${location.area.provinceName}`;
  if (
    weather?.location !== expectedName || !weather.live ||
    !Number.isFinite(weather.temperature) || weather.temperature < -150 || weather.temperature > 150 ||
    !Number.isFinite(weather.humidity) || weather.humidity < 0 || weather.humidity > 100 ||
    !Number.isFinite(weather.windSpeed) || weather.windSpeed < 0 || weather.windSpeed > 500
  ) throw new Error("ข้อมูลอากาศไม่ครบ ไม่ถูกต้อง หรือเป็นคนละพื้นที่");

  const validTime = Date.parse(weather.live.validAt);
  const fetchedTime = Date.parse(weather.live.fetchedAt);
  if (!Number.isFinite(validTime) || !Number.isFinite(fetchedTime)) {
    throw new Error("เวลาข้อมูลอากาศไม่ถูกต้อง");
  }
  return [
    location.area.id, "open-meteo", "best_match",
    new Date(validTime).toISOString(), new Date(fetchedTime).toISOString(),
    weather.temperature, weather.humidity, weather.windSpeed,
  ];
}

async function collectAreas({ database, locations, fetchWeather, onProgress = () => {} }) {
  database.exec("PRAGMA foreign_keys = ON");
  const findArea = database.prepare("SELECT id FROM areas WHERE id = ?");
  const save = database.prepare(`
    INSERT INTO weather_records (
      area_id, source, model, valid_at, fetched_at,
      temperature_c, humidity_percent, wind_speed_kmh
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(area_id, source, model, valid_at) DO NOTHING
  `);
  const result = { requested: locations.length, inserted: 0, duplicates: 0, failed: 0, failures: [] };

  // Each insert commits independently: one failed area never rolls back other areas.
  for (const [index, location] of locations.entries()) {
    try {
      if (!findArea.get(location.area.id)) throw new Error("ไม่พบพื้นที่ในฐานข้อมูล ให้รัน seed-areas.cjs ก่อน");
      const weather = await fetchWeather(location);
      const saved = save.run(...weatherValues(weather, location));
      const status = saved.changes === 0 ? "duplicates" : "inserted";
      result[status]++;
      onProgress({ index: index + 1, location, status });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.failed++;
      result.failures.push({ id: location.area.id, name: location.area.name, error: message });
      onProgress({ index: index + 1, location, status: "failed", error: message });
    }
  }
  return result;
}

async function main() {
  if (!fs.existsSync(databasePath)) throw new Error("ไม่พบฐานข้อมูล ให้รัน init-database.cjs ก่อน");
  const registry = JSON.parse(fs.readFileSync(locationsPath, "utf8"));
  if (registry.length !== 85 || new Set(registry.map(item => item.area.id)).size !== 85) {
    throw new Error("รายชื่อพื้นที่ต้องครบ 85 รหัสและไม่ซ้ำกัน");
  }
  const locations = selectLocations(registry, process.argv.slice(2));
  const apiBaseUrl = process.env.WEATHER_API_BASE_URL || "http://127.0.0.1:3000";
  const database = new DatabaseSync(databasePath, { timeout: 5000 });

  try {
    console.log(`กำลังเก็บข้อมูล ${locations.length} พื้นที่ จาก ${apiBaseUrl}`);
    const result = await collectAreas({
      database, locations,
      fetchWeather: async location => {
        const url = new URL("/api/weather", apiBaseUrl);
        url.searchParams.set("areaId", location.area.id);
        let response;
        try {
          response = await fetch(url, { signal: AbortSignal.timeout(20000) });
        } catch (error) {
          throw new Error(`ติดต่อ ${url.origin} ไม่ได้ (${error.cause?.code || error.name}) เปิด npm run dev และตรวจ WEATHER_API_BASE_URL`);
        }
        if (!response.ok) throw new Error(`โหลดข้อมูลจาก API ไม่สำเร็จ (HTTP ${response.status})`);
        return response.json();
      },
      onProgress: ({ index, location, status, error }) => {
        const message = status === "inserted" ? "บันทึกแล้ว" : status === "duplicates" ? "เวลาเดิม ข้ามข้อมูลซ้ำ" : `ไม่สำเร็จ: ${error}`;
        console.log(`[${index}/${locations.length}] ${location.area.name}: ${message}`);
      },
    });
    console.table({ requested: result.requested, inserted: result.inserted, duplicates: result.duplicates, failed: result.failed });
    if (result.failures.length) console.table(result.failures);
    if (result.failed) process.exitCode = 1;
  } finally {
    database.close();
  }
}

if (require.main === module) main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
module.exports = { selectLocations, weatherValues, collectAreas };
