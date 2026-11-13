"use client";

import { useState } from "react";
import AreaChart from "../ui/area-chart";
import WeatherInsights from "./WeatherInsights";
import type { WeatherHistory } from "../../lib/weather-history";
import {
  analyticsMetrics,
  summarizeHistory,
  type AnalyticsMetric,
  type AnalyticsRange,
} from "../../lib/weather-analytics";

const shortDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", timeZone: "Asia/Bangkok",
});
const fullDate = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
});
function formatDate(date: string, full = false) {
  return (full ? fullDate : shortDate).format(new Date(`${date}T12:00:00+07:00`));
}

export default function WeatherAnalytics({ weather }: { weather: WeatherHistory }) {
  const [metric, setMetric] = useState<AnalyticsMetric>("temperature");
  const [range, setRange] = useState<AnalyticsRange>(7);
  const config = analyticsMetrics[metric];
  const summary = summarizeHistory(weather.history, metric, range);
  const chartData = summary.points.map((point) => ({
    ...point,
    label: formatDate(point.date),
    tooltipLabel: formatDate(point.date, true),
  }));
  const period = summary.startDate && summary.endDate
    ? `${formatDate(summary.startDate, true)} – ${formatDate(summary.endDate, true)}`
    : "ยังไม่มีช่วงข้อมูล";
  const statistics = [
    { label: "ค่าเฉลี่ยช่วงที่เลือก", value: summary.average },
    { label: "ค่าเฉลี่ยรายวันสูงสุด", value: summary.maximum },
    { label: "ค่าเฉลี่ยรายวันต่ำสุด", value: summary.minimum },
  ];

  return (
    <section
      id="weather-analytics"
      aria-labelledby="analytics-title"
      className="mt-20 scroll-mt-8 border-t border-white/10 pt-12"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">03 / Beyond the numbers</p>
          <h2 id="analytics-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Weather Analytics</h2>
          <p className="mt-3 text-sm text-slate-400">{config.patterns} · {weather.location}</p>
        </div>
        <span className="rounded-full border border-amber-200/15 bg-amber-200/5 px-3 py-1.5 text-[11px] text-amber-200">Open-Meteo · ERA5 Reanalysis</span>
      </div>

      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-y border-sky-200/10 py-4">
        <div role="group" aria-label="ข้อมูลที่วิเคราะห์" className="flex flex-wrap gap-1">
          {(Object.keys(analyticsMetrics) as AnalyticsMetric[]).map((key) => (
            <button
              key={key} type="button" aria-pressed={metric === key}
              onClick={() => setMetric(key)}
              className={`min-h-10 rounded-xl px-4 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${metric === key ? "bg-sky-200/15 text-sky-100" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
            >
              {analyticsMetrics[key].name}
            </button>
          ))}
        </div>
        <div role="group" aria-label="ช่วงข้อมูลย้อนหลัง" className="flex gap-1 rounded-xl border border-white/10 bg-black/15 p-1">
          {([7, 30] as const).map((days) => (
            <button
              key={days} type="button" aria-pressed={range === days}
              onClick={() => setRange(days)}
              className={`min-h-9 rounded-lg px-4 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${range === days ? "bg-sky-200 text-slate-950" : "text-slate-400 hover:text-white"}`}
            >
              {days} วัน
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs leading-6 text-slate-400">
        <p>ช่วงข้อมูลย้อนหลัง · {period}</p>
        <p role="status" aria-atomic="true">{config.name} · {range} วัน · ข้อมูล {summary.count}/{range} วัน</p>
      </div>

      {summary.count > 0 && summary.count < range && (
        <p role="status" className="mt-3 rounded-xl border border-amber-200/15 bg-amber-200/5 px-4 py-3 text-xs leading-6 text-amber-200">
          ข้อมูลยังไม่ครบช่วงที่เลือก สถิติคำนวณจาก {summary.count} วันที่มีข้อมูล ไม่เติมวันที่ขาดด้วยศูนย์ · เส้นกราฟเว้นช่วงวันที่ไม่มีข้อมูล
        </p>
      )}

      <div className="mt-6 grid grid-cols-3 divide-x divide-white/10 border-b border-white/10 pb-6">
        {statistics.map((statistic) => (
          <article key={statistic.label} className="min-w-0 px-2 py-4 first:pl-0 sm:px-7">
            <h3 className="text-[10px] leading-5 text-slate-400 sm:text-xs">{statistic.label}</h3>
            <p className="mt-3 text-[26px] font-light tabular-nums tracking-tight text-slate-100 sm:text-4xl">
              {statistic.value === null ? "—" : statistic.value.toFixed(1)}
              <span className="ml-0.5 text-xs text-sky-200 sm:ml-1.5 sm:text-lg">{config.unit}</span>
            </p>
          </article>
        ))}
      </div>

      <div className="surface mt-6 overflow-hidden rounded-[28px] p-4 sm:p-7">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium text-slate-100">{config.title}</h3>
            <p className="mt-2 flex items-center gap-2 text-xs leading-6 text-slate-400">
              <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ background: config.color }} />
              {config.dailyLabel} · {config.unit}
            </p>
          </div>
          <span className="rounded-lg bg-sky-400/10 px-3 py-1.5 text-[11px] text-sky-200">{range} วัน · {summary.count} จุดข้อมูล</span>
        </div>

        {summary.count === 0 ? (
          <p role="status" className="py-20 text-center text-sm leading-7 text-slate-400">ยังไม่มีข้อมูล{config.name}ในช่วงนี้สำหรับ {weather.location}</p>
        ) : (
          <AreaChart
            key={`${weather.location}-${metric}-${range}`}
            data={chartData}
            unit={config.unit}
            color={config.color}
            valueLabel={config.dailyLabel}
            valueDomain={metric === "humidity" ? [0, 100] : undefined}
            label={`${config.dailyLabel} ${range} วัน · ${weather.location}`}
          />
        )}

        <p className="mt-3 text-[11px] leading-6 text-slate-400">
          {metric === "humidity" ? "แกนตั้งแสดงความชื้นสัมพัทธ์ 0–100%" : "แกนตั้งปรับตามช่วงอุณหภูมิของข้อมูล"}
          {" · "}ชี้หรือแตะกราฟเพื่อดูค่า หรือใช้ปุ่มลูกศรเมื่อเลือกกราฟด้วยคีย์บอร์ด
        </p>

        {summary.count > 0 && (
          <details className="mt-5 border-t border-white/[0.07] pt-4 text-xs text-slate-400">
            <summary className="w-fit cursor-pointer rounded py-1 hover:text-sky-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">ดูข้อมูลรายวัน · {summary.count} วัน</summary>
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">{config.dailyLabel} ของ {weather.location} ช่วง {period}</caption>
                <thead className="sticky top-0 bg-[#14263a] text-slate-300">
                  <tr><th scope="col" className="px-4 py-3 font-medium">วันที่</th><th scope="col" className="px-4 py-3 text-right font-medium">{config.name} ({config.unit})</th></tr>
                </thead>
                <tbody>
                  {summary.points.map((point) => (
                    <tr key={point.date} className="border-t border-white/5">
                      <td className="px-4 py-3"><time dateTime={point.date}>{formatDate(point.date, true)}</time></td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-200">{point.value.toFixed(1)}{config.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">
        ข้อมูลย้อนหลัง ERA5 จาก Open-Meteo · ช่วง 7 วันใช้ 7 วันท้ายของชุด 30 วัน · เว้น 7 วันล่าสุดเพื่อเผื่อรอบเผยแพร่ข้อมูลย้อนหลัง
        <br />
        ค่าสูงสุด–ต่ำสุดหมายถึงค่าเฉลี่ยรายวันที่สูงสุด–ต่ำสุด ไม่ใช่ค่าสูงสุด–ต่ำสุดรายชั่วโมง · ทุกวันมีน้ำหนักเท่ากันในการหาค่าเฉลี่ย
      </p>
      <p className="mt-3 text-xs leading-6 text-slate-400">ข้อมูลวิเคราะห์ย้อนหลัง ไม่ใช่ค่าจากสถานีในเขตโดยตรง · ค่าเฉลี่ยคำนวณจากข้อมูลครบ 24 ชั่วโมงต่อวัน ไม่เติมค่าที่ขาด · ดึงข้อมูล <time dateTime={weather.fetchedAt}>{new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(weather.fetchedAt))}</time> (ไทย)<br/>Source: <a className="underline text-sky-200" href="https://open-meteo.com/en/docs/historical-weather-api" target="_blank" rel="noreferrer">Open-Meteo / ECMWF ERA5</a> · <a className="underline" href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · แปลงรายชั่วโมงเป็นค่าเฉลี่ยรายวันและสถิติ</p>
      <WeatherInsights history={weather.history} location={weather.location} metric={metric} range={range} />
    </section>
  );
}
