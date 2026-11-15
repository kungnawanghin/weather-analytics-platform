/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { createStore } = require("./supabase-store.cjs");
const { parseCurrent, collect } = require("./collect-supabase.cjs");
const locations = require("../lib/weather-locations.json");
const env = { SUPABASE_URL: "https://test.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_fixture_only" };
function fixture() {
  return { current_units: { time: "unixtime", temperature_2m: "°C", relative_humidity_2m: "%", wind_speed_10m: "km/h" }, current: { time: 1794632400, temperature_2m: 30, relative_humidity_2m: 70, wind_speed_10m: 5 } };
}
async function run() {
  const row = parseCurrent(fixture(), locations[0], "2026-11-14T05:01:00Z");
  assert.equal(row.valid_at, "2026-11-14T05:00:00.000Z");
  assert.equal(row.area_id, locations[0].area.id);
  for (const mutate of [b => b.current.temperature_2m = null, b => b.current.relative_humidity_2m = 101, b => b.current.wind_speed_10m = -1, b => b.current.time = "invalid", b => b.current_units.wind_speed_10m = "m/s"]) {
    const body = fixture(); mutate(body); assert.throws(() => parseCurrent(body, locations[0]));
  }
  assert.throws(() => createStore({ ...env, SUPABASE_URL: "http://test.supabase.co" }));
  assert.throws(() => createStore({ ...env, SUPABASE_URL: "https://other.example" }));
  assert.throws(() => createStore({ ...env, SUPABASE_SECRET_KEY: "sb_publishable_wrong" }));
  let duplicate = false;
  const store = createStore(env, async (url, options) => {
    assert.equal(options.headers.apikey, env.SUPABASE_SECRET_KEY);
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.redirect, "error");
    assert.equal(url.searchParams.get("on_conflict"), "area_id,source,model,valid_at");
    assert.equal(options.headers.Prefer, "resolution=ignore-duplicates,return=representation");
    assert.deepEqual(JSON.parse(options.body), [row]);
    const response = Response.json(duplicate ? [] : [{ area_id: row.area_id }]); duplicate = true; return response;
  });
  assert.equal(await store.save(row), "inserted");
  assert.equal(await store.save(row), "duplicates");
  const failed = createStore(env, async () => new Response("do not expose response or credentials", { status: 401 }));
  await assert.rejects(failed.save(row), error => error.message.includes("401") && !error.message.includes("credentials") && !error.message.includes(env.SUPABASE_SECRET_KEY));
  const seen = new Set();
  const memoryStore = {
    areas: async () => locations.map(l => ({ id: l.area.id })),
    save: async record => { if (seen.has(record.area_id)) return "duplicates"; seen.add(record.area_id); return "inserted"; },
  };
  const first = await collect({ store: memoryStore, selected: locations, fetchWeather: async l => parseCurrent(fixture(), l) });
  assert.deepEqual(first, { requested: 85, inserted: 85, duplicates: 0, failed: 0 });
  const second = await collect({ store: memoryStore, selected: locations, fetchWeather: async l => parseCurrent(fixture(), l) });
  assert.equal(second.duplicates, 85);
  const partial = await collect({ store: memoryStore, selected: locations.slice(0, 3), fetchWeather: async l => { if (l === locations[1]) throw new Error("provider down"); return parseCurrent(fixture(), l); } });
  assert.deepEqual(partial, { requested: 3, inserted: 0, duplicates: 2, failed: 1 });
  const missing = await collect({ store: { areas: async () => [], save: () => assert.fail("must not save") }, selected: [locations[0]], fetchWeather: () => assert.fail("must not fetch") });
  assert.equal(missing.failed, 1);
  console.log("PASS: UTC, validation, 85 areas, duplicates, partial failures, missing areas, REST conflict headers, private key handling (no network writes)");
}
run().catch(error => { console.error(error); process.exitCode = 1; });
