/* eslint-disable @typescript-eslint/no-require-imports */
const locations = require("../lib/weather-locations.json");
const { loadEnvironment, createStore } = require("./supabase-store.cjs");

async function main() {
  loadEnvironment();
  const store = createStore();
  if (locations.length !== 85 || new Set(locations.map(l => l.area.id)).size !== 85) throw new Error("รายชื่อพื้นที่ต้องมี 85 รหัสไม่ซ้ำ");
  await store.seed(locations);
  const saved = await store.areas();
  if (saved.length !== 85 || locations.some(l => !saved.some(row => row.id === l.area.id && row.level === l.area.level))) throw new Error("ตรวจรายชื่อพื้นที่บน Supabase ไม่ผ่าน");
  console.table({ provinces: saved.filter(a => a.level === "province").length, districts: saved.filter(a => a.level === "district").length, total: saved.length });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
