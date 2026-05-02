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

interface DateFieldProps {
  id: string;
  label: string;
  value: string; // ISO format (YYYY-MM-DD)
  onChange: (v: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
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
  className = "",
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
    if (/^\d{2}-\d{2}-\d{4}$/.test(formatted)) {
      onChange(toISODate(formatted));
    } else {
      onChange(formatted);
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    onChange(e.target.value); // Native picker gives YYYY-MM-DD
  };

  return (
    <div className={`space-y-1.5 w-full ${className}`}>
      <label htmlFor={id} className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
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
          maxLength={10}
          disabled={disabled}
          required={required}
          className="w-full pr-9 pl-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right disabled:opacity-70 disabled:cursor-not-allowed"
        />
        <input
          ref={pickerRef}
          type="date"
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onChange={handlePickerChange}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
