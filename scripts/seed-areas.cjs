/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

const projectRoot = path.resolve(__dirname, "..");

const databasePath = path.join(projectRoot, "data", "weather.sqlite");
const locationsPath = path.join(
  projectRoot,
  "lib",
  "weather-locations.json"
);

if (!fs.existsSync(databasePath)) {
  throw new Error("ไม่พบฐานข้อมูล ให้รัน init-database.cjs ก่อน");
}

const locations = JSON.parse(
  fs.readFileSync(locationsPath, "utf8")
);

const database = new DatabaseSync(databasePath);

try {
  database.exec("PRAGMA foreign_keys = ON");

  const saveArea = database.prepare(`
    INSERT INTO areas (
      id, name, province_name, level, latitude, longitude
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      province_name = excluded.province_name,
      level = excluded.level,
      latitude = excluded.latitude,
      longitude = excluded.longitude
  `);

  database.exec("BEGIN");

  try {
    for (const location of locations) {
      saveArea.run(
        location.area.id,
        location.area.name,
        location.area.provinceName,
        location.area.level,
        location.latitude,
        location.longitude
      );
    }

    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const counts = database.prepare(`
    SELECT level, COUNT(*) AS total
    FROM areas
    GROUP BY level
    ORDER BY level
  `).all();

  console.log("บันทึกข้อมูลพื้นที่เรียบร้อย");
  console.table(counts);
} finally {
  database.close();
}