/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

// อ้างอิงโฟลเดอร์โปรเจกต์จากตำแหน่งสคริปต์
const projectRoot = path.resolve(__dirname, "..");

const schemaPath = path.join(projectRoot, "database", "schema.sql");
const dataDirectory = path.join(projectRoot, "data");
const databasePath = path.join(dataDirectory, "weather.sqlite");

// อ่านคำสั่ง SQL ก่อนสร้างฐานข้อมูล
const schema = fs.readFileSync(schemaPath, "utf8");

// สร้างโฟลเดอร์เก็บฐานข้อมูล ถ้ายังไม่มี
fs.mkdirSync(dataDirectory, { recursive: true });

const database = new DatabaseSync(databasePath);

try {
  // รันคำสั่งสร้างตารางจาก schema.sql
  database.exec(schema);

  // อ่านรายชื่อตารางเพื่อตรวจผล
  const tables = database.prepare(`
    SELECT name
    FROM sqlite_schema
    WHERE type = 'table'
      AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `).all();

  console.log("Database ready:", databasePath);
  console.table(tables);
} finally {
  database.close();
}