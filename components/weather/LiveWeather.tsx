import type { WeatherArea } from "../../lib/weather-data";
import type { AreaWeatherState } from "../../lib/use-area-weather";
import CurrentWeather from "./CurrentWeather";
import WeatherForecast from "./WeatherForecast";

export default function LiveWeather({ area, state, onRetry }: { area: WeatherArea; state?: AreaWeatherState; onRetry: () => void }) {
  if (!state || state.status === "loading") return <div role="status" className="surface rounded-3xl p-8 text-sm leading-7 text-sky-100">กำลังโหลดสภาพอากาศ{area.name}จาก Open-Meteo…</div>;
  if (state.status === "error") return <div role="alert" className="surface rounded-3xl p-8 text-sm leading-7 text-slate-300"><p>ยังไม่มีข้อมูลอากาศ{area.name}ให้แสดง โหลดจาก Open-Meteo ไม่สำเร็จหรือข้อมูลไม่ครบ</p><p className="mt-2 text-xs text-slate-400">ไม่ได้ใช้ข้อมูลสมมติแทนข้อมูลจริง</p><button type="button" className="primary-action mt-5" onClick={onRetry}>ลองอีกครั้ง</button></div>;
  return <><CurrentWeather weather={state.weather} /><WeatherForecast weather={state.weather} /></>;
}
