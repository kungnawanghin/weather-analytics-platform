import { findWeatherLocation } from "../../../../lib/live-weather";
import { getAreaHistory } from "../../../../lib/weather-history-service";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("areaId");
  if (!id) return Response.json({ error: "กรุณาระบุ areaId" }, { status: 400 });
  if (!findWeatherLocation(id)) return Response.json({ error: "ไม่พบพื้นที่" }, { status: 404 });
  try { return Response.json(await getAreaHistory(id), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "โหลดข้อมูลย้อนหลังไม่สำเร็จ กรุณาลองใหม่" }, { status: 502, headers: { "Cache-Control": "no-store" } }); }
}
