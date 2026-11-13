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

The keyed client component resets to loading on selection changes and aborts its
previous request. One response drives both Current Weather and the 3-day forecast.
The server uses a five-minute in-memory cache per registered ID, coalesces concurrent
requests for the same area, and invalidates on Bangkok calendar-day changes.
This cache resets on restart and is per process/instance, not durable storage or
a global deployment-wide rate limiter. No background collection is implemented.
The UI displays provider-valid time separately from fetch time; it does not poll.

Map colours/numbers, historical charts and Insights remain explicitly labelled
mock data. No model forecast is stored or presented as observed history.

Provider: https://open-meteo.com/en/docs
Licence: https://creativecommons.org/licenses/by/4.0/
Free service terms (non-commercial and request limits): https://open-meteo.com/en/terms
