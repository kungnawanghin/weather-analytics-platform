import type { WeatherHistoryDay } from "./weather-data";
import { summarizeHistory, type AnalyticsMetric, type AnalyticsRange } from "./weather-analytics";

interface InsightPoint { date: string; value: number }

function highestDay(points: InsightPoint[]) {
  const value = points.length ? Math.max(...points.map((point) => point.value)) : null;
  return {
    value,
    dates: value === null ? [] : points.filter((point) => point.value === value).map((point) => point.date),
    count: points.length,
  };
}

function meanWindow(points: InsightPoint[], dates: string[]) {
  const dateSet = new Set(dates);
  const rows = points.filter((point) => dateSet.has(point.date));
  return {
    dates,
    count: rows.length,
    // A missing day invalidates the comparison rather than changing the window.
    average: dates.length === 3 && rows.length === 3
      ? rows.reduce((sum, point) => sum + point.value, 0) / 3
      : null,
  };
}

/** Compare explicitly dated, non-overlapping calendar windows, not three
 * arbitrarily available records. No missing measurement is filled with zero.
 */
export function getWeatherInsights(history: WeatherHistoryDay[], metric: AnalyticsMetric, range: AnalyticsRange) {
  const temperature = summarizeHistory(history, "temperature", range);
  const humidity = summarizeHistory(history, "humidity", range);
  const selected = metric === "temperature" ? temperature : humidity;
  const dateOffset = (date: string, offset: number) =>
    new Date(Date.parse(`${date}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10);
  const firstDates = selected.startDate
    ? [0, 1, 2].map((offset) => dateOffset(selected.startDate!, offset)) : [];
  const lastDates = selected.endDate
    ? [-2, -1, 0].map((offset) => dateOffset(selected.endDate!, offset)) : [];
  const first = meanWindow(selected.points, firstDates);
  const last = meanWindow(selected.points, lastDates);

  return {
    startDate: selected.startDate,
    endDate: selected.endDate,
    hottest: highestDay(temperature.points),
    mostHumid: highestDay(humidity.points),
    comparison: {
      first, last,
      delta: first.average === null || last.average === null ? null : last.average - first.average,
    },
  };
}
