import React from "react";
import type { SmartWeekRangeInfo } from "@/lib/arkan-harb/roster-engine";

interface RosterWeekDisplayProps {
  info: SmartWeekRangeInfo;
  className?: string;
  showPresetLabel?: boolean;
}

/**
 * Renders the weekly duty roster title and date range in strict Right-to-Left (RTL) order.
 * Ensures the start date is on the right and end date is on the left without BiDi flipping issues.
 */
export function RosterWeekDisplay({
  info,
  className = "",
  showPresetLabel = true,
}: RosterWeekDisplayProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 flex-wrap ${className}`}>
      {showPresetLabel && info.presetLabel && (
        <span>{info.presetLabel}</span>
      )}
      <span
        dir="rtl"
        className="inline-flex items-center gap-0.5 font-mono text-xs"
      >
        <span>(</span>
        {info.type === "same_month" && (
          <>
            <span>{info.sDay}</span>
            <span>-</span>
            <span>{info.eDay}</span>
            <span>/</span>
            <span>{info.sMonth}</span>
            <span>/</span>
            <span>{info.sYear}</span>
          </>
        )}
        {info.type === "diff_month" && (
          <>
            <span>{info.sDay}</span>
            <span>/</span>
            <span>{info.sMonth}</span>
            <span className="mx-0.5">-</span>
            <span>{info.eDay}</span>
            <span>/</span>
            <span>{info.eMonth}</span>
            <span>/</span>
            <span>{info.eYear}</span>
          </>
        )}
        {info.type === "diff_year" && (
          <>
            <span>{info.sDay}</span>
            <span>/</span>
            <span>{info.sMonth}</span>
            <span>/</span>
            <span>{info.sYear}</span>
            <span className="mx-0.5">-</span>
            <span>{info.eDay}</span>
            <span>/</span>
            <span>{info.eMonth}</span>
            <span>/</span>
            <span>{info.eYear}</span>
          </>
        )}
        <span>)</span>
      </span>
    </span>
  );
}
