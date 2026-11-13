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
  date?: string;
  tooltipLabel?: string;
}

interface AreaChartProps {
  data: ChartPoint[];
  unit?: string;
  label: string;
  valueLabel?: string;
  color?: string;
  valueDomain?: [number, number];
}

interface ChartCanvasProps extends AreaChartProps {
  width: number;
  height: number;
}

export default function AreaChart({
  data,
  unit = "°C",
  label,
  valueLabel = "Daily average",
  color = "#38bdf8",
  valueDomain,
}: AreaChartProps) {
  if (
    data.length < 2 ||
    data.some((point) => !Number.isFinite(point.value))
  ) {
    return (
      <p className="py-20 text-center text-sm text-slate-400">
        ต้องมีข้อมูลที่ถูกต้องอย่างน้อย 2 วันเพื่อแสดงกราฟ
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
              valueLabel={valueLabel}
              color={color}
              valueDomain={valueDomain}
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
  valueLabel = "Daily average",
  color = "#38bdf8",
  valueDomain,
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
    top: 96,
    right: 24,
    bottom: 36,
    left: 44,
  };

  const chartBottom = height - margin.bottom;

  const values = data.map((point) => point.value);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const padding = Math.max((maximum - minimum) * 0.25, 1);

  const hasDates = data.every((point) => point.date && Number.isFinite(Date.parse(`${point.date}T00:00:00Z`)));
  const positions = data.map((point, index) => hasDates ? Date.parse(`${point.date}T00:00:00Z`) : index);
  const xScale = scaleLinear<number>({
    domain: [positions[0], positions[positions.length - 1]],
    range: [margin.left, width - margin.right],
  });

  const yScale = scaleLinear<number>({
    domain: valueDomain ?? [minimum - padding, maximum + padding],
    range: [chartBottom, margin.top],
    nice: !valueDomain,
  });

  const segments: ChartPoint[][] = [];
  data.forEach((point, index) => {
    if (!index || (hasDates && positions[index] - positions[index - 1] > 86400000)) segments.push([]);
    segments[segments.length - 1].push(point);
  });
  const pointX = (point: ChartPoint) => xScale(hasDates ? Date.parse(`${point.date}T00:00:00Z`) : data.indexOf(point));

  const activePoint =
    activeIndex === null ? null : data[activeIndex];

  const activeX = activeIndex === null ? 0 : xScale(positions[activeIndex]);
  const activeY = activePoint ? yScale(activePoint.value) : 0;

  const tooltipWidth = Math.min(208, width);
  const tooltipX = Math.max(
    0,
    Math.min(width - tooltipWidth, activeX - tooltipWidth / 2),
  );

  // ลดจำนวนชื่อบนแกนนอนเมื่อหน้าจอแคบ
  const tickCount = Math.min(8, data.length, Math.max(2, Math.floor((width - margin.left - margin.right) / 72)));
  const labelIndices = new Set(Array.from({ length: tickCount }, (_, index) =>
    Math.round((index * (data.length - 1)) / (tickCount - 1)),
  ));

  function selectPoint(clientX: number, element: SVGSVGElement) {
    const bounds = element.getBoundingClientRect();

    if (bounds.width === 0) return;

    const pointerX = ((clientX - bounds.left) / bounds.width) * width;
    const nearestIndex = positions.reduce((nearest, position, index) =>
      Math.abs(xScale(position) - pointerX) < Math.abs(xScale(positions[nearest]) - pointerX) ? index : nearest,
    0);
    setActiveIndex(nearestIndex);
  }

  return (
    <div className="relative h-full w-full">
      <p id={`${gradientId}-instructions`} className="sr-only">ใช้ปุ่มลูกศรซ้ายหรือขวาเพื่อเลือกวัน และ Escape เพื่อปิดรายละเอียด</p>
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        aria-describedby={`${gradientId}-instructions`}
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
              stopColor={color}
              stopOpacity={0.35}
            />

            <stop
              offset="100%"
              stopColor={color}
              stopOpacity={0.01}
            />
          </linearGradient>
        </defs>
        <text x={margin.left} y={20} fill="#94a3b8" fontSize={11} aria-hidden="true">{unit}</text>

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
        {segments.map((segment, index) => <g key={index}>
          {segment.length === 1 ? <circle cx={pointX(segment[0])} cy={yScale(segment[0].value)} r={3} fill={color} /> : <>
            <AreaClosed<ChartPoint> data={segment} x={pointX} y={point => yScale(point.value)} yScale={yScale} curve={curveMonotoneX} fill={`url(#${gradientId})`} />
            <LinePath<ChartPoint> data={segment} x={pointX} y={point => yScale(point.value)} curve={curveMonotoneX} stroke={color} strokeWidth={3} strokeLinecap="round" />
          </>}
        </g>)}

        {/* ชื่อวันบนแกนนอน */}
        {data.map((point, index) => {
          const showLabel = labelIndices.has(index);

          if (!showLabel) return null;

          return (
            <text
              key={`${point.label}-${index}`}
              x={xScale(positions[index])}
              y={height - 10}
              textAnchor={index === 0 ? "start" : index === data.length - 1 ? "end" : "middle"}
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
                stroke={color}
                strokeOpacity={0.6}
                strokeDasharray="4 5"
              />

              {/* วงเรืองแสงชั้นนอก */}
              <motion.circle
                cx={0}
                r={16}
                fill={color}
                fillOpacity={0.12}
                initial={{ cy: activeY }}
                animate={{ cy: activeY }}
                transition={smoothTransition}
              />

              {/* วงเรืองแสงชั้นใน */}
              <motion.circle
                cx={0}
                r={9}
                fill={color}
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
                stroke={color}
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
              {activePoint.tooltipLabel ?? activePoint.label}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">{valueLabel}</p>

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
