"use client";

import { motion } from "framer-motion";
import type { WeatherArea } from "../../lib/weather-data";

interface MapRegionProps {
  area: WeatherArea;
  path: string;
  color: string;
  value: number | null;
  unavailableLabel: string;
  unit: string;
  selected: boolean;
  hovered: boolean;
  interactive: boolean;
  focused: boolean;
  lift: number;
  scale: number;
  reducedMotion: boolean;
  onSelect: (area: WeatherArea) => void;
  onHover: (area: WeatherArea | null) => void;
  onKeyboardSelect: (area: WeatherArea) => void;
}

export default function MapRegion({
  area, path, color, value, unit, unavailableLabel, selected, hovered, interactive,
  focused, lift, scale, reducedMotion, onSelect, onHover, onKeyboardSelect,
}: MapRegionProps) {
  return (
    <g
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-hidden={!interactive || undefined}
      aria-pressed={interactive && area.level === "district" ? selected : undefined}
      aria-label={`${area.name} ${value === null ? unavailableLabel : `${value}${unit} Open-Meteo`}${area.level === "province" ? " กดดูเขตหรืออำเภอ" : ""}`}
      pointerEvents={interactive ? "auto" : "none"}
      onClick={() => interactive && onSelect(area)}
      onPointerEnter={() => interactive && onHover(area)}
      onPointerLeave={() => onHover(null)}
      onFocus={() => interactive && onHover(area)}
      onBlur={() => onHover(null)}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onKeyboardSelect(area);
        }
      }}
      className={interactive ? "cursor-pointer outline-none" : ""}
    >
      {/* The original footprint stays hittable while the surface lifts. */}
      <path d={path} fill="transparent" pointerEvents={interactive ? "all" : "none"} />
      <motion.path
        d={path}
        initial={false}
        animate={{ y: -lift / scale }}
        transition={{ duration: reducedMotion ? 0 : 0.24, ease: "easeOut" }}
        fill={color}
        fillOpacity={!interactive ? 0.07 : hovered || selected ? 1 : 0.86}
        stroke={hovered || selected ? "#d4f5ff" : focused ? "#102536" : "#b9e6ed"}
        strokeOpacity={!interactive ? 0.12 : hovered || selected ? 1 : 0.4}
        strokeWidth={hovered || selected ? 1.8 : 0.9}
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
        className="transition-[fill,fill-opacity,stroke] duration-300 motion-reduce:transition-none"
      />
    </g>
  );
}
