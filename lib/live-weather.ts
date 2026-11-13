import type { WeatherArea, WeatherCondition, WeatherSnapshot } from "./weather-data";
import locations from "./weather-locations.json";

export interface WeatherLocation {
  area: WeatherArea;
  latitude: number;
  longitude: number;
  method: "geonames" | "boundary-interior";
}
export const weatherLocations = locations as WeatherLocation[];
export function findWeatherLocation(id: string) {
  return weatherLocations.find((location) => location.area.id === id);
}

// GeoNames district reference, not a district-wide average or measuring station.
// https://www.geonames.org/6845305/lat-phrao.html
export const latPhrao = findWeatherLocation("78962969B95574148528109")!;

export function weatherCode(code: number): { condition: WeatherCondition; description: string } {
  if (code === 0 || code === 1) return { condition: "sunny", description: "ท้องฟ้าแจ่มใส" };
  if (code === 2 || code === 3) return { condition: "partly-cloudy", description: code === 3 ? "เมฆมาก" : "มีเมฆบางส่วน" };
  if (code === 45 || code === 48) return { condition: "partly-cloudy", description: "มีหมอก" };
  if ([51,53,55,56,57].includes(code)) return { condition: "rain", description: "ฝนละออง" };
  if ([61,63,65,66,67,80,81,82].includes(code)) return { condition: "rain", description: "ฝนตก" };
  if ([95,96,97,99].includes(code)) return { condition: "rain", description: "ฝนฟ้าคะนอง" };
  if ([71,73,75,77,85,86].includes(code)) return { condition: "partly-cloudy", description: "หิมะตก" };
  return { condition: "partly-cloudy", description: "ไม่ทราบสภาพอากาศ" };
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid weather object");
  return value as Record<string, unknown>;
}
function numeric(value: unknown, min = -150, max = 150): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("Missing or invalid weather value");
  return value;
}

// Validate provider data before exposing it to the UI; null never becomes zero.
export function parseLiveWeather(input: unknown, fetchedAt: string, location: WeatherLocation = latPhrao): WeatherSnapshot {
  const body = record(input), current = record(body.current), daily = record(body.daily);
  if (body.timezone !== "Asia/Bangkok" || typeof current.time !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(current.time)) throw new Error("Invalid weather time");
  const rows = ["time", "temperature_2m_max", "temperature_2m_min", "precipitation_probability_max", "weather_code"].map((key) => {
    if (!Array.isArray(daily[key]) || daily[key].length < 3) throw new Error("Incomplete forecast");
    return daily[key] as unknown[];
  });
  const condition = weatherCode(numeric(current.weather_code, 0, 99));
  return {
    location: location.area.level === "province" ? location.area.name : `${location.area.name} · ${location.area.provinceName}`,
    reference: `จุดอ้างอิง${location.area.name} ${location.latitude}, ${location.longitude} · ${location.method === "geonames" ? "พิกัดอ้างอิง GeoNames" : "จุดภายในขอบเขต GeoJSON ไม่ใช่สถานีวัดหรือศูนย์กลางเมือง"} · ไม่ใช่ค่าเฉลี่ยทั้งพื้นที่`,
    temperature: numeric(current.temperature_2m), humidity: numeric(current.relative_humidity_2m, 0, 100), windSpeed: numeric(current.wind_speed_10m, 0, 500),
    condition: condition.description, conditionIcon: condition.condition,
    live: { validAt: `${current.time}:00+07:00`, fetchedAt }, history: [],
    forecast: rows[0].slice(0, 3).map((date, index) => {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Invalid forecast date");
      const high = numeric(rows[1][index]), low = numeric(rows[2][index]);
      if (low > high) throw new Error("Invalid forecast temperatures");
      return { date, high, low, rainChance: numeric(rows[3][index], 0, 100), ...weatherCode(numeric(rows[4][index], 0, 99)) };
    }),
  };
}
