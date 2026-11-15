/* eslint-disable @typescript-eslint/no-require-imports */
const { loadEnvironment, createStore } = require("./supabase-store.cjs");
async function main() {
  loadEnvironment();
  const store = createStore();
  const areas = await store.areas();
  console.log(`พื้นที่บน Supabase: ${areas.length}`);
  console.log("ข้อมูลล่าสุด 10 รายการ (เวลา UTC)");
  console.table(await store.latest());
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
