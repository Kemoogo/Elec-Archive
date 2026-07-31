"use client";

import { useRef } from "react";
import { Calendar } from "lucide-react";

/* ─── Date helpers (DD-MM-YYYY ↔ YYYY-MM-DD) ─── */
export function toDisplayDate(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}

export function toISODate(display: string): string {
  const m = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : display;
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
  return /^\d{2}-\d{2}-\d{4}$/.test(value);
}

function normalizeCompleteDate(display: string): string {
  if (!isCompleteDate(display)) return display;

  const [, dayStr, monthStr, yearStr] = display.match(/^(\d{2})-(\d{2})-(\d{4})$/) ?? [];
  const year = Number(yearStr);
  const month = Math.min(Math.max(Number(monthStr), 1), 12);
  const maxDay = getMaxDay(month, year);
  const day = Math.min(Math.max(Number(dayStr), 1), maxDay);

  return `${pad2(day)}-${pad2(month)}-${pad4(year)}`;
}

function getActiveSegment(cursor: number): "day" | "month" | "year" {
  if (cursor <= 2) return "day";
  if (cursor <= 5) return "month";
  return "year";
}

function adjustDateSegment(display: string, segment: "day" | "month" | "year", delta: 1 | -1): string {
  if (!isCompleteDate(display)) return display;

  const [, dayStr, monthStr, yearStr] = display.match(/^(\d{2})-(\d{2})-(\d{4})$/) ?? [];
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

  return `${pad2(day)}-${pad2(month)}-${pad4(year)}`;
}

interface DateFieldProps {
  id: string;
  label: string;
  value: string; // ISO format (YYYY-MM-DD)
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  containerClassName?: string;
  inputClassName?: string;
}

/**
 * Smart DateField that allows continuous digit entry without separators.
 * Auto-pads single digits if the segment becomes invalid (e.g., "1121987" -> "11-02-1987").
 */
export function DateField({
  id,
  label,
  value,
  onChange,
  disabled,
  required,
  error,
  className = "",
  containerClassName = "",
  inputClassName = "",
}: DateFieldProps) {
  const pickerRef = useRef<HTMLInputElement>(null);

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
        // e.g. 12024 (if we allowed 5 chars here)
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
        const m_mm = prefix.slice(1);

        const ddValid = parseInt(d_dd) >= 1 && parseInt(d_dd) <= 31;
        const mmValid = parseInt(m_mm) >= 1 && parseInt(m_mm) <= 12;

        if (ddValid && parseInt(m_m) > 0) {
          d = d_dd;
          m = "0" + m_m;
        } else if (parseInt(d_d) > 0 && mmValid) {
          d = "0" + d_d;
          m = m_mm;
        } else {
          d = d_dd;
          m = "0" + m_m;
        }
      } else if (prefix.length === 4) {
        // Case: 01011987 -> DD-MM
        d = prefix.slice(0, 2);
        m = prefix.slice(2, 4);
      }
    } else {
      // Typing Mode (1-5 digits or unrecognized year): Simple sequential split
      d = raw.slice(0, 2);
      if (raw.length > 2) {
        m = raw.slice(2, 4);
        if (raw.length > 4) {
          y = raw.slice(4);
        }
      }
    }

    // 3. Final Constraints (No 00 permitted for operational segments)
    if (d === "00") d = "01";
    if (m === "00") m = "01";

    // 4. Reconstruction with dashes
    let formatted = d;
    if (m) {
      formatted += "-" + m;
      if (y) {
        formatted += "-" + y;
      }
    }

    // 5. Update parent state
    if (isCompleteDate(formatted)) {
      onChange(toISODate(normalizeCompleteDate(formatted)));
    } else {
      onChange(formatted);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;

    const input = e.currentTarget;
    const displayValue = toDisplayDate(value);
    if (!isCompleteDate(displayValue)) return;

    e.preventDefault();

    const cursor = input.selectionStart ?? displayValue.length;
    const segment = getActiveSegment(cursor);
    const nextDisplayValue = adjustDateSegment(displayValue, segment, e.key === "ArrowUp" ? 1 : -1);

    onChange(toISODate(nextDisplayValue));

    const selectionBySegment: Record<"day" | "month" | "year", [number, number]> = {
      day: [0, 2],
      month: [3, 5],
      year: [6, 10],
    };

    requestAnimationFrame(() => {
      const [start, end] = selectionBySegment[segment];
      input.setSelectionRange(start, end);
    });
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    onChange(e.target.value); // Native picker gives YYYY-MM-DD
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <label htmlFor={id} className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
        {label} {required && <span className="text-(--app-error)">*</span>}
      </label>
      <div className={`relative ${containerClassName}`}>
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform z-10"
          onClick={() => !disabled && pickerRef.current?.showPicker()}
        >
          <Calendar className="w-4 h-4 text-(--color-primary)" />
        </div>
        <input
          id={id}
          type="text"
          placeholder="يوم-شهر-سنة"
          value={toDisplayDate(value)}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          maxLength={10}
          disabled={disabled}
          required={required}
          className={`w-full pr-9 pl-3 py-2 bg-(--app-surface) border rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right disabled:opacity-70 disabled:cursor-not-allowed ${
            error
              ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5'
              : 'border-(--app-border)'
          } ${inputClassName}`}
        />
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden="true"
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
