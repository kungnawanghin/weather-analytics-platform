"use client";

import { useId, useState } from "react";
import { ParentSize } from "@visx/responsive";
import { scaleLinear } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { curveMonotoneX } from "@visx/curve";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";

export interface ChartPoint {
  label: string;
  value: number;
}

interface AreaChartProps {
  data: ChartPoint[];
  unit?: string;
  label: string;
}

interface ChartCanvasProps extends AreaChartProps {
  width: number;
  height: number;
}

export default function AreaChart({
  data,
  unit = "°C",
  label,
}: AreaChartProps) {
  if (
    data.length < 2 ||
    data.some((point) => !Number.isFinite(point.value))
  ) {
    return (
      <p className="py-20 text-center text-sm text-slate-400">
        At least two valid data points are needed.
      </p>
    );
  }

  return (
    <div className="h-72 w-full sm:h-80">
      <ParentSize>
        {({ width, height }) =>
          width > 80 && height > 80 ? (
            <ChartCanvas
              data={data}
              unit={unit}
              label={label}
              width={width}
              height={height}
            />
          ) : null
        }
      </ParentSize>
    </div>
  );
}

function ChartCanvas({
  data,
  unit = "°C",
  label,
  width,
  height,
}: ChartCanvasProps) {
  const gradientId = `area-${useId().replace(/:/g, "")}`;
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const reduceMotion = useReducedMotion();

  const smoothTransition = reduceMotion
    ? { duration: 0 }
    : {
        type: "spring" as const,
        stiffness: 320,
        damping: 32,
        mass: 0.6,
      };

  // เว้นพื้นที่ด้านบนสำหรับ Tooltip
  const margin = {
    top: 76,
    right: 16,
    bottom: 36,
    left: 44,
  };

  const chartBottom = height - margin.bottom;

  const values = data.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.25, 1);

  const xScale = scaleLinear<number>({
    domain: [0, data.length - 1],
    range: [margin.left, width - margin.right],
  });

  const yScale = scaleLinear<number>({
    domain: [minimum - padding, maximum + padding],
    range: [chartBottom, margin.top],
    nice: true,
  });

  const activePoint =
    activeIndex === null ? null : data[activeIndex];

  const activeX = activeIndex === null ? 0 : xScale(activeIndex);
  const activeY = activePoint ? yScale(activePoint.value) : 0;

  const tooltipWidth = Math.min(160, width);
  const tooltipX = Math.max(
    0,
    Math.min(width - tooltipWidth, activeX - tooltipWidth / 2),
  );

  // ลดจำนวนชื่อบนแกนนอนเมื่อหน้าจอแคบ
  const labelStep = Math.max(
    1,
    Math.ceil(data.length / Math.max(2, Math.floor(width / 55))),
  );

  function selectPoint(clientX: number, element: SVGSVGElement) {
    const bounds = element.getBoundingClientRect();

    if (bounds.width === 0) return;

    const pointerX = ((clientX - bounds.left) / bounds.width) * width;
    const nearestIndex = Math.round(xScale.invert(pointerX));

    setActiveIndex(
      Math.max(0, Math.min(data.length - 1, nearestIndex)),
    );
  }

  return (
    <div className="relative h-full w-full">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        tabIndex={0}
        className="block rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-300"
        onPointerMove={(event) => {
          selectPoint(event.clientX, event.currentTarget);
        }}
        onPointerDown={(event) => {
          selectPoint(event.clientX, event.currentTarget);
        }}
        onPointerLeave={() => setActiveIndex(null)}
        onPointerCancel={() => setActiveIndex(null)}
        onFocus={() => setActiveIndex(0)}
        onBlur={() => setActiveIndex(null)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();

            setActiveIndex((previous) =>
              Math.min(data.length - 1, (previous ?? -1) + 1),
            );
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();

            setActiveIndex((previous) =>
              Math.max(0, (previous ?? 1) - 1),
            );
          } else if (event.key === "Escape") {
            setActiveIndex(null);
          }
        }}
      >
        <defs>
          <linearGradient
            id={gradientId}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop
              offset="0%"
              stopColor="#38bdf8"
              stopOpacity={0.35}
            />

            <stop
              offset="100%"
              stopColor="#38bdf8"
              stopOpacity={0.01}
            />
          </linearGradient>
        </defs>

        {/* เส้นตารางและค่าบนแกนตั้ง */}
        {yScale.ticks(4).map((tick) => (
          <g key={tick}>
            <line
              x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke="#334155"
              strokeDasharray="4 6"
              strokeOpacity={0.6}
            />

            <text
              x={margin.left - 10}
              y={yScale(tick)}
              textAnchor="end"
              dominantBaseline="middle"
              fill="#94a3b8"
              fontSize={11}
            >
              {tick}
            </text>
          </g>
        ))}

        {/* พื้นที่ไล่สีใต้เส้นกราฟ */}
        <AreaClosed<ChartPoint>
          data={data}
          x={(_, index) => xScale(index)}
          y={(point) => yScale(point.value)}
          yScale={yScale}
          curve={curveMonotoneX}
          fill={`url(#${gradientId})`}
        />

        {/* เส้นกราฟ */}
        <LinePath<ChartPoint>
          data={data}
          x={(_, index) => xScale(index)}
          y={(point) => yScale(point.value)}
          curve={curveMonotoneX}
          stroke="#38bdf8"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* ชื่อวันบนแกนนอน */}
        {data.map((point, index) => {
          const showLabel =
            index % labelStep === 0 || index === data.length - 1;

          if (!showLabel) return null;

          return (
            <text
              key={`${point.label}-${index}`}
              x={xScale(index)}
              y={height - 10}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={11}
            >
              {point.label}
            </text>
          );
        })}

        {/* เส้นชี้กับจุดเคลื่อนแบบ Spring */}
        <AnimatePresence>
          {activePoint && activeIndex !== null && (
            <motion.g
              key="chart-indicator"
              pointerEvents="none"
              initial={{
                opacity: 0,
                x: activeX,
              }}
              animate={{
                opacity: 1,
                x: activeX,
              }}
              exit={{ opacity: 0 }}
              transition={smoothTransition}
            >
              <line
                x1={0}
                x2={0}
                y1={margin.top}
                y2={chartBottom}
                stroke="#7dd3fc"
                strokeOpacity={0.6}
                strokeDasharray="4 5"
              />

              {/* วงเรืองแสงชั้นนอก */}
              <motion.circle
                cx={0}
                r={16}
                fill="#38bdf8"
                fillOpacity={0.12}
                initial={{ cy: activeY }}
                animate={{ cy: activeY }}
                transition={smoothTransition}
              />

              {/* วงเรืองแสงชั้นใน */}
              <motion.circle
                cx={0}
                r={9}
                fill="#38bdf8"
                fillOpacity={0.18}
                initial={{ cy: activeY }}
                animate={{ cy: activeY }}
                transition={smoothTransition}
              />

              {/* จุดหลัก */}
              <motion.circle
                cx={0}
                r={5}
                fill="#0f172a"
                stroke="#bae6fd"
                strokeWidth={3}
                initial={{ cy: activeY }}
                animate={{ cy: activeY }}
                transition={smoothTransition}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Tooltip เคลื่อนตามวันที่เลือก */}
      <AnimatePresence>
        {activePoint && (
          <motion.div
            key="chart-tooltip"
            role="status"
            className="pointer-events-none absolute left-0 top-0 rounded-xl border border-sky-300/20 bg-slate-950/95 px-4 py-3 shadow-xl shadow-sky-950/30 backdrop-blur-md"
            style={{ width: tooltipWidth }}
            initial={{
              opacity: 0,
              x: tooltipX,
            }}
            animate={{
              opacity: 1,
              x: tooltipX,
            }}
            exit={{ opacity: 0 }}
            transition={smoothTransition}
          >
            <p className="text-xs text-slate-400">
              {activePoint.label} · Daily average
            </p>

            <p className="mt-1 text-xl font-semibold text-sky-200">
              {activePoint.value.toFixed(1)}
              <span className="ml-1 text-sm">{unit}</span>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}