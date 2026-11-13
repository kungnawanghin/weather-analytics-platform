"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { WeatherSnapshot } from "../../lib/weather-data";
import WeatherConditionIcon from "./WeatherConditionIcon";

const dayFormatter = new Intl.DateTimeFormat("th-TH", { weekday: "long", timeZone: "Asia/Bangkok" });
const dateFormatter = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" });

export default function WeatherForecast({ weather }: { weather: WeatherSnapshot }) {
  const reduceMotion = useReducedMotion();

  return (
    <section id="weather-forecast" aria-labelledby="forecast-title" className="relative isolate mt-14 scroll-mt-8 sm:mt-16">
      <div aria-hidden="true" className="pointer-events-none absolute -top-10 left-1/4 -z-10 h-56 w-1/2 rounded-full bg-sky-500/[0.045] blur-3xl" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">02 / 3-day forecast</p>
          <h2 id="forecast-title" className="mt-3 text-[27px] font-semibold tracking-[-0.035em] text-slate-100 sm:text-3xl">A little further ahead.</h2>
          <p className="mt-3 text-sm leading-6 text-slate-400">พยากรณ์รายวัน · {weather.location} · เวลาไทย (UTC+7)</p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-200/15 bg-sky-200/5 px-3 py-1.5 text-[10px] text-sky-200">Open-Meteo · Forecast</span>
      </div>

      {weather.forecast.length === 0 ? (
        <p role="status" className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-8 text-sm text-slate-400">ยังไม่มีข้อมูลพยากรณ์ของพื้นที่นี้</p>
      ) : (
        <motion.div key={weather.location} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.3 }} className="mt-8 grid gap-4 lg:grid-cols-3 xl:gap-5">
          {weather.forecast.map((day, index) => {
            const date = new Date(`${day.date}T12:00:00+07:00`);
            return (
              <motion.article
                key={day.date}
                aria-label={`${dayFormatter.format(date)} ${dateFormatter.format(date)} ${day.description}`}
                whileHover={reduceMotion ? undefined : { y: -5 }}
                transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeOut" }}
                className={`group relative isolate overflow-hidden rounded-[24px] border p-5 shadow-[0_12px_35px_-18px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.035)] backdrop-blur-xl transition-[border-color,box-shadow] duration-300 hover:border-sky-200/35 hover:shadow-[0_18px_45px_-18px_rgba(0,0,0,0.8),0_0_30px_-12px_rgba(56,189,248,0.16)] motion-reduce:transition-none sm:p-6 ${index === 0 ? "border-sky-300/25 bg-gradient-to-br from-[#122b42]/95 via-[#0e2033]/95 to-[#0b182a]/95" : "border-slate-300/[0.11] bg-gradient-to-br from-[#102236]/85 via-[#0d1b2d]/90 to-[#0a1728]/95"}`}
              >
                <div aria-hidden="true" className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-100 motion-reduce:transition-none ${index === 0 ? "bg-sky-300/[0.13] opacity-90" : "bg-sky-300/[0.08] opacity-60"}`} />
                <div aria-hidden="true" className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-sky-200/60 to-transparent ${index === 0 ? "opacity-90" : "opacity-30"}`} />
                <span aria-hidden="true" className="pointer-events-none absolute right-2 top-8 select-none text-[124px] font-semibold leading-none tracking-[-0.1em] text-sky-100/[0.035] sm:text-[140px]">0{index + 1}</span>
                <div className="relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-[17px] font-medium tracking-tight text-slate-100">{dayFormatter.format(date)}</h3>
                    <time dateTime={day.date} className="mt-1.5 block text-[11px] text-slate-400">{dateFormatter.format(date)}</time>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.12em] ${index === 0 ? "border-sky-200/20 bg-sky-200/10 text-sky-200" : "border-white/[0.08] bg-white/[0.025] text-slate-400"}`}>
                    {index === 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-200 shadow-[0_0_6px_rgba(186,230,253,0.6)]" />}Day 0{index + 1}
                  </span>
                </div>

                <div className="mt-8 grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[96px_minmax(0,1fr)] lg:grid-cols-[80px_minmax(0,1fr)] xl:grid-cols-[104px_minmax(0,1fr)]">
                  <div className="relative">
                    <div aria-hidden="true" className="absolute inset-1 rounded-full bg-sky-200/[0.07] blur-xl" />
                    <WeatherConditionIcon condition={day.condition} className="relative h-[72px] w-[72px] transition-transform duration-500 group-hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none sm:h-24 sm:w-24 lg:h-20 lg:w-20 xl:h-[104px] xl:w-[104px]" />
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="text-[10px] tracking-wide text-slate-400">สูงสุด</p>
                    <p className="mt-1 whitespace-nowrap text-[44px] font-medium leading-[1.1] tracking-[-0.065em] text-sky-50 sm:text-[52px] lg:text-[48px] xl:text-[56px]">
                      <span aria-label={`สูงสุด ${day.high.toFixed(1)} องศาเซลเซียส`}>{day.high.toFixed(1)}°</span>
                      <span className="ml-1 align-top text-xs font-normal leading-[2.5] tracking-normal text-sky-200/70">C</span>
                    </p>
                    <p className="mt-2 text-xs text-slate-400">ต่ำสุด <span aria-label={`ต่ำสุด ${day.low.toFixed(1)} องศาเซลเซียส`} className="ml-1 text-base font-normal tabular-nums text-slate-300">{day.low.toFixed(1)}°</span></p>
                  </div>
                </div>

                <p className="mt-4 flex items-center gap-2 text-[13px] text-slate-300"><span aria-hidden="true" className="h-1 w-1 rounded-full bg-sky-200/50" />{day.description}</p>
                <div className="mt-7 border-t border-sky-100/[0.07] pt-5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-400"><svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 text-sky-300/80"><path d="M8 2S3.5 7 3.5 10a4.5 4.5 0 0 0 9 0C12.5 7 8 2 8 2Z" stroke="currentColor" strokeWidth="1.2" /><path d="M6 10.5a2 2 0 0 0 2 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>โอกาสฝน</span>
                    <span className="font-medium tabular-nums text-sky-100">{day.rainChance}<span className="ml-0.5 font-normal text-slate-400">%</span></span>
                  </div>
                  <div aria-hidden="true" className="relative mt-3.5 h-1.5 rounded-full border border-white/[0.025] bg-[#071323]/90 shadow-inner">
                    <motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${day.rainChance}%` }} transition={{ duration: reduceMotion ? 0 : 0.8, delay: reduceMotion ? 0 : index * 0.08, ease: "easeOut" }} className="relative h-full rounded-full bg-gradient-to-r from-[#285b83] via-[#449dc1] to-[#a4e4f6] shadow-[0_0_10px_rgba(125,211,252,0.18)]">
                      <span className="absolute inset-x-1 top-0 h-px rounded-full bg-white/25" />
                    </motion.div>
                  </div>
                </div>
                </div>
              </motion.article>
            );
          })}
        </motion.div>
      )}

      <p className="mt-4 text-xs leading-6 text-slate-400">พยากรณ์จาก Open-Meteo สำหรับวันนี้และ 2 วันถัดไปตามเวลาไทย · โอกาสฝนคือค่าสูงสุดรายวัน · ไม่ใช่ข้อมูลย้อนหลังหรือประกาศเตือนภัย</p>
    </section>
  );
}
