/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node test uses the project's TS loader. */
const assert = require('node:assert/strict');
require('./generate-weather-locations.cjs');
const { historyWindow, parseWeatherHistory } = require('../lib/weather-history.ts');
const { getAreaHistory } = require('../lib/weather-history-service.ts');
const { latPhrao, weatherLocations } = require('../lib/live-weather.ts');
const { summarizeHistory } = require('../lib/weather-analytics.ts');
const { getWeatherInsights } = require('../lib/weather-insights.ts');
const { GET } = require('../app/api/weather/history/route.ts');

function fixture(window) {
  const hourly = { time: [], temperature_2m: [], relative_humidity_2m: [] };
  for (let d = 0; d < 30; d++) for (let h = 0; h < 24; h++) {
    const date = new Date(Date.parse(window.startDate + 'T00:00:00Z') + d * 86400000).toISOString().slice(0,10);
    hourly.time.push(`${date}T${String(h).padStart(2,'0')}:00`);
    hourly.temperature_2m.push(20 + d / 10 + h / 24);
    hourly.relative_humidity_2m.push(60 + d / 10);
  }
  return { timezone: 'Asia/Bangkok', hourly_units: { temperature_2m: '°C', relative_humidity_2m: '%' }, hourly };
}
async function run() {
  const window = historyWindow(new Date('2026-11-13T17:00:00Z'));
  assert.deepEqual(window, { startDate: '2026-10-09', endDate: '2026-11-07' });
  assert.equal(historyWindow(new Date('2026-11-13T16:59:59Z')).endDate, '2026-11-06');
  assert.deepEqual(historyWindow(new Date('2024-03-08T05:00:00Z')), { startDate: '2024-02-01', endDate: '2024-03-01' });
  const input = fixture(window);
  const data = parseWeatherHistory(input, latPhrao, window, '2026-11-13T17:00:00Z');
  assert.equal(data.history.length,30);
  assert.equal(data.history[0].temperature, input.hourly.temperature_2m.slice(0,24).reduce((a,b)=>a+b,0)/24);
  assert.equal(data.history.at(-1).date,window.endDate);
  for (const location of weatherLocations) assert.equal(parseWeatherHistory(input, location, window, data.fetchedAt).areaId,location.area.id);
  for (const metric of ['temperature','humidity']) for (const range of [7,30]) {
    const summary = summarizeHistory(data.history,metric,range);
    const insight = getWeatherInsights(data.history,metric,range);
    assert.equal(summary.count,range);
    assert.equal(insight.comparison.last.count,3);
    assert.ok(insight.comparison.delta > 0);
    assert.deepEqual(summary.points.map(p=>p.date), data.history.slice(-range).map(p=>p.date));
  }
  const missing = structuredClone(input);
  missing.hourly.temperature_2m[719] = null;
  const partial = parseWeatherHistory(missing,latPhrao,window,data.fetchedAt);
  assert.equal(partial.history.at(-1).temperature,null);
  assert.notEqual(partial.history.at(-1).humidity,null);
  assert.equal(summarizeHistory(partial.history,'temperature',7).count,6);
  assert.equal(getWeatherInsights(partial.history,'temperature',7).comparison.delta,null);
  const duplicate = structuredClone(input); duplicate.hourly.time[1] = duplicate.hourly.time[0];
  assert.throws(()=>parseWeatherHistory(duplicate,latPhrao,window,data.fetchedAt));
  const wrongUnit = structuredClone(input); wrongUnit.hourly_units.temperature_2m = '°F';
  assert.throws(()=>parseWeatherHistory(wrongUnit,latPhrao,window,data.fetchedAt));
  const empty = structuredClone(input); empty.hourly.temperature_2m.fill(null); empty.hourly.relative_humidity_2m.fill(null);
  assert.equal(summarizeHistory(parseWeatherHistory(empty,latPhrao,window,data.fetchedAt).history,'humidity',30).average,null);

  const realFetch = global.fetch;
  let calls=0, fail=false;
  global.fetch = async url => {
    calls++; const request = new URL(url);
    assert.equal(request.hostname,'archive-api.open-meteo.com');
    assert.equal(request.searchParams.get('models'),'era5');
    return new Response(JSON.stringify(fixture({startDate:request.searchParams.get('start_date')})),{status:fail?503:200});
  };
  try {
    assert.equal((await GET(new Request('http://localhost/api/weather/history'))).status,400);
    assert.equal((await GET(new Request('http://localhost/api/weather/history?areaId=unknown'))).status,404);
    assert.equal(calls,0);
    const [a,b] = await Promise.all([getAreaHistory('TH-10'),getAreaHistory('TH-10')]);
    assert.strictEqual(a,b); assert.equal(calls,1);
    await getAreaHistory('TH-10'); assert.equal(calls,1);
    await getAreaHistory('TH-12'); assert.equal(calls,2);
    fail=true;
    assert.equal((await GET(new Request('http://localhost/api/weather/history?areaId=TH-13'))).status,502);
    fail=false;
    assert.equal((await GET(new Request('http://localhost/api/weather/history?areaId=TH-13'))).status,200);
    assert.equal(calls,4);
  } finally { global.fetch=realFetch; }
  console.log('PASS: ERA5, 85 area IDs, 30-day/Bangkok/leap-year windows, exact 24-hour means, independent missing values, 7/30-day analytics and insights, units, duplicate hours, empty data, API validation, cache and retry');
}
run().catch(error=>{console.error(error);process.exitCode=1;});
