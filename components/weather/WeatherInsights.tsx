import type { WeatherHistoryDay } from "../../lib/weather-data";
import { analyticsMetrics, type AnalyticsMetric, type AnalyticsRange } from "../../lib/weather-analytics";
import { getWeatherInsights } from "../../lib/weather-insights";

interface WeatherInsightsProps {
  history: WeatherHistoryDay[];
  location: string;
  metric: AnalyticsMetric;
  range: AnalyticsRange;
}

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok",
});
const shortFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric", month: "short", timeZone: "Asia/Bangkok",
});
function formatDate(date: string, short = false) {
  return (short ? shortFormatter : dateFormatter).format(new Date(`${date}T12:00:00+07:00`));
}

function InsightIcon({ type }: { type: "temperature" | "humidity" | "change" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      {type === "temperature" && <><path d="M9 14.5V5a3 3 0 0 1 6 0v9.5a5 5 0 1 1-6 0Z" /><path d="M12 8v9" /><circle cx="12" cy="18" r="1.5" fill="currentColor" stroke="none" /></>}
      {type === "humidity" && <><path d="M12 3S5 10.5 5 15a7 7 0 0 0 14 0c0-4.5-7-12-7-12Z" /><path d="M8 15a4 4 0 0 0 4 4" /></>}
      {type === "change" && <path d="M7 19V5m-4 4 4-4 4 4m6-4v14m-4-4 4 4 4-4" />}
    </svg>
  );
}

function PeakDates({ dates }: { dates: string[] }) {
  if (dates.length === 0) return <p className="mt-3 text-sm text-slate-400">ยังไม่มีข้อมูลที่ใช้สรุปได้</p>;
  return (
    <div className="mt-3 text-sm leading-6 text-slate-300">
      <time dateTime={dates[0]}>{formatDate(dates[0])}</time>
      {dates.length > 1 && (
        <details className="mt-2 text-xs text-slate-400">
          <summary className="w-fit cursor-pointer rounded py-1 text-sky-200 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300">ค่าสูงสุดร่วมกัน {dates.length} วัน · ดูวันที่</summary>
          <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
            {dates.map((date) => <li key={date}><time dateTime={date}>{formatDate(date)}</time></li>)}
          </ul>
        </details>
      )}
    </div>
  );
}

