"use client";

import { useId } from "react";
import type { WeatherCondition } from "../../lib/weather-data";

interface WeatherConditionIconProps {
  condition: WeatherCondition;
  className?: string;
}

export default function WeatherConditionIcon({ condition, className }: WeatherConditionIconProps) {
  const id = useId().replace(/:/g, "");
  const cloudId = `cloud-${id}`;
  const sunId = `sun-${id}`;
  const glowId = `icon-glow-${id}`;
  return (
    <svg viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={cloudId} x1="26" y1="25" x2="50" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#daeffa" /><stop offset="0.5" stopColor="#8bb9d6" /><stop offset="1" stopColor="#3f6b8f" />
        </linearGradient>
        <radialGradient id={sunId}>
          <stop stopColor="#fff5d9" /><stop offset="0.7" stopColor="#ecd49c" /><stop offset="1" stopColor="#c8ab6f" />
        </radialGradient>
        <filter id={glowId} x="-60%" y="-60%" width="220%" height="240%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#030c18" floodOpacity="0.45" />
        </filter>
      </defs>
      {condition !== "rain" && (
        <g stroke="#e9c88d" strokeWidth="1.7" strokeLinecap="round">
          <circle cx={condition === "sunny" ? 40 : 30} cy={condition === "sunny" ? 38 : 28} r="20" fill="#e9c88d" fillOpacity="0.035" stroke="none" />
          <circle cx={condition === "sunny" ? 40 : 30} cy={condition === "sunny" ? 38 : 28} r="12" fill={`url(#${sunId})`} stroke="#f0dcad" filter={`url(#${glowId})`} />
          <g className="transition-transform duration-700 group-hover:rotate-12 motion-reduce:transform-none motion-reduce:transition-none" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
          {condition === "sunny" ? (
            <path d="M40 17v-5m0 52v-5M19 38h-5m52 0h-5M25 23l-4-4m38 38-4-4M25 53l-4 4m38-38-4 4" />
          ) : (
            <path d="M30 9V5M11 28H7m9-14-3-3m31 3 3-3" />
          )}
          </g>
        </g>
      )}
      {condition !== "sunny" && (
        <path
          d="M24 53a11 11 0 0 1-1-22 16 16 0 0 1 30-3 12.5 12.5 0 1 1 5 25H24Z"
          fill={`url(#${cloudId})`} stroke="#cfebf7" strokeOpacity="0.65" strokeWidth="1.2" strokeLinejoin="round" filter={`url(#${glowId})`}
        />
      )}
      {condition === "rain" && (
        <g stroke="#92d7f1" strokeWidth="2.3" strokeLinecap="round" className="transition-transform duration-500 group-hover:translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none">
          <path d="m29 61-3 7m17-7-3 7m17-7-3 7" />
        </g>
      )}
    </svg>
  );
}
