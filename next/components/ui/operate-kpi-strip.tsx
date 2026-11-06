"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, ArrowUpLeft } from "lucide-react";

export interface OperateKpiMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  subtitle: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  progress?: number;
  onClick?: () => void;
}

interface OperateKpiStripProps {
  metrics: OperateKpiMetric[];
  isLoading?: boolean;
  columns?: 3 | 4 | 5 | 6;
  className?: string;
}

export function OperateKpiStrip({
  metrics,
  isLoading = false,
  columns = 4,
  className,
}: OperateKpiStripProps) {
  const gridColsClass =
    columns === 6
      ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-6"
      : columns === 5
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
        : columns === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-(--app-surface) border border-(--app-border) rounded-2xl overflow-hidden grid divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-(--app-border)",
          gridColsClass,
          className
        )}
      >
        {Array.from({ length: columns }).map((_, idx) => (
          <div key={idx} className="p-4 sm:p-5 space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3.5 w-24 bg-(--app-surface-container) rounded-md" />
              <div className="h-7 w-7 bg-(--app-surface-container-low) rounded-lg" />
            </div>
            <div className="flex items-baseline justify-between pt-1">
              <div className="h-8 w-16 bg-(--app-surface-container) rounded-lg" />
              <div className="h-5 w-14 bg-(--app-surface-container-low) rounded-md" />
            </div>
            <div className="h-3 w-32 bg-(--app-surface-container-low) rounded-md" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-(--app-surface) border border-(--app-border) rounded-2xl overflow-hidden grid divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-(--app-border)",
        gridColsClass,
        className
      )}
    >
      {metrics.map((metric) => {
        const isClickable = Boolean(metric.onClick);
        const clampedProgress =
          metric.progress !== undefined
            ? Math.max(0, Math.min(100, metric.progress))
            : undefined;

        return (
          <div
            key={metric.id}
            onClick={metric.onClick}
            role={isClickable ? "button" : undefined}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={
              isClickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      metric.onClick?.();
                    }
                  }
                : undefined
            }
            className={cn(
              "relative p-4 sm:p-5 flex flex-col justify-between transition-colors duration-150 group",
              isClickable &&
                "cursor-pointer hover:bg-(--app-surface-container-low)/70 focus:outline-none focus:bg-(--app-surface-container-low)"
            )}
          >
            {/* Top Row: Label + Icon */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-bold text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors truncate">
                {metric.label}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                {isClickable && (
                  <ArrowUpLeft className="w-3.5 h-3.5 text-(--app-muted-foreground) opacity-0 group-hover:opacity-100 group-hover:text-(--color-primary) transition-all" />
                )}
                <div className="p-1.5 rounded-lg bg-(--color-primary)/8 text-(--color-primary) border border-(--color-primary)/15">
                  {metric.icon}
                </div>
              </div>
            </div>

            {/* Middle Row: Tabular Value + Trend Delta Badge */}
            <div className="flex items-baseline justify-between gap-2 my-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl sm:text-[28px] font-black tracking-tight text-(--color-primary) tabular-nums leading-none">
                  {metric.value}
                </span>
                {metric.unit && (
                  <span className="text-[11px] font-bold text-(--app-muted-foreground)">
                    {metric.unit}
                  </span>
                )}
              </div>

              {metric.trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black tabular-nums border",
                    metric.trend.direction === "up"
                      ? "bg-(--color-primary)/10 text-(--color-primary) border-(--color-primary)/20"
                      : "bg-(--app-surface-container-low) text-(--app-muted-foreground) border-(--app-border)"
                  )}
                >
                  {metric.trend.direction === "up" && <TrendingUp className="w-3 h-3" />}
                  {metric.trend.direction === "down" && <TrendingDown className="w-3 h-3" />}
                  {metric.trend.direction === "neutral" && <Minus className="w-3 h-3" />}
                  <span>{metric.trend.value}</span>
                </span>
              )}
            </div>

            {/* Bottom Row: Comparative Subtitle */}
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold text-(--app-muted-foreground) truncate">
                {metric.subtitle}
              </span>
              {metric.trend?.label && (
                <span className="text-[10px] font-bold text-(--app-muted-foreground)/80 tabular-nums shrink-0">
                  {metric.trend.label}
                </span>
              )}
            </div>

            {/* Bottom Micro-Progress Bar */}
            {clampedProgress !== undefined && (
              <div className="absolute bottom-0 inset-x-0 h-1 bg-(--app-surface-container)">
                <div
                  className="h-full bg-(--color-primary) transition-all duration-300"
                  style={{ width: `${clampedProgress}%` }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================================
   OperateTelemetryBarChart — High-Precision SVG / CSS Telemetry Series
   ============================================================================ */

export interface TelemetryDataPoint {
  label: string;
  sublabel?: string;
  primaryValue: number;
  secondaryValue?: number;
}

interface OperateTelemetryChartProps {
  title: string;
  subtitle: string;
  primaryLabel: string;
  secondaryLabel?: string;
  data: TelemetryDataPoint[];
  totalPrimaryLabel?: string;
  totalPrimaryValue?: number | string;
  isLoading?: boolean;
  headerSlot?: React.ReactNode;
}

export function OperateTelemetryChart({
  title,
  subtitle,
  primaryLabel,
  secondaryLabel,
  data,
  totalPrimaryLabel,
  totalPrimaryValue,
  isLoading = false,
  headerSlot,
}: OperateTelemetryChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-4 w-40 bg-(--app-surface-container) rounded-md" />
            <div className="h-3 w-56 bg-(--app-surface-container-low) rounded-md" />
          </div>
          <div className="h-8 w-24 bg-(--app-surface-container-low) rounded-lg" />
        </div>
        <div className="h-48 w-full bg-(--app-surface-container-low) rounded-xl" />
      </div>
    );
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.primaryValue, d.secondaryValue ?? 0))
  );

  return (
    <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-5 flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-(--app-border)/60">
        <div>
          <h3 className="text-sm font-black text-(--color-primary)">{title}</h3>
          <p className="text-xs font-bold text-(--app-muted-foreground) mt-0.5">{subtitle}</p>
        </div>

        <div className="flex items-center gap-4">
          {headerSlot}
          {totalPrimaryValue !== undefined && (
            <div className="text-left bg-(--app-surface-container-low) border border-(--app-border)/60 px-3 py-1.5 rounded-xl">
              {totalPrimaryLabel && (
                <span className="block text-[10px] font-bold text-(--app-muted-foreground)">
                  {totalPrimaryLabel}
                </span>
              )}
              <span className="text-base font-black text-(--color-primary) tabular-nums">
                {totalPrimaryValue}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend & Active Point Readout */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-xs bg-(--color-primary) inline-block" />
            <span className="font-bold text-(--app-muted-foreground)">{primaryLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-(--app-info)/45 inline-block" />
              <span className="font-bold text-(--app-muted-foreground)">{secondaryLabel}</span>
            </div>
          )}
        </div>

        {hoveredIdx !== null && data[hoveredIdx] ? (
          <div className="flex items-center gap-3 text-xs font-bold bg-(--app-surface-container-low) px-2.5 py-1 rounded-lg border border-(--app-border)">
            <span className="text-(--color-primary) font-black">
              {data[hoveredIdx].label}
              {data[hoveredIdx].sublabel ? ` (${data[hoveredIdx].sublabel})` : ""}:
            </span>
            <span className="text-(--color-primary) font-black tabular-nums">
              {data[hoveredIdx].primaryValue} {primaryLabel}
            </span>
            {secondaryLabel && data[hoveredIdx].secondaryValue !== undefined && (
              <span className="text-(--app-muted-foreground) font-bold tabular-nums">
                · {data[hoveredIdx].secondaryValue} {secondaryLabel}
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] font-bold text-(--app-muted-foreground)">
            مرر المؤشر على الأعمدة لعرض القراءة التفصيلية
          </span>
        )}
      </div>

      {/* Telemetry Bars Area */}
      <div className="pt-2 pb-1">
        <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-6 px-2 border-b border-(--app-border) relative">
          {/* Subtle Horizontal Reference Gridlines */}
          <div className="absolute inset-x-0 top-6 bottom-0 flex flex-col justify-between pointer-events-none">
            <div className="border-b border-dashed border-(--app-border)/50 w-full flex justify-end">
              <span className="text-[10px] font-bold text-(--app-muted-foreground)/70 tabular-nums -mt-4 px-1 bg-(--app-surface)">
                {maxVal}
              </span>
            </div>
            <div className="border-b border-dashed border-(--app-border)/40 w-full flex justify-end">
              <span className="text-[10px] font-bold text-(--app-muted-foreground)/70 tabular-nums -mt-4 px-1 bg-(--app-surface)">
                {Math.round(maxVal / 2)}
              </span>
            </div>
            <div className="w-full" />
          </div>

          {data.map((point, idx) => {
            const primaryHeightPct = Math.max(
              point.primaryValue > 0 ? 8 : 2,
              Math.round((point.primaryValue / maxVal) * 100)
            );
            const secondaryHeightPct =
              point.secondaryValue !== undefined
                ? Math.max(
                    point.secondaryValue > 0 ? 6 : 0,
                    Math.round((point.secondaryValue / maxVal) * 100)
                  )
                : 0;
            const isHovered = hoveredIdx === idx;

            return (
              <div
                key={point.label + idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 z-10 cursor-pointer group"
              >
                {/* Numeric Top Badge */}
                <span
                  className={cn(
                    "text-[10px] font-black tabular-nums transition-colors",
                    isHovered
                      ? "text-(--color-primary)"
                      : "text-(--app-muted-foreground)"
                  )}
                >
                  {point.primaryValue}
                </span>

                {/* Bar Pair */}
                <div className="w-full max-w-[44px] h-full flex items-end justify-center gap-1">
                  <div
                    className={cn(
                      "flex-1 rounded-t-md transition-all duration-200",
                      isHovered
                        ? "bg-(--app-info)"
                        : "bg-(--color-primary)"
                    )}
                    style={{ height: `${primaryHeightPct}%` }}
                  />
                  {secondaryLabel && point.secondaryValue !== undefined && (
                    <div
                      className={cn(
                        "flex-1 rounded-t-md transition-all duration-200",
                        isHovered
                          ? "bg-(--color-primary)/60"
                          : "bg-(--app-info)/35"
                      )}
                      style={{ height: `${secondaryHeightPct}%` }}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="flex items-center justify-between gap-2 sm:gap-3 pt-2.5 px-2">
          {data.map((point, idx) => (
            <div
              key={point.label + idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="flex-1 text-center cursor-pointer"
            >
              <p
                className={cn(
                  "text-[11px] font-extrabold truncate transition-colors",
                  hoveredIdx === idx
                    ? "text-(--color-primary)"
                    : "text-(--app-muted-foreground)"
                )}
              >
                {point.label}
              </p>
              {point.sublabel && (
                <p className="text-[10px] font-bold text-(--app-muted-foreground)/70 tabular-nums truncate">
                  {point.sublabel}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   OperateDistributionPanel — High-Density Breakdown & Stacked Bar
   ============================================================================ */

export interface DistributionSegment {
  id: string;
  label: string;
  count: number;
  total: number;
  tone?: "primary" | "info" | "muted" | "subtle";
  subtext?: string;
  onClick?: () => void;
}

interface OperateDistributionPanelProps {
  title: string;
  subtitle: string;
  totalLabel: string;
  totalValue: number | string;
  segments: DistributionSegment[];
  footerNote?: string;
  isLoading?: boolean;
}

const TONE_BAR_CLASSES: Record<NonNullable<DistributionSegment["tone"]>, string> = {
  primary: "bg-(--color-primary)",
  info: "bg-(--app-info)",
  muted: "bg-(--app-muted-foreground)",
  subtle: "bg-(--app-border)",
};

export function OperateDistributionPanel({
  title,
  subtitle,
  totalLabel,
  totalValue,
  segments,
  footerNote,
  isLoading = false,
}: OperateDistributionPanelProps) {
  if (isLoading) {
    return (
      <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-5 space-y-4 animate-pulse">
        <div className="h-4 w-44 bg-(--app-surface-container) rounded-md" />
        <div className="h-4 w-full bg-(--app-surface-container-low) rounded-lg" />
        <div className="space-y-2.5 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-full bg-(--app-surface-container-low) rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const sumCounts = Math.max(
    1,
    segments.reduce((acc, s) => acc + s.count, 0)
  );

  return (
    <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-5 flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-(--app-border)/60">
          <div>
            <h3 className="text-sm font-black text-(--color-primary)">{title}</h3>
            <p className="text-xs font-bold text-(--app-muted-foreground) mt-0.5">{subtitle}</p>
          </div>
          <div className="text-left bg-(--app-surface-container-low) border border-(--app-border)/60 px-3 py-1.5 rounded-xl">
            <span className="block text-[10px] font-bold text-(--app-muted-foreground)">
              {totalLabel}
            </span>
            <span className="text-base font-black text-(--color-primary) tabular-nums">
              {totalValue}
            </span>
          </div>
        </div>

        {/* Stacked Telemetry Bar */}
        <div className="my-4">
          <div className="h-3 w-full bg-(--app-surface-container-low) rounded-lg overflow-hidden flex gap-0.5 p-0.5 border border-(--app-border)/60">
            {segments.map((seg) => {
              const pct = seg.count > 0 ? Math.max(4, Math.round((seg.count / sumCounts) * 100)) : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={seg.id}
                  className={cn(
                    "h-full first:rounded-r-sm last:rounded-l-sm transition-all duration-300",
                    TONE_BAR_CLASSES[seg.tone || "primary"]
                  )}
                  style={{ width: `${pct}%` }}
                  title={`${seg.label}: ${seg.count}`}
                />
              );
            })}
          </div>
        </div>

        {/* Segment Rows */}
        <div className="space-y-2">
          {segments.map((seg) => {
            const denom = Math.max(1, seg.total || sumCounts);
            const pct = Math.round((seg.count / denom) * 100);
            const isClickable = Boolean(seg.onClick);

            return (
              <div
                key={seg.id}
                onClick={seg.onClick}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-(--app-surface-container-low)/70 border border-(--app-border)/50 transition-colors",
                  isClickable &&
                    "cursor-pointer hover:border-(--color-primary)/40 hover:bg-(--app-surface-container-low)"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={cn(
                      "w-2.5 h-2.5 rounded-xs shrink-0",
                      TONE_BAR_CLASSES[seg.tone || "primary"]
                    )}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-(--color-primary) truncate">
                      {seg.label}
                    </p>
                    {seg.subtext && (
                      <p className="text-[10px] font-bold text-(--app-muted-foreground) truncate">
                        {seg.subtext}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="w-20 hidden sm:block h-1.5 bg-(--app-surface-container) rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", TONE_BAR_CLASSES[seg.tone || "primary"])}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-(--color-primary) tabular-nums w-8 text-left">
                    {seg.count}
                  </span>
                  <span className="text-[11px] font-bold text-(--app-muted-foreground) tabular-nums w-11 text-left bg-(--app-surface) px-1.5 py-0.5 rounded border border-(--app-border)/60">
                    {pct}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {footerNote && (
        <div className="mt-4 pt-3 border-t border-(--app-border)/50 flex items-center justify-between text-[11px] font-bold text-(--app-muted-foreground)">
          <span>{footerNote}</span>
        </div>
      )}
    </div>
  );
}