export default function WeatherInsights({ history, location, metric, range }: WeatherInsightsProps) {
  const insight = getWeatherInsights(history, metric, range);
  const config = analyticsMetrics[metric];
  const { first, last, delta } = insight.comparison;
  const roundedDelta = delta === null ? null : Number(delta.toFixed(1));
  const direction = roundedDelta === null ? "ข้อมูลไม่เพียงพอ" : roundedDelta > 0 ? "เพิ่มขึ้น" : roundedDelta < 0 ? "ลดลง" : "ใกล้เคียงกัน";
  const differenceUnit = metric === "humidity" ? "จุดเปอร์เซ็นต์" : "°C";
  const windowLabel = (dates: string[]) => dates.length
    ? `${formatDate(dates[0], true)} – ${formatDate(dates[dates.length - 1], true)}` : "ยังไม่มีช่วงข้อมูล";
  const cardClass = "relative flex min-w-0 flex-col overflow-hidden rounded-[22px] border border-sky-200/10 bg-gradient-to-br from-[#102438] via-[#0c1b2c] to-[#0a1626] p-5 sm:p-6";

  return (
    <section id="weather-insights" aria-labelledby="insights-title" className="mt-12 scroll-mt-8 border-t border-white/[0.07] pt-9">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-sky-300">The story in the data</p>
          <h3 id="insights-title" className="mt-3 text-2xl font-semibold tracking-tight text-slate-100">Weather Insights</h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">{location} · ช่วง {range} วันที่เลือก</p>
        </div>
        <span className="rounded-full border border-sky-200/15 bg-sky-200/5 px-3 py-1.5 text-[10px] text-sky-200">Calculated · Mock data</span>
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">
        {insight.startDate && insight.endDate ? `${formatDate(insight.startDate)} – ${formatDate(insight.endDate)}` : "ยังไม่มีข้อมูลย้อนหลัง"}
        {" · "}สรุปจากข้อมูลชุดเดียวกับกราฟ
      </p>

      <div className="mt-5 grid items-stretch gap-4 lg:grid-cols-3">
        <article className={cardClass}>
          <div aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-sky-300/5 blur-2xl" />
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-xl border border-sky-200/10 bg-sky-200/5 p-2 text-sky-200"><InsightIcon type="temperature" /></span>
            <span aria-hidden="true" className="text-[10px] tracking-widest text-slate-500">01 / WARMEST DAY</span>
          </div>
          <h4 className="text-sm font-medium leading-6 text-slate-300">วันที่อุณหภูมิเฉลี่ยสูงสุด</h4>
          <p className="mt-4 text-4xl font-medium tabular-nums tracking-tight text-sky-100">
            {insight.hottest.value === null ? "—" : insight.hottest.value.toFixed(1)}<span className="ml-1.5 text-lg text-sky-200/80">°C</span>
          </p>
          <PeakDates dates={insight.hottest.dates} />
          <p className="mt-auto pt-6 text-xs leading-6 text-slate-400">ค่าสูงสุดของค่าเฉลี่ยรายวัน จากข้อมูลอุณหภูมิ {insight.hottest.count}/{range} วันในช่วงที่เลือก</p>
        </article>

        <article className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-xl border border-cyan-200/10 bg-cyan-200/5 p-2 text-cyan-200"><InsightIcon type="humidity" /></span>
            <span aria-hidden="true" className="text-[10px] tracking-widest text-slate-500">02 / MOST HUMID</span>
          </div>
          <h4 className="text-sm font-medium leading-6 text-slate-300">วันที่ความชื้นเฉลี่ยสูงสุด</h4>
          <p className="mt-4 text-4xl font-medium tabular-nums tracking-tight text-cyan-100">
            {insight.mostHumid.value === null ? "—" : insight.mostHumid.value.toFixed(1)}<span className="ml-1.5 text-lg text-cyan-200/80">%</span>
          </p>
          <PeakDates dates={insight.mostHumid.dates} />
          <p className="mt-auto pt-6 text-xs leading-6 text-slate-400">ค่าสูงสุดของค่าเฉลี่ยรายวัน จากข้อมูลความชื้น {insight.mostHumid.count}/{range} วันในช่วงที่เลือก</p>
        </article>

        <article className={cardClass}>
          <div className="mb-5 flex items-center justify-between">
            <span className="rounded-xl border border-sky-200/10 bg-sky-200/5 p-2 text-sky-200"><InsightIcon type="change" /></span>
            <span aria-hidden="true" className="text-[10px] tracking-widest text-slate-500">03 / PERIOD SHIFT</span>
          </div>
          <h4 className="text-sm font-medium leading-6 text-slate-300">3 วันท้าย เทียบ 3 วันแรก</h4>
          <p className="mt-3 text-xs text-slate-400">{config.name}เฉลี่ย · {direction}</p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2 text-3xl font-medium tabular-nums tracking-tight text-sky-100">
            <span>{roundedDelta === null ? "—" : `${roundedDelta > 0 ? "+" : roundedDelta < 0 ? "−" : ""}${Math.abs(roundedDelta).toFixed(1)}`}</span>
            <span className="text-xs font-normal tracking-normal text-sky-200">{differenceUnit}</span>
          </p>
          <dl className="mt-5 space-y-3 border-t border-white/[0.07] pt-4 text-xs leading-5">
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-slate-400">ต้นช่วง · {windowLabel(first.dates)}</dt>
              <dd className="ml-auto whitespace-nowrap tabular-nums text-slate-200">{first.average === null ? `ข้อมูล ${first.count}/3 วัน` : `${first.average.toFixed(1)}${config.unit}`}</dd>
            </div>
            <div className="flex flex-wrap justify-between gap-x-3 gap-y-1">
              <dt className="text-slate-400">ท้ายช่วง · {windowLabel(last.dates)}</dt>
              <dd className="ml-auto whitespace-nowrap tabular-nums text-slate-200">{last.average === null ? `ข้อมูล ${last.count}/3 วัน` : `${last.average.toFixed(1)}${config.unit}`}</dd>
            </div>
          </dl>
          <p className="mt-auto pt-5 text-xs leading-6 text-slate-400">{delta === null ? "ต้องมีข้อมูลครบ 3 วันต้นช่วงและ 3 วันท้ายช่วง โดยไม่แทนวันที่ขาดด้วยวันอื่น" : "ผลต่าง = ค่าเฉลี่ย 3 วันท้าย − ค่าเฉลี่ย 3 วันแรก คำนวณก่อนปัดเศษ"}</p>
        </article>
      </div>

      <p className="mt-4 text-xs leading-6 text-slate-400">เป็นการสรุปข้อมูลสมมติในช่วงที่เลือก ไม่ใช่พยากรณ์หรือข้อสรุปแนวโน้มระยะยาว · ปัดค่าที่แสดงเป็นทศนิยม 1 ตำแหน่ง{metric === "humidity" ? " · ผลต่างความชื้นใช้จุดเปอร์เซ็นต์ เช่น 60% → 65% เท่ากับ +5 จุดเปอร์เซ็นต์" : ""}</p>
    </section>
  );
}
