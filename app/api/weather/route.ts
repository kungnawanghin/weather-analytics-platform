import { findWeatherLocation } from "../../../lib/live-weather";
import { getAreaWeather } from "../../../lib/weather-service";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("areaId");
  if (!id) return Response.json({ error: "กรุณาระบุ areaId" }, { status: 400 });
  if (!findWeatherLocation(id)) return Response.json({ error: "ไม่พบพื้นที่ที่รองรับ" }, { status: 404 });
  try {
    const weather = await getAreaWeather(id);
    // Application cache above controls TTL and invalidates across Bangkok midnight.
    return Response.json(weather, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "โหลดข้อมูลจาก Open-Meteo ไม่สำเร็จหรือข้อมูลไม่ครบ กรุณาลองใหม่" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
