"use client";

import { useEffect, useState } from "react";
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from "geojson";
import { getDistrictProvinceId, provinceConfigs } from "./map-config";
import { districtThaiNames, provinceArea, type WeatherArea } from "./weather-data";

interface BoundaryProperties { shapeID: string; shapeISO?: string; shapeName: string }
export type BoundaryFeature = Feature<Polygon | MultiPolygon, BoundaryProperties>;
export interface MapBoundary { feature: BoundaryFeature; area: WeatherArea }
export type BoundaryResource =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; provinces: MapBoundary[]; districts: MapBoundary[] };

export function useWeatherBoundaries() {
  const [attempt, setAttempt] = useState(0);
  const [resource, setResource] = useState<BoundaryResource>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    async function read(path: string) {
      const response = await fetch(path, { signal: controller.signal });
      if (!response.ok) throw new Error(`โหลดแผนที่ไม่สำเร็จ (${response.status})`);
      const result = await response.json() as FeatureCollection<Polygon | MultiPolygon, BoundaryProperties>;
      if (result.type !== "FeatureCollection" || !Array.isArray(result.features)) throw new Error("รูปแบบ GeoJSON ไม่ถูกต้อง");
      return result.features.filter((item) => item.properties && item.geometry && ["Polygon", "MultiPolygon"].includes(item.geometry.type));
    }
    async function load() {
      try {
        const [provinceFeatures, districtFeatures] = await Promise.all([
          read("/maps/thailand-provinces.geojson"), read("/maps/thailand-districts.geojson"),
        ]);
        const provinces: MapBoundary[] = provinceConfigs.map((config) => {
          const feature = provinceFeatures.find((item) => item.properties.shapeISO === config.id);
          if (!feature) throw new Error(`ไม่พบเส้นขอบจังหวัด ${config.name}`);
          return { feature, area: provinceArea(config.id) };
        });
        const districts: MapBoundary[] = districtFeatures.flatMap((feature) => {
          const provinceId = getDistrictProvinceId(feature.properties);
          if (!provinceId) return [];
          const parent = provinceArea(provinceId);
          return [{ feature, area: {
            id: feature.properties.shapeID, provinceId, provinceName: parent.name,
            name: districtThaiNames[feature.properties.shapeName] ?? feature.properties.shapeName,
            level: "district" as const,
          } }];
        });
        const uniqueIds = new Set(districts.map((item) => item.area.id));
        if (uniqueIds.size !== 79 || districts.length !== 79 || provinceConfigs.some((config) =>
          districts.filter((item) => item.area.provinceId === config.id).length !== config.districtNames.length
        )) throw new Error("ข้อมูลเขต/อำเภอไม่ครบหรือซ้ำ กรุณาตรวจไฟล์แผนที่");
        if (!controller.signal.aborted) setResource({ status: "ready", provinces, districts });
      } catch (error) {
        if (!controller.signal.aborted) setResource({ status: "error", message: error instanceof Error ? error.message : "โหลดแผนที่ไม่สำเร็จ" });
      }
    }
    void load();
    return () => controller.abort();
  }, [attempt]);

  return { resource, retry: () => { setResource({ status: "loading" }); setAttempt((value) => value + 1); } };
}
