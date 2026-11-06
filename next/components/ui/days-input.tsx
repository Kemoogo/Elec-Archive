"use client";

import React from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

export function daysSuffix(n: number): string {
  if (n >= 3 && n <= 10) return "أيام";
  return "يوم";
}

export interface DaysInputProps {
  id?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function DaysInput({
  id,
  label,
  value,
  onChange,
  min = 1,
  max = 90,
  disabled = false,
  required = false,
  error,
  className = "",
  containerClassName = "",
}: DaysInputProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === "") {
      onChange(min);
      return;
    }
    const parsed = parseInt(raw, 10);
    if (!isNaN(parsed)) {
      onChange(Math.max(min, Math.min(max, parsed)));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(max, (value || 0) + 1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(min, (value || 0) - 1));
    }
  };

  const handleStepUp = () => {
    if (!disabled && value < max) {
      onChange(value + 1);
    }
  };

  const handleStepDown = () => {
    if (!disabled && value > min) {
      onChange(value - 1);
    }
  };

  return (
    <div className={`space-y-1.5 text-right ${containerClassName}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-xs font-bold text-(--app-muted-foreground) block mr-1 select-none"
        >
          {label}
          {required && <span className="text-(--app-error) mr-1 font-bold">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          value={value || ""}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`w-full pl-24 pr-3.5 py-2.5 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-60 disabled:cursor-not-allowed ${
            error ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""
          } ${className}`}
        />

        {/* Left Side Controls: Stepper Arrows on far left + Suffix Badge */}
        <div
          dir="ltr"
          className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-auto"
        >
          {/* Stepper Buttons (Far Left) */}
          <div className="flex flex-col items-center justify-center border-r border-(--app-border) pr-1.5 space-y-0.5">
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || value >= max}
              onClick={handleStepUp}
              className="p-0.5 hover:bg-(--color-primary)/10 text-(--color-primary) rounded transition-colors disabled:opacity-30 cursor-pointer"
              title="زيادة يوم"
            >
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled || value <= min}
              onClick={handleStepDown}
              className="p-0.5 hover:bg-(--color-primary)/10 text-(--color-primary) rounded transition-colors disabled:opacity-30 cursor-pointer"
              title="نقص يوم"
            >
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </div>

          {/* Suffix Badge: يوم / أيام */}
          <span className="px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) text-xs font-black select-none pointer-events-none">
            {daysSuffix(value)}
          </span>
        </div>
      </div>

      {error && <p className="text-[11px] font-bold text-(--app-error) mt-1">{error}</p>}
    </div>
  );
}
