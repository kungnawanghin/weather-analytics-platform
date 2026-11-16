# Weather API

`GET /api/weather?areaId=TH-10` uses the selected area's registered reference
coordinate. All six provinces and 79 districts are allowed; arbitrary coordinates
and upstream URLs are not accepted. Missing ID returns 400, unknown ID 404,
provider/validation failure 502. Errors are not replaced with mock weather.
The older `/api/weather/lat-phrao` URL delegates to the same service.

## Reference points

`lib/weather-locations.json` maps the same IDs used by the map. Except for Lat
Phrao (GeoNames https://www.geonames.org/6845305/lat-phrao.html), points are
calculated inside each area's simplified GeoJSON boundary, excluding holes.
They are not official city centres, weather stations or area-wide averages.
The generator scans horizontal slices and selects the midpoint of the widest
interior segment, checks containment after rounding, and leaves source geometry
unchanged. Boundary source years, attribution and licences are in
`public/maps/README.md` (OSM/ODbL ADM1 and RTSD/OCHA CC BY 3.0 IGO ADM2).

Reproduce JSON: `node scripts/generate-weather-locations.cjs` (prints to stdout).
Audit registry, parser and API/cache behaviour: `node scripts/test-weather-api.cjs`.

## Data lifecycle

The parent `useAreaWeather` hook owns per-area snapshots shared by the map,
Current Weather and the 3-day forecast. It loads the selection first, then visible
map regions only (six provinces in overview or the focused province's districts),
with at most three concurrent requests. View changes abort outstanding client
requests. Per-area client cache lasts five minutes and resets across Bangkok days;
there is no background polling. Retry reloads failures while reusing valid successes.
Missing/loading/error values are grey, never mock numbers or zeros. Rain colour
uses the first forecast day's maximum precipitation probability, not current rain.
The server uses a five-minute in-memory cache per registered ID, coalesces concurrent
requests for the same area, and invalidates on Bangkok calendar-day changes.
This cache resets on restart and is per process/instance, not durable storage or
a global deployment-wide rate limiter. Separate hourly GitHub Actions collection
persists current snapshots to Supabase; see `docs/supabase-collection.md`.
The UI displays provider-valid time separately from fetch time; it does not poll.

Map colours/numbers use the same fetched snapshot as the selected area's cards.
Provider-valid times can differ across regions; each tooltip shows its own time.
Historical charts and Insights use the separate Supabase history endpoint described
below. No mock weather is used by the application. Forecasts are not presented as
station measurements or mixed with archive reanalysis.

## Historical weather and analytics

`GET /api/weather/history?areaId=TH-10` reads `weather_records` from Supabase
on the server, filtered to the selected registry ID, `source=open-meteo` and
`model=best_match`. The secret key never enters client components or responses.
Missing configuration/database errors return 502 with a generic message; no
automatic archive or mock fallback is used. Empty successful reads return 30
null days, distinguished from a database outage.

The window contains 30 Bangkok calendar days ending today; 7 days is its final
seven days. Queries page through records with a stable order and fixed fetch
cutoff. Within each Bangkok hour only the latest valid snapshot contributes,
so repeated manual collections do not overweight an hour. Each day's value is
the mean of collected hourly snapshots, with `samples` giving its hour count.
Partial-day values are explicitly labelled, never called full 24-hour means.
Days with no records stay null; no gaps are filled. Range statistics give each
available day's mean equal weight, not each raw record. They are point model
estimates, not station observations or area-wide averages.

Charts, statistics and peak Insights use the same series. The period-shift Insight
requires all 24 hours in each of the three first and three final calendar days;
otherwise it reports insufficient data. Charts need at least two available days.
Tooltip/table show each day's hour count. Existing video, chart interaction,
map selection, units and 7/30-day controls are retained.

History loads only for the selected area. Keyed client components abort requests
on selection changes. Client/server caches last five minutes, reset at Bangkok
midnight, and coalesce server requests per area. Errors are not cached. Reading
history never writes, seeds or changes the collection database.

Run `node scripts/test-collected-history.cjs` for aggregation, partial coverage,
pagination, endpoint validation, cache and retry. The old ERA5 parser is retained
as an unused utility with tests in `scripts/test-weather-history.cjs`; it is not
the Dashboard data source.

Provider: https://open-meteo.com/en/docs
Licence: https://creativecommons.org/licenses/by/4.0/
Free service terms (non-commercial and request limits): https://open-meteo.com/en/terms

## Local collection database

The manual collector uses `node:sqlite` on Node 24 and requires a running local
Next.js server. Schema: `database/schema.sql`; database: `data/weather.sqlite`.
The data directory is ignored by Git. Store it on persistent disk when deploying;
this local database is not suitable for an ephemeral serverless filesystem.

Initialize and seed: `node scripts/init-database.cjs`, then
`node scripts/seed-areas.cjs`. `areas` holds the 85 registry locations;
`weather_records` holds current model snapshots, not station observations or ERA5.

- `node scripts/collect-weather.cjs`: first three registered areas (safe trial).
- `node scripts/collect-weather.cjs --limit 10`: first ten areas.
- `node scripts/collect-weather.cjs --all`: all six provinces and 79 districts.
- `node scripts/view-weather.cjs`: read-only counts and latest ten saved records.
- `node scripts/test-collector.cjs`: isolated in-memory SQLite tests; no live data writes.

Set `WEATHER_API_BASE_URL` when the server uses a different port. Requests run
sequentially with a 20-second timeout each. Every payload is validated against
its requested area name and checked for valid values/times before insertion.
Valid/fetch timestamps are normalized to UTC. Source `open-meteo` and model
`best_match` describe the current API's default model-selection configuration.
Uniqueness is `(area_id, source, model, valid_at)`; repeated timestamps are skipped
without changing their original fetch time. Each area is saved independently, so
one failure does not roll back successful areas. The summary distinguishes new
records, duplicates and failures; any failure sets exit code 1. Rerunning is safe.

Collection can be manual or scheduled on Windows as described below. The
website's historical charts continue to use the separately labelled ERA5 API.

### Hourly Windows collection

`./scripts/register-collector-task.ps1` registers the task
`WeatherAnalytics-CollectHourly` for the current signed-in user with limited
privileges. It starts at the next local clock hour and repeats every hour without
an expiry date. Registration captures the absolute Node/project paths. An existing
task with a different action is not overwritten. Use `-ApiBaseUrl` when registering
against a port other than 3000. This task does not start the web server.

Requirements: Windows must be awake, the registering user must be signed in, the
local API must be running, and the weather provider must be reachable. A missed
trigger can run when the machine becomes available again; this does not recreate
weather snapshots for the hours the machine was off.

The runner `scripts/run-hourly-collector.ps1` launches Node without a visible
console. Task Scheduler uses IgnoreNew and an OS file lock prevents overlapping
runner instances. Each run has a 35-minute child-process timeout (40-minute task
limit). Daily UTF-8 logs are appended under `data/collector-logs/YYYY-MM-DD.log`;
the UTC offset is present on run-start/run-finish timestamps. The runner preserves
the collector's nonzero exit code for partial failures. Logs and SQLite data remain
local and are ignored by Git. Log rotation is not implemented yet.

Useful PowerShell commands:

```powershell
Get-ScheduledTaskInfo -TaskName 'WeatherAnalytics-CollectHourly'
Start-ScheduledTask -TaskName 'WeatherAnalytics-CollectHourly'
Disable-ScheduledTask -TaskName 'WeatherAnalytics-CollectHourly'
Enable-ScheduledTask -TaskName 'WeatherAnalytics-CollectHourly'
```

Changes to the API base URL require updating the registered action deliberately;
changing a variable in an unrelated Terminal does not change the task's URL.
