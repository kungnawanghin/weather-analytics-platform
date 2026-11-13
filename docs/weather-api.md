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
a global deployment-wide rate limiter. No background collection is implemented.
The UI displays provider-valid time separately from fetch time; it does not poll.

Map colours/numbers use the same fetched snapshot as the selected area's cards.
Provider-valid times can differ across regions; each tooltip shows its own time.
Historical charts and Insights now use the separate ERA5 history endpoint described
below. No mock weather is used by the application. Forecasts are not presented as
station measurements or mixed into reanalysis history.

## Historical weather and analytics

`GET /api/weather/history?areaId=TH-10` uses the same registered point with the
Open-Meteo Historical Weather archive, explicitly selecting `models=era5`.
ERA5 is reanalysis (about 25 km resolution), not district-level station readings.
Its documented publication delay is about five days. We leave a seven-day buffer
for UTC publication and completed Bangkok days, then request 30 calendar days.
The UI displays the actual start/end dates, fetch time, source and delay.

Temperature and relative humidity are requested hourly in Asia/Bangkok. A daily
mean is only computed when all 24 distinct hourly values for that metric are
valid. Missing/invalid hours yield null for that day's metric; values are never
filled with zero or borrowed from another date. The other metric can remain valid.
Duplicate hours, wrong units or malformed responses fail validation. Both 7/30-day
views and Insights consume this single series, including null days that preserve
the requested window. Charts break at missing dates instead of bridging gaps.

History loads only for the selected area; changing the map does not fetch archive
data for every visible region. Keyed client components abort requests on selection
changes. Client/server caches last one hour, keyed by area and requested Bangkok
end date, and requests for the same area are coalesced. All-null responses and
errors are not cached. These are in-memory caches, not a database or collector.

Run `node scripts/test-weather-history.cjs` for history parser, calendar-window,
analytics, missing-value, endpoint-validation and cache/retry checks.
Archive documentation: https://open-meteo.com/en/docs/historical-weather-api

Provider: https://open-meteo.com/en/docs
Licence: https://creativecommons.org/licenses/by/4.0/
Free service terms (non-commercial and request limits): https://open-meteo.com/en/terms
