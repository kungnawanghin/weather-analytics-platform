import AreaChart from "../ui/area-chart";
import type { WeatherSnapshot } from "../../lib/weather-data";

export default function WeatherAnalytics({ weather }: { weather: WeatherSnapshot }) {
  const mockHistory = weather.history;
  if (mockHistory.length === 0) {
    return <section className="mt-12 rounded-2xl border border-white/10 p-8"><h2 className="text-xl">Weather Analytics</h2><p className="mt-3 text-slate-400">ยังไม่มีข้อมูลย้อนหลังสำหรับ {weather.location}</p></section>;
  }
  const values = mockHistory.map((point) => point.value);
  const average =
    values.reduce((sum, value) => sum + value, 0) / values.length;

  const statistics = [
    { label: "Weekly average", value: average },
    { label: "Highest daily average", value: Math.max(...values) },
    { label: "Lowest daily average", value: Math.min(...values) },
  ];

  return (
    <section
      aria-labelledby="analytics-title"
      className="mt-20 border-t border-white/10 pt-12"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-sky-300">
            Beyond the numbers
          </p>

          <h2
            id="analytics-title"
            className="mt-3 text-2xl font-semibold sm:text-3xl"
          >
            Weather Analytics
          </h2>

          <p className="mt-3 text-sm text-slate-400">
            Temperature patterns · {weather.location}
          </p>
        </div>

        <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
          Demo · Mock data
        </span>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {statistics.map((statistic) => (
          <article
            key={statistic.label}
            className="rounded-2xl border border-white/10 bg-slate-900 p-5"
          >
            <h3 className="text-sm text-slate-400">
              {statistic.label}
            </h3>

            <p className="mt-3 text-3xl font-semibold">
              {statistic.value.toFixed(1)}
              <span className="ml-1 text-lg text-sky-200">°C</span>
            </p>
          </article>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-medium">Temperature overview</h3>
            <p className="mt-2 text-xs text-slate-400">
              Daily average temperature · °C
            </p>
          </div>

          <span className="rounded-lg bg-sky-400/10 px-3 py-1 text-xs text-sky-300">
            Sample week · 7 days
          </span>
        </div>

        <AreaChart
          key={weather.location}
          data={mockHistory}
          unit="°C"
          label={`Sample daily average temperatures for ${weather.location}`}
        />

        <details className="mt-5 text-xs text-slate-400">
          <summary className="cursor-pointer hover:text-sky-200">
            View sample data
          </summary>

          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {mockHistory.map((point) => (
              <li key={point.label}>
                {point.label}: {point.value.toFixed(1)}°C
              </li>
            ))}
          </ul>
        </details>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        Demonstration data only. Highest and lowest values refer to
        daily averages. The vertical axis adjusts to the data range.
      </p>
    </section>
  );
}
