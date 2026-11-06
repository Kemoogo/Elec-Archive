"use client";

import React, { useRef, useLayoutEffect, useEffect } from "react";
import { Calendar } from "lucide-react";
import { getDayName } from "@/lib/utils/date-display";

const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/* ─── Date helpers (DD-MM-YYYY ↔ YYYY-MM-DD) ───
   In RTL contexts, numbers without strong directional markers visually render LTR
   (putting Day on the left and Year on the right). We inject Unicode Right-to-Left
   Marks (\u200F) before each segment so the visual layout flows right-to-left
   (اليوم على اليمين - الشهر في الوسط - السنة على اليسار) matching the placeholder.
*/
export function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const cleaned = iso.replace(/\u200F/g, "");
  const m = cleaned.match(/^(\d{4})[/-](\d{2})[/-](\d{2})/);
  return m ? `\u200F${m[3]}\u200F/\u200F${m[2]}\u200F/\u200F${m[1]}` : cleaned;
}

export function toISODate(display: string): string {
  if (!display) return "";
  const cleaned = display.replace(/\u200F/g, "");
  const m = cleaned.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : cleaned;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function pad4(value: number): string {
  return String(value).padStart(4, "0");
}

function getMaxDay(month: number, year: number): number {
  if (month < 1 || month > 12) return 31;
  return new Date(year, month, 0).getDate();
}

function isCompleteDate(value: string): boolean {
  const cleaned = value.replace(/\u200F/g, "");
  return /^\d{2}[/-]\d{2}[/-]\d{4}$/.test(cleaned);
}

export function getActiveSegment(display: string, cursor: number): "day" | "month" | "year" {
  const firstSep = display.search(/[/-]/);
  const secondSep = firstSep !== -1 ? display.slice(firstSep + 1).search(/[/-]/) + firstSep + 1 : -1;
  if (firstSep === -1 || secondSep === -1) {
    if (cursor <= 2) return "day";
    if (cursor <= 5) return "month";
    return "year";
  }
  if (cursor <= firstSep) return "day";
  if (cursor <= secondSep) return "month";
  return "year";
}

export function getSegmentRange(display: string, segment: "day" | "month" | "year"): [number, number] {
  const firstSep = display.search(/[/-]/);
  const secondSep = firstSep !== -1 ? display.slice(firstSep + 1).search(/[/-]/) + firstSep + 1 : -1;
  if (firstSep === -1 || secondSep === -1) {
    if (segment === "day") return [0, 2];
    if (segment === "month") return [3, 5];
    return [6, display.length];
  }
  if (segment === "day") {
    const start = display.startsWith("\u200F") ? 1 : 0;
    const end = display[firstSep - 1] === "\u200F" ? firstSep - 1 : firstSep;
    return [start, end];
  }
  if (segment === "month") {
    const start = display[firstSep + 1] === "\u200F" ? firstSep + 2 : firstSep + 1;
    const end = display[secondSep - 1] === "\u200F" ? secondSep - 1 : secondSep;
    return [start, end];
  }
  // Year
  const start = display[secondSep + 1] === "\u200F" ? secondSep + 2 : secondSep + 1;
  return [start, display.length];
}

function adjustDateSegment(display: string, segment: "day" | "month" | "year", delta: 1 | -1): string {
  const cleaned = display.replace(/\u200F/g, "");
  if (!isCompleteDate(cleaned)) return display;

  const [, dayStr, monthStr, yearStr] = cleaned.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/) ?? [];
  let day = Number(dayStr);
  let month = Number(monthStr);
  let year = Number(yearStr);

  if (segment === "year") {
    year = Math.min(Math.max(year + delta, 1), 9999);
    day = Math.min(day, getMaxDay(month, year));
  } else if (segment === "month") {
    month = month === 12 && delta === 1 ? 1 : month === 1 && delta === -1 ? 12 : month + delta;
    day = Math.min(day, getMaxDay(month, year));
  } else {
    const maxDay = getMaxDay(month, year);
    day = day === maxDay && delta === 1 ? 1 : day === 1 && delta === -1 ? maxDay : day + delta;
  }

  return `${pad2(day)}/${pad2(month)}/${pad4(year)}`;
}

interface DateFieldProps {
  id: string;
  label: string;
  value: string; // ISO format (YYYY-MM-DD)
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  showDayName?: boolean;
  min?: string;
  max?: string;
  className?: string;
  containerClassName?: string;
  inputClassName?: string;
}

