/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const databasePath = path.resolve(__dirname, "..", "data", "weather.sqlite");

if (!fs.existsSync(databasePath)) {
  throw new Error("ไม่พบไฟล์ฐานข้อมูล ให้รัน init-database.cjs ก่อน");
}

const database = new DatabaseSync(databasePath, { readOnly: true });

try {
  const summary = database.prepare(`
    SELECT
      COUNT(*) AS total_records,
      COUNT(DISTINCT area_id) AS total_areas
    FROM weather_records
  `).get();

  console.log("สรุปข้อมูลอากาศที่เก็บไว้");
  console.table(summary);

  const records = database.prepare(`
    SELECT
      a.name AS area,
      w.valid_at,
      w.fetched_at,
      w.temperature_c,
      w.humidity_percent,
      w.wind_speed_kmh,
      w.source,
      w.model
    FROM weather_records AS w
    JOIN areas AS a ON a.id = w.area_id
    ORDER BY w.valid_at DESC, w.id DESC
    LIMIT 10
  `).all();

  console.log("ข้อมูลล่าสุดไม่เกิน 10 รายการ (เวลา UTC)");
  if (records.length === 0) {
    console.log("ยังไม่มีข้อมูลอากาศในฐานข้อมูล");
  } else {
    console.table(records);
  }
} finally {
  database.close();
}
