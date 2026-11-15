/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { selectLocations, weatherValues, collectAreas } = require("./collect-weather.cjs");
const locations = require("../lib/weather-locations.json");

function openTestDatabase() {
  const db = new DatabaseSync(":memory:");
  db.exec(fs.readFileSync(path.join(__dirname, "../database/schema.sql"), "utf8"));
  const seed = db.prepare("INSERT INTO areas VALUES (?, ?, ?, ?, ?, ?)");
  for (const location of locations) seed.run(location.area.id, location.area.name, location.area.provinceName, location.area.level, location.latitude, location.longitude);
  return db;
}
function fixture(location) {
  return {
    location: location.area.level === "province" ? location.area.name : `${location.area.name} · ${location.area.provinceName}`,
    temperature: 30, humidity: 70, windSpeed: 5,
    live: { validAt: "2026-11-14T12:00:00+07:00", fetchedAt: "2026-11-14T05:05:00Z" },
  };
}
async function run() {
  assert.equal(selectLocations(locations, []).length, 3);
  assert.equal(selectLocations(locations, ["--all"]).length, 85);
  assert.equal(selectLocations(locations, ["--limit", "1"]).length, 1);
  for (const args of [["--limit", "0"], ["--limit", "86"], ["--limit", "NaN"], ["--all", "extra"]]) assert.throws(() => selectLocations(locations, args));
  for (const bad of [w => w.temperature = NaN, w => w.humidity = 101, w => w.windSpeed = -1, w => w.location = "wrong area", w => w.live.validAt = "invalid"]) {
    const weather = fixture(locations[0]); bad(weather);
    assert.throws(() => weatherValues(weather, locations[0]));
  }
  const db = openTestDatabase();
  try {
    const first = await collectAreas({ database: db, locations, fetchWeather: async location => fixture(location) });
    assert.equal(first.inserted, 85); assert.equal(first.failed, 0);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM weather_records").get().n, 85);
    const again = await collectAreas({ database: db, locations, fetchWeather: async location => fixture(location) });
    assert.equal(again.inserted, 0); assert.equal(again.duplicates, 85);
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM weather_records").get().n, 85);
    assert.equal(db.prepare("SELECT valid_at FROM weather_records LIMIT 1").get().valid_at, "2026-11-14T05:00:00.000Z");
  } finally { db.close(); }
  const partialDb = openTestDatabase();
  try {
    const seen = [];
    const result = await collectAreas({
      database: partialDb, locations: locations.slice(0, 3),
      fetchWeather: async location => {
        seen.push(location.area.id);
        if (location.area.id === locations[1].area.id) throw new Error("Test provider failure");
        return fixture(location);
      },
    });
    assert.equal(seen.length, 3); assert.equal(result.inserted, 2); assert.equal(result.failed, 1);
    assert.equal(result.failures[0].id, locations[1].area.id);
    assert.equal(partialDb.prepare("SELECT COUNT(*) AS n FROM weather_records").get().n, 2);
  } finally { partialDb.close(); }
  console.log("PASS: 85 areas, idempotent inserts, UTC times, CLI limits, invalid data, wrong area, partial failure and continuation (in-memory database only)");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
