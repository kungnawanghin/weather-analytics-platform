/* eslint-disable @typescript-eslint/no-require-imports -- Standalone Node CLI loads local TS without a runtime dependency. */
// Run from repository root: node scripts/generate-weather-locations.cjs
// Prints the registry; does not modify boundary files.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { provinceConfigs, getDistrictProvinceId } = require('../lib/map-config.ts');
const { provinceArea, districtThaiNames } = require('../lib/weather-data.ts');

function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function polygons(geometry) { return geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates; }
function contains(geometry, point) {
  return polygons(geometry).some(([outer, ...holes]) => insideRing(point, outer) && !holes.some(ring => insideRing(point, ring)));
}
function referencePoint(geometry) {
  // Scan horizontal slices, intersecting all rings with even-odd fill (including holes).
  // Choose the midpoint of the widest interior segment. This need not be a city centre.
  let best = null;
  for (const rings of polygons(geometry)) {
    const ys = rings[0].map(point => point[1]);
    const bottom = Math.min(...ys), top = Math.max(...ys);
    for (let step = 1; step < 40; step++) {
      const y = bottom + (top - bottom) * step / 40;
      const xs = [];
      for (const ring of rings) for (let i = 1; i < ring.length; i++) {
        const [x1, y1] = ring[i - 1], [x2, y2] = ring[i];
        if ((y1 > y) !== (y2 > y)) xs.push(x1 + (y - y1) * (x2 - x1) / (y2 - y1));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        const width = xs[i + 1] - xs[i];
        if (!best || width > best.width) best = { width, point: [(xs[i] + xs[i + 1]) / 2, y] };
      }
    }
  }
  if (!best) throw new Error('No interior reference point');
  return best.point.map(value => Number(value.toFixed(5)));
}
function generate() {
  const read = name => JSON.parse(fs.readFileSync(path.join('public/maps', name), 'utf8')).features;
  const provinces = read('thailand-provinces.geojson');
  const districts = read('thailand-districts.geojson');
  const entries = provinceConfigs.map(config => ({ area: provinceArea(config.id), feature: provinces.find(f => f.properties.shapeISO === config.id) }));
  for (const feature of districts) {
    const provinceId = getDistrictProvinceId(feature.properties);
    if (!provinceId) continue;
    entries.push({ area: { id: feature.properties.shapeID, provinceId, provinceName: provinceArea(provinceId).name, name: districtThaiNames[feature.properties.shapeName] ?? feature.properties.shapeName, level: 'district' }, feature });
  }
  if (entries.length !== 85 || new Set(entries.map(entry => entry.area.id)).size !== 85) throw new Error('Expected 85 unique areas');
  return entries.map(({ area, feature }) => {
    const point = area.id === '78962969B95574148528109' ? [100.60672, 13.82779] : referencePoint(feature.geometry);
    if (!contains(feature.geometry, point)) throw new Error(`Point outside ${area.name}`);
    return { area, longitude: point[0], latitude: point[1], method: area.id === '78962969B95574148528109' ? 'geonames' : 'boundary-interior' };
  });
}
if (require.main === module) process.stdout.write(JSON.stringify(generate(), null, 2) + '\n');
module.exports = { generate, contains };
