/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
require('./generate-weather-locations.cjs');
const Module = require('node:module');
const originalLoad = Module._load;
// Next enforces server-only at build time; this isolated Node harness has no client.
Module._load = function (name, ...args) { return name === 'server-only' ? {} : originalLoad.call(this, name, ...args); };
const { getAreaHistory } = require('../lib/weather-history-service.ts');
const { GET } = require('../app/api/weather/history/route.ts');
Module._load = originalLoad;
const { aggregateCollectedHistory, collectionWindow } = require('../lib/collected-weather-history.ts');
const { latPhrao } = require('../lib/live-weather.ts');
const { summarizeHistory } = require('../lib/weather-analytics.ts');
const { getWeatherInsights } = require('../lib/weather-insights.ts');

const now = new Date('2026-11-16T06:00:00Z');
function row(time, temperature = 30, id = latPhrao.area.id) {
  return { area_id: id, source: 'open-meteo', model: 'best_match', valid_at: time, fetched_at: time, temperature_c: temperature, humidity_percent: 70 };
}
async function run() {
  assert.deepEqual(collectionWindow(new Date('2026-11-15T17:00:00Z')), { startDate: '2026-10-18', endDate: '2026-11-16' });
  assert.equal(collectionWindow(new Date('2026-11-15T16:59:59Z')).endDate, '2026-11-15');
  const rows = [row('2026-11-14T17:15:00Z', 20), row('2026-11-14T17:45:00Z', 30), row('2026-11-14T18:15:00Z', 40), row('2026-11-15T17:15:00Z', 24)];
  const data = aggregateCollectedHistory(rows, latPhrao, now);
  assert.equal(data.history.length, 30);
  assert.equal(data.history.at(-2).date, '2026-11-15');
  assert.equal(data.history.at(-2).temperature, 35);
  assert.equal(data.history.at(-2).samples, 2);
  assert.equal(data.history.at(-1).temperature, 24);
  assert.equal(data.history[0].temperature, null);
  assert.equal(summarizeHistory(data.history, 'temperature', 7).count, 2);
  assert.equal(summarizeHistory(data.history, 'temperature', 30).count, 2);
  assert.equal(getWeatherInsights(data.history, 'temperature', 7).comparison.delta, null);
  const full = Array.from({ length: 24 }, (_, h) => row(new Date(Date.parse('2026-11-14T17:00:00Z') + h * 3600000).toISOString(), h));
  const complete = aggregateCollectedHistory(full, latPhrao, now).history.at(-2);
  assert.equal(complete.samples, 24); assert.equal(complete.temperature, 11.5);
  assert.equal(aggregateCollectedHistory([], latPhrao, now).history.every(day => day.temperature === null && day.samples === 0), true);
  assert.throws(() => aggregateCollectedHistory([row('2026-11-16T07:00:00Z')], latPhrao, now));
  assert.throws(() => aggregateCollectedHistory([row('2026-11-15T17:15:00Z', 30, 'wrong')], latPhrao, now));
  assert.throws(() => aggregateCollectedHistory([{ ...rows[0], humidity_percent: null }], latPhrao, now));

  const realFetch = global.fetch;
  const oldUrl = process.env.SUPABASE_URL, oldKey = process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_test_only';
  let calls = 0, fail = false;
  global.fetch = async (input, options) => {
    calls++;
    const url = new URL(input);
    assert.equal(url.hostname, 'test.supabase.co');
    assert.equal(options.headers.apikey, 'sb_secret_test_only');
    assert.equal(url.searchParams.get('source'), 'eq.open-meteo');
    assert.equal(url.searchParams.get('model'), 'eq.best_match');
    assert.equal(url.searchParams.getAll('valid_at').length, 2);
    if (fail) return Response.json({}, { status: 503 });
    if (url.searchParams.get('offset') !== '0') return Response.json([]);
    const time = new Date(Date.now() - 3600000).toISOString();
    return Response.json([row(time, 30, url.searchParams.get('area_id').slice(3))]);
  };
  try {
    assert.equal((await GET(new Request('http://localhost/api/weather/history'))).status, 400);
    assert.equal((await GET(new Request('http://localhost/api/weather/history?areaId=unknown'))).status, 404);
    assert.equal(calls, 0);
    const [a, b] = await Promise.all([getAreaHistory('TH-10'), getAreaHistory('TH-10')]);
    assert.strictEqual(a, b); assert.equal(calls, 2); // data page + end page
    await getAreaHistory('TH-10'); assert.equal(calls, 2);
    fail = true;
    const errorResponse = await GET(new Request('http://localhost/api/weather/history?areaId=TH-12'));
    assert.equal(errorResponse.status, 502);
    assert.equal((await errorResponse.text()).includes('sb_secret'), false);
    fail = false;
    const response = await GET(new Request('http://localhost/api/weather/history?areaId=TH-12'));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).model, 'best_match');
  } finally {
    global.fetch = realFetch;
    if (oldUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined) delete process.env.SUPABASE_SECRET_KEY; else process.env.SUPABASE_SECRET_KEY = oldKey;
  }
  console.log('PASS: collected history, Bangkok dates, hourly deduplication, partial coverage, missing days, 7/30 ranges, incomplete-day insights, pagination, API validation, cache, retry and secret isolation');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
