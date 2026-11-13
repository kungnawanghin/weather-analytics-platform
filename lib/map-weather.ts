import type { AreaWeatherState } from "./use-area-weather";
import type { WeatherMetric } from "./weather-data";

export function mapWeatherValue(state: AreaWeatherState | undefined, metric: WeatherMetric): number | null {
  if (state?.status !== "ready") return null;
  const value = metric === "rainChance" ? state.weather.forecast[0]?.rainChance : state.weather[metric];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function mapWeatherLabel(state: AreaWeatherState | undefined, metric: WeatherMetric, unit: string) {
  const value = mapWeatherValue(state, metric);
  return value === null ? state?.status === "error" ? "ไม่มีข้อมูล" : "กำลังโหลด…" : `${value}${unit}`;
}
