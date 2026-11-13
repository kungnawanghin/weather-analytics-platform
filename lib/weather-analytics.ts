import type { WeatherHistoryDay } from "./weather-data";

export type AnalyticsMetric = "temperature" | "humidity";
export type AnalyticsRange = 7 | 30;

export const analyticsMetrics = {
  temperature: {
    name: "อุณหภูมิ", title: "Temperature overview", patterns: "Temperature patterns",
    dailyLabel: "อุณหภูมิเฉลี่ยรายวัน", unit: "°C", color: "#38bdf8",
  },
  humidity: {
    name: "ความชื้น", title: "Humidity overview", patterns: "Humidity patterns",
    dailyLabel: "ความชื้นสัมพัทธ์เฉลี่ยรายวัน", unit: "%", color: "#67d9e8",
  },
} as const;

const dayMs = 86_400_000;

function isDateKey(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === date;
}

/** Use calendar days ending at the dataset's latest date, not the machine clock.
 * Missing/invalid values stay missing and are never replaced with zeros.
 */
export function summarizeHistory(history: WeatherHistoryDay[], metric: AnalyticsMetric, range: AnalyticsRange) {
  const byDate = new Map<string, WeatherHistoryDay>();
  for (const row of history) {
    if (isDateKey(row.date)) byDate.set(row.date, row);
  }
  const sorted = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  const endDate = sorted.at(-1)?.date ?? null;
  const startDate = endDate
    ? new Date(Date.parse(`${endDate}T00:00:00Z`) - (range - 1) * dayMs).toISOString().slice(0, 10)
    : null;
  const points = sorted
    .filter((row) => startDate && row.date >= startDate && typeof row[metric] === "number" && Number.isFinite(row[metric]) &&
      (metric !== "humidity" || (row.humidity !== null && row.humidity >= 0 && row.humidity <= 100)))
    .map((row) => ({ date: row.date, value: row[metric] as number }));
  const values = points.map((point) => point.value);
  return {
    points, startDate, endDate, count: points.length, expectedCount: range,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    maximum: values.length ? Math.max(...values) : null,
    minimum: values.length ? Math.min(...values) : null,
  };
}