/**
 * Smart DateField with segment-aware arrow keys (Up/Down/Left/Right),
 * continuous digit entry, and intelligent cursor locking.
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  showDayName = true,
  min,
  max,
  className = "",
  containerClassName = "",
  inputClassName = "",
}: DateFieldProps) {
  const textInputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);
  const pendingSelectionRef = useRef<[number, number] | null>(null);

  const displayVal = toDisplayDate(value);
  const dayName = showDayName && value ? getDayName(value) : "";

  // Restore and preserve cursor/segment selection after state updates
  useIsomorphicLayoutEffect(() => {
    if (pendingSelectionRef.current && textInputRef.current) {
      const [start, end] = pendingSelectionRef.current;
      textInputRef.current.setSelectionRange(start, end);
      pendingSelectionRef.current = null;
    }
  });

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // 1. Strip all non-digits and limit to 8 digits
    const raw = input.replace(/\D/g, "").slice(0, 8);
    
    let d = "", m = "", y = "";

    // Helper: Does this look like a 4-digit year (19xx or 20xx)?
    const isYear = (str: string) => str.startsWith("19") || str.startsWith("20");

    // 2. Determine Mode based on digit count and year recognition
    if (raw.length >= 6 && isYear(raw.slice(-4))) {
      // Smart Mode: Last 4 digits are recognized as a valid year
      y = raw.slice(-4);
      const prefix = raw.slice(0, -4);

      if (prefix.length === 1) {
        d = "0" + prefix;
        m = "01";
      } else if (prefix.length === 2) {
        // Case: 121987 -> Day 1, Month 2
        d = "0" + prefix[0];
        m = "0" + prefix[1];
      } else if (prefix.length === 3) {
        // Case: 1011987 (10-1-1987)
        const d_dd = prefix.slice(0, 2);
        const m_m = prefix[2];
        const d_d = prefix[0];
        const m_mm = prefix.slice(1, 3);

        if (Number(d_dd) >= 1 && Number(d_dd) <= 31 && Number(m_m) >= 1 && Number(m_m) <= 9) {
          d = d_dd;
          m = "0" + m_m;
        } else if (Number(d_d) >= 1 && Number(d_d) <= 9 && Number(m_mm) >= 1 && Number(m_mm) <= 12) {
          d = "0" + d_d;
          m = m_mm;
        } else {
          d = d_dd;
          m = "0" + m_m;
        }
      } else if (prefix.length >= 4) {
        // Case: 10101987 (10-10-1987)
        d = prefix.slice(0, 2);
        m = prefix.slice(2, 4);
      }
    } else {
      // Standard Linear Mode (Day -> Month -> Year)
      if (raw.length <= 2) {
        d = raw;
      } else if (raw.length <= 4) {
        d = raw.slice(0, 2);
        m = raw.slice(2);
      } else {
        d = raw.slice(0, 2);
        m = raw.slice(2, 4);
        y = raw.slice(4);
      }
    }

    // If we have a full 8-digit date, normalize and trigger onChange
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      let iso = `${y}-${m}-${d}`;
      if (min && iso < min) iso = min;
      if (max && iso > max) iso = max;
      onChange(iso);
    } else if (raw.length === 0) {
      onChange("");
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let iso = e.target.value;
    if (min && iso < min) iso = min;
    if (max && iso > max) iso = max;
    onChange(iso);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Up / Down arrow adjustments with cursor locking
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const currentDisplay = textInputRef.current?.value || displayVal;

      // Edge case: empty value -> initialize to today's date
      if (!isCompleteDate(currentDisplay)) {
        const today = new Date();
        let todayIso = today.toISOString().slice(0, 10);
        if (min && todayIso < min) todayIso = min;
        if (max && todayIso > max) todayIso = max;
        const newDisplay = toDisplayDate(todayIso);
        const range = getSegmentRange(newDisplay, "day");
        pendingSelectionRef.current = range;
        onChange(todayIso);
        return;
      }

      const cursor = e.currentTarget.selectionStart ?? 0;
      const segment = getActiveSegment(currentDisplay, cursor);
      const delta = e.key === "ArrowUp" ? 1 : -1;
      
      let nextIso = toISODate(adjustDateSegment(currentDisplay, segment, delta));
      if (min && nextIso < min) nextIso = min;
      if (max && nextIso > max) nextIso = max;

      const newDisplay = toDisplayDate(nextIso);
      const range = getSegmentRange(newDisplay, segment);
      pendingSelectionRef.current = range;
      
      // Apply immediate selection before re-render and queue for post-render
      e.currentTarget.setSelectionRange(range[0], range[1]);
      onChange(nextIso);
      return;
    }

    // Left / Right segment navigation
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      const currentDisplay = textInputRef.current?.value || displayVal;
      if (isCompleteDate(currentDisplay)) {
        const cursor = e.currentTarget.selectionStart ?? 0;
        const segment = getActiveSegment(currentDisplay, cursor);

        if (e.key === "ArrowLeft") {
          // Moving visually left in RTL: Day -> Month -> Year
          if (segment === "day") {
            e.preventDefault();
            const range = getSegmentRange(currentDisplay, "month");
            pendingSelectionRef.current = range;
            e.currentTarget.setSelectionRange(range[0], range[1]);
            return;
          } else if (segment === "month") {
            e.preventDefault();
            const range = getSegmentRange(currentDisplay, "year");
            pendingSelectionRef.current = range;
            e.currentTarget.setSelectionRange(range[0], range[1]);
            return;
          }
        } else if (e.key === "ArrowRight") {
          // Moving visually right in RTL: Year -> Month -> Day
          if (segment === "year") {
            e.preventDefault();
            const range = getSegmentRange(currentDisplay, "month");
            pendingSelectionRef.current = range;
            e.currentTarget.setSelectionRange(range[0], range[1]);
            return;
          } else if (segment === "month") {
            e.preventDefault();
            const range = getSegmentRange(currentDisplay, "day");
            pendingSelectionRef.current = range;
            e.currentTarget.setSelectionRange(range[0], range[1]);
            return;
          }
        }
      }
    }

    // Backspace / Delete handling
    if (e.key === "Backspace" || e.key === "Delete") {
      const input = e.currentTarget;
      const { selectionStart, selectionEnd, value: curVal } = input;
      if (selectionStart !== null && selectionStart === selectionEnd && selectionStart > 0) {
        if (curVal[selectionStart - 1] === "/" || curVal[selectionStart - 1] === "-" || curVal[selectionStart - 1] === "\u200F") {
          e.preventDefault();
          const cleanVal = curVal.replace(/\u200F/g, "");
          const raw = cleanVal.replace(/\D/g, "");
          const d = raw.slice(0, 2);
          const m = raw.slice(2, 4);
          const y = raw.slice(4);
          onChange(y.length === 4 ? `${y}-${m}-${d}` : "");
        }
      }
    }
  };

  const isClickRef = useRef(false);

  const handleInputPointerDown = () => {
    isClickRef.current = true;
  };

  const handleInputFocus = () => {
    const input = textInputRef.current;
    if (!input) return;

    // If focus was triggered via mouse click, handleInputClick will handle segment selection
    if (isClickRef.current) {
      isClickRef.current = false;
      return;
    }

    const currentDisplay = input.value || displayVal;
    if (isCompleteDate(currentDisplay)) {
      const range = getSegmentRange(currentDisplay, "day");
      // Use requestAnimationFrame to guarantee selection after modal auto-focus
      requestAnimationFrame(() => {
        if (textInputRef.current) {
          textInputRef.current.setSelectionRange(range[0], range[1]);
        }
      });
    }
  };

  const handleInputClick = () => {
    isClickRef.current = false;
    const input = textInputRef.current;
    if (!input) return;
    const currentDisplay = input.value;
    if (isCompleteDate(currentDisplay)) {
      const cursor = input.selectionStart ?? 0;
      const segment = getActiveSegment(currentDisplay, cursor);
      const range = getSegmentRange(currentDisplay, segment);
      input.setSelectionRange(range[0], range[1]);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label htmlFor={id} className="text-xs font-bold text-(--app-muted-foreground) block mr-1 text-right">
          {label} {required && <span className="text-(--app-error)">*</span>}
        </label>
      )}
      <div className={`relative ${containerClassName}`}>
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform z-10"
          onClick={() => !disabled && pickerRef.current?.showPicker()}
        >
          <Calendar className="w-4 h-4 text-(--color-primary)" />
        </div>
        <input
          ref={textInputRef}
          id={id}
          type="text"
          placeholder="يوم/شهر/سنة"
          value={displayVal}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onPointerDown={handleInputPointerDown}
          onFocus={handleInputFocus}
          onClick={handleInputClick}
          maxLength={15}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          className={`w-full pr-9 ${dayName ? "pl-[76px]" : "pl-3"} py-2 bg-(--app-surface) border rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right disabled:opacity-70 disabled:cursor-not-allowed ${
            error
              ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5'
              : 'border-(--app-border)'
          } ${inputClassName}`}
        />
        {dayName && (
          <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none select-none">
            <span className="px-2 py-0.5 rounded-lg bg-(--color-primary)/10 border border-(--color-primary)/20 text-[11px] font-black text-(--color-primary) tracking-tight">
              {dayName}
            </span>
          </div>
        )}
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
          min={min}
          max={max}
          value={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ""}
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onChange={handlePickerChange}
          disabled={disabled}
        />
      </div>
      {error && (
        <p className="text-[11px] font-bold text-(--app-error) mt-1">{error}</p>
      )}
    </div>
  );
}

