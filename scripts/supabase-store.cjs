/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("node:fs");
const path = require("node:path");

function loadEnvironment() {
  const envPath = path.join(__dirname, "../.env.local");
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}

function createStore(env = process.env, fetchImpl = fetch) {
  let base;
  try { base = new URL(env.SUPABASE_URL); } catch { throw new Error("ตั้งค่า SUPABASE_URL ใน .env.local ก่อน"); }
  if (base.protocol !== "https:" || !base.hostname.endsWith(".supabase.co") || base.username || base.password || base.pathname !== "/" || base.search || base.hash) {
    throw new Error("SUPABASE_URL ต้องเป็น https://<project-ref>.supabase.co เท่านั้น");
  }
  const key = env.SUPABASE_SECRET_KEY;
  if (!key?.startsWith("sb_secret_")) throw new Error("ตั้งค่า SUPABASE_SECRET_KEY ด้วย Secret key ฝั่งเซิร์ฟเวอร์ก่อน");

  async function request(table, { query = {}, body, prefer } = {}) {
    const url = new URL(`/rest/v1/${table}`, base);
    url.search = new URLSearchParams(query).toString();
    let response;
    try {
      response = await fetchImpl(url, {
        method: body === undefined ? "GET" : "POST",
        headers: { apikey: key, "Content-Type": "application/json", ...(prefer ? { Prefer: prefer } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20000), redirect: "error",
      });
    } catch { throw new Error("เชื่อมต่อ Supabase ไม่สำเร็จ ตรวจเครือข่ายและสถานะโปรเจกต์"); }
    // Do not log provider bodies, URLs or request headers containing credentials.
    if (!response.ok) throw new Error(`Supabase HTTP ${response.status}: ตรวจคีย์ ตาราง และสิทธิ์เข้าถึง`);
    const text = await response.text();
    return text ? JSON.parse(text) : [];
  }

  return {
    async seed(locations) {
      const rows = locations.map(({ area, latitude, longitude }) => ({ id: area.id, name: area.name, province_name: area.provinceName, level: area.level, latitude, longitude }));
      return request("areas", { query: { on_conflict: "id", select: "id" }, body: rows, prefer: "resolution=merge-duplicates,return=representation" });
    },
    areas: () => request("areas", { query: { select: "id,level", order: "id", limit: "1000" } }),
    async save(row) {
      const rows = await request("weather_records", {
        query: { on_conflict: "area_id,source,model,valid_at", select: "area_id" },
        body: [row], prefer: "resolution=ignore-duplicates,return=representation",
      });
      if (!Array.isArray(rows) || rows.length > 1) throw new Error("ผลบันทึก Supabase ไม่ถูกต้อง");
      return rows.length ? "inserted" : "duplicates";
    },
    latest: () => request("weather_records", { query: { select: "area_id,valid_at,fetched_at,temperature_c,humidity_percent,wind_speed_kmh", order: "valid_at.desc", limit: "10" } }),
  };
}
module.exports = { loadEnvironment, createStore };
