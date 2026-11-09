import { readFile } from "node:fs/promises";
import { geoIdentity, geoPath } from "d3-geo";
import {
  provinceConfigs,
  getDistrictProvinceId,
} from "../lib/map-config.ts";

// Run from the project folder: node scripts/check-map.mjs
// This audit only reads files; it never rewrites source boundaries.
async function readCollection(relativePath) {
  const text = await readFile(new URL(relativePath, import.meta.url), "utf8");
  const collection = JSON.parse(text.replace(/^\uFEFF/, ""));

  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error(`Invalid GeoJSON FeatureCollection: ${relativePath}`);
  }

  return collection;
}

function isPolygon(feature) {
  return feature?.type === "Feature" &&
    ["Polygon", "MultiPolygon"].includes(feature.geometry?.type);
}

function validBounds(bounds) {
  return bounds.flat().every(Number.isFinite) &&
    bounds[0][0] <= bounds[1][0] && bounds[0][1] <= bounds[1][1];
}

async function main() {
  const [provinceMap, districtMap] = await Promise.all([
    readCollection("../public/maps/thailand-provinces.geojson"),
    readCollection("../public/maps/thailand-districts.geojson"),
  ]);

  const expectedCounts = {
    "TH-10": 50,
    "TH-12": 6,
    "TH-13": 7,
    "TH-73": 7,
    "TH-74": 3,
    "TH-11": 6,
  };

  const path = geoPath(geoIdentity());
  const rows = [];
  const errors = [];
  const warnings = [];
  const matchedIds = new Set();
  let total = 0;

  for (const province of provinceConfigs) {
    const boundaries = provinceMap.features.filter(
      (feature) => feature.properties?.shapeISO === province.id,
    );
    const provinceFeature = boundaries[0];
    const districts = districtMap.features.filter((feature) => {
      const properties = feature.properties;
      return typeof properties?.shapeName === "string" &&
        typeof properties?.shapeID === "string" &&
        getDistrictProvinceId(properties) === province.id;
    });

    const issues = [];
    if (boundaries.length !== 1 || !isPolygon(provinceFeature)) {
      issues.push("Province boundary is missing, duplicated, or not a polygon");
    }
    if (districts.length !== expectedCounts[province.id]) {
      issues.push("District count differs from expected count");
    }

    for (const name of province.districtNames) {
      const matches = districts.filter((f) => f.properties.shapeName === name);
      if (matches.length !== 1) issues.push(`${name}: ${matches.length} matches`);
    }

    for (const district of districts) {
      const { shapeID, shapeName } = district.properties;
      if (matchedIds.has(shapeID)) issues.push(`Duplicate district ID: ${shapeID}`);
      matchedIds.add(shapeID);
      if (!isPolygon(district) || !validBounds(path.bounds(district))) {
        issues.push(`${shapeName}: invalid polygon or coordinate bounds`);
      }
    }

    rows.push({
      province: province.name,
      expected: expectedCounts[province.id],
      found: districts.length,
      status: issues.length === 0 ? "PASS" : "FAIL",
    });
    total += districts.length;
    if (issues.length > 0) errors.push({ province: province.name, issues });

    if (!isPolygon(provinceFeature)) continue;
    const bounds = path.bounds(provinceFeature);
    if (!validBounds(bounds)) {
      errors.push({ province: province.name, issues: ["Invalid province bounds"] });
      continue;
    }

    // Coarse placement check only. Different years and simplification methods
    // can produce legitimate differences. This is not a containment test.
    const [[west, south], [east, north]] = bounds;
    const tolerance = 0.02; // degrees; not an official boundary tolerance

    for (const district of districts.filter(isPolygon)) {
      const [[left, bottom], [right, top]] = path.bounds(district);
      const excess = Math.max(west - left, right - east, south - bottom, top - north, 0);
      if (excess > tolerance) {
        warnings.push({
          province: province.name,
          district: district.properties.shapeName,
          outsideBoundsDegrees: Number(excess.toFixed(4)),
        });
      }
    }
  }

  console.table(rows);
  console.log(`Matched districts: ${total}; unique IDs: ${matchedIds.size}`);
  if (total !== 79 || matchedIds.size !== 79) {
    errors.push({ issues: ["Expected exactly 79 unique target districts"] });
  }
  if (errors.length > 0) {
    console.error("Mapping errors:");
    console.dir(errors, { depth: null });
    process.exitCode = 1;
  } else {
    console.log("PASS: all 79 target districts matched with valid polygon bounds.");
  }
  if (warnings.length > 0) {
    console.warn("Placement warnings requiring review:");
    console.table(warnings);
  }
  console.log("Bounds checks do not prove exact alignment, full coverage, or absence of overlaps.");
}

main().catch((error) => {
  console.error("Map audit failed:", error.message);
  process.exitCode = 1;
});
