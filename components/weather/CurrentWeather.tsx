import type { WeatherSnapshot } from "../../lib/weather-data";
import WeatherConditionIcon from "./WeatherConditionIcon";

export default function CurrentWeather({ weather }: { weather: WeatherSnapshot }) {
  const condition = weather.conditionIcon ?? (weather.condition.startsWith("Rain") ? "rain" : "partly-cloudy");
  const formatTime = (date: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(date));
  return (
    <section aria-labelledby="current-weather-title">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div><p className="eyebrow">01 / Current conditions</p><h2 id="current-weather-title" className="section-title mt-3">{weather.location}</h2></div>
        <span className="rounded-full border border-sky-200/15 bg-sky-200/5 px-3 py-1.5 text-[10px] text-sky-200">{weather.live ? "Open-Meteo · Model data" : "Demo · Mock data"}</span>
      </div>
      <div className="surface relative isolate overflow-hidden rounded-[28px] p-6 sm:p-9">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-40 -z-10 h-96 w-96 rounded-full bg-cyan-300/[0.05] blur-3xl" />
        <div className="grid items-center gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-12">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs text-slate-400">อุณหภูมิ ณ จุดอ้างอิง</p><p className="mt-4 tabular-nums text-[64px] font-light leading-none tracking-[-.075em] text-sky-50 sm:text-[104px]">{weather.temperature}<span className="ml-2 align-top text-xl leading-loose tracking-normal text-cyan-200/80 sm:text-2xl">°C</span></p><p className="mt-5 text-sm text-slate-300">{weather.condition}</p></div>
            <WeatherConditionIcon condition={condition} className="h-20 w-20 shrink-0 sm:h-36 sm:w-36" />
          </div>
          <dl className="grid grid-cols-2 gap-5 border-t border-white/10 pt-7 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <div><dt className="flex items-center gap-2 text-xs text-slate-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-cyan-200" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z"/></svg>ความชื้น</dt><dd className="mt-4 text-4xl font-light tabular-nums text-cyan-100">{weather.humidity}<span className="ml-1 text-base text-slate-400">%</span></dd><dd className="mt-3 text-[10px] text-slate-400">RELATIVE HUMIDITY</dd></div>
            <div><dt className="flex items-center gap-2 text-xs text-slate-400"><svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 text-sky-200" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M3 8h12a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 16h5"/></svg>ความเร็วลม</dt><dd className="mt-4 text-4xl font-light tabular-nums text-sky-100">{weather.windSpeed}<span className="ml-1 text-xs text-slate-400">km/h</span></dd><dd className="mt-3 text-[10px] text-slate-400">WIND SPEED</dd></div>
          </dl>
        </div>
        <div className="mt-8 border-t border-white/[0.07] pt-4 text-xs leading-6 text-slate-400"><p>{weather.reference}</p>{weather.live ? <><p>เวลาข้อมูล <time dateTime={weather.live.validAt}>{formatTime(weather.live.validAt)}</time> · ดึงข้อมูล <time dateTime={weather.live.fetchedAt}>{formatTime(weather.live.fetchedAt)}</time> (เวลาไทย)</p><p>ข้อมูลจากแบบจำลองอากาศ ไม่ใช่การวัดตรงจากสถานีในเขต · ไม่อัปเดตอัตโนมัติระหว่างเปิดหน้า</p><p>Weather data by <a className="underline text-sky-200" href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · แปลงรหัสสภาพอากาศเป็นคำอธิบายภาษาไทย</p></> : <p>ข้อมูลตัวอย่างคงที่ ยังไม่มีเวลาอัปเดตจาก API</p>}</div>
      </div>
    </section>
  );
}
