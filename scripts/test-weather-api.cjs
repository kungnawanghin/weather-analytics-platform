/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node audit with the generator's TS loader. */
const assert = require('node:assert/strict');
const { generate } = require('./generate-weather-locations.cjs');
const registry = require('../lib/weather-locations.json');
const { parseLiveWeather } = require('../lib/live-weather.ts');
const { getAreaWeather } = require('../lib/weather-service.ts');
const { GET } = require('../app/api/weather/route.ts');

const payload = {
  timezone: 'Asia/Bangkok',
  current: { time: '2026-11-13T23:45', temperature_2m: 27, relative_humidity_2m: 80, wind_speed_10m: 6, weather_code: 95 },
  daily: { time: ['2026-11-13', '2026-11-14', '2026-11-15'], temperature_2m_max: [32,33,34], temperature_2m_min: [24,25,26], precipitation_probability_max: [70,60,50], weather_code: [0,3,80] },
};

async function run() {
  // Generation checks every rounded point is inside its own boundary, excluding holes.
  assert.deepEqual(registry, generate());
  assert.equal(registry.filter(x => x.area.level === 'province').length, 6);
  assert.equal(registry.filter(x => x.area.level === 'district').length, 79);
  for (const location of registry) {
    const result = parseLiveWeather(payload, '2026-11-13T16:50:00Z', location);
    assert.ok(result.location.startsWith(location.area.name));
    assert.ok(result.reference.includes(String(location.latitude)));
    assert.equal(result.history.length, 0);
    assert.equal(result.forecast.length, 3);
    assert.equal(result.live.validAt, '2026-11-13T23:45:00+07:00');
  }
  for (const mutate of [x => x.current.temperature_2m = null, x => x.current.relative_humidity_2m = 101, x => x.daily.temperature_2m_max = [], x => x.daily.temperature_2m_min[0] = 40]) {
    const broken = structuredClone(payload); mutate(broken);
    assert.throws(() => parseLiveWeather(broken, '2026-11-13T16:50:00Z'));
  }
  const realFetch = global.fetch, RealDate = Date;
  let calls = 0, fail = false, instant = RealDate.parse('2026-11-13T16:59:00Z');
  global.Date = class extends RealDate {
    constructor(...args) { if (args.length) super(...args); else super(instant); }
    static now() { return instant; }
  };
  global.fetch = async url => {
    calls++;
    assert.equal(new URL(url).hostname, 'api.open-meteo.com');
    return new Response(JSON.stringify(fail ? {} : payload), { status: fail ? 503 : 200 });
  };
  try {
    assert.equal((await GET(new Request('http://localhost/api/weather'))).status, 400);
    assert.equal((await GET(new Request('http://localhost/api/weather?areaId=unknown'))).status, 404);
    assert.equal(calls, 0);
    const [a,b] = await Promise.all([getAreaWeather('TH-10'), getAreaWeather('TH-10')]);
    assert.strictEqual(a,b); assert.equal(calls,1);
    await getAreaWeather('TH-10'); assert.equal(calls,1);
    const other = await getAreaWeather('TH-12'); assert.notEqual(other.location,a.location); assert.equal(calls,2);
    instant += 60001; // Bangkok midnight, still within five-minute TTL.
    await getAreaWeather('TH-10'); assert.equal(calls,3);
    instant += 300001;
    await getAreaWeather('TH-10'); assert.equal(calls,4);
    fail = true;
    assert.equal((await GET(new Request('http://localhost/api/weather?areaId=TH-13'))).status,502);
    fail = false;
    assert.equal((await GET(new Request('http://localhost/api/weather?areaId=TH-13'))).status,200);
    assert.equal(calls,6); // A failed request was not cached.
  } finally { global.fetch = realFetch; global.Date = RealDate; }
  console.log('PASS: 85 area mappings/interior points, parsing, missing values, invalid IDs, request coalescing, per-area cache, expiry, Bangkok midnight and failed-request retry');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
