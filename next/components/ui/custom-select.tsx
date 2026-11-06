"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  description?: string;
  badge?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface CustomSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export function CustomSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder = "اختر من القائمة...",
  disabled = false,
  required = false,
  error,
  className = "",
  containerClassName = "",
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update position relative to viewport using trigger bounding rect
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();

    // If trigger is scrolled completely out of viewport, close it
    if (rect.bottom < 0 || rect.top > window.innerHeight) {
      setIsOpen(false);
      return;
    }

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const preferredHeight = 240; // max-h-60 = 240px

    // Open upwards only if there's clearly not enough space below (< 180px) AND more space above
    const openUpwards = spaceBelow < 180 && spaceAbove > spaceBelow;

    if (openUpwards) {
      setMenuStyle({
        position: "fixed",
        bottom: `${Math.round(window.innerHeight - rect.top + 6)}px`,
        left: `${Math.round(rect.left)}px`,
        width: `${Math.round(rect.width)}px`,
        maxHeight: `${Math.min(Math.round(spaceAbove - 16), preferredHeight)}px`,
        zIndex: 95,
      });
    } else {
      setMenuStyle({
        position: "fixed",
        top: `${Math.round(rect.bottom + 6)}px`,
        left: `${Math.round(rect.left)}px`,
        width: `${Math.round(rect.width)}px`,
        maxHeight: `${Math.min(Math.round(spaceBelow - 16), preferredHeight)}px`,
        zIndex: 95,
      });
    }
  }, []);

  // Keep dropdown attached to trigger on scroll or resize
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScrollOrResize, true);
    window.addEventListener("resize", handleScrollOrResize);

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize, true);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isOpen, updatePosition]);

  // Close on click outside (checking both container trigger and portaled menu)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsideMenu = menuRef.current?.contains(target);

      if (!isInsideContainer && !isInsideMenu) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!isOpen) {
          updatePosition();
        }
        setIsOpen((prev) => !prev);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen) {
          updatePosition();
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const nextIndex = (currentIndex + 1) % options.length;
          const nextOpt = options[nextIndex];
          if (nextOpt && !nextOpt.disabled) {
            onChange(nextOpt.value);
          }
        }
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!isOpen) {
          updatePosition();
          setIsOpen(true);
        } else {
          const currentIndex = options.findIndex((opt) => opt.value === value);
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          const prevOpt = options[prevIndex];
          if (prevOpt && !prevOpt.disabled) {
            onChange(prevOpt.value);
          }
        }
      }
    },
    [disabled, isOpen, options, value, onChange, updatePosition]
  );

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className={`space-y-1.5 text-right relative ${containerClassName}`} ref={containerRef}>
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
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              if (!isOpen) {
                updatePosition();
              }
              setIsOpen((prev) => !prev);
            }
          }}
          onKeyDown={handleKeyDown}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full px-3.5 py-2.5 bg-(--app-surface) border rounded-xl text-sm font-bold text-(--app-foreground) flex items-center justify-between transition-all cursor-pointer select-none text-right disabled:opacity-60 disabled:cursor-not-allowed ${
            isOpen
              ? "border-blue-500 ring-2 ring-blue-500/20 shadow-xs"
              : error
              ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5"
              : "border-(--app-border) hover:border-(--app-border)/80"
          } ${className}`}
        >
          <div className="flex items-center justify-between gap-2 flex-1 min-w-0">
            <div className="flex items-center gap-2 truncate">
              {selectedOption?.icon && (
                <span className="shrink-0 text-(--color-primary)">{selectedOption.icon}</span>
              )}
              <span
                className={`truncate ${
                  selectedOption ? "text-(--app-foreground)" : "text-(--app-muted-foreground)/60"
                }`}
              >
                {selectedOption ? selectedOption.label : placeholder}
              </span>
            </div>
            {selectedOption?.badge && (
              <span className="px-1.5 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) text-[10px] font-black tracking-tight shrink-0 me-2">
                {selectedOption.badge}
              </span>
            )}
          </div>

          <ChevronDown
            className={`w-4 h-4 text-(--app-muted-foreground) transition-transform duration-200 shrink-0 mr-2 ${
              isOpen ? "rotate-180 text-(--color-primary)" : ""
            }`}
          />
        </button>

        {/* Dropdown Menu Portaled to document.body so it overflows modals and footers cleanly */}
        {isOpen &&
          mounted &&
          createPortal(
            <div
              ref={menuRef}
              role="listbox"
              tabIndex={-1}
              dir="rtl"
              style={menuStyle}
              className="bg-(--app-surface) border border-(--app-border) rounded-xl shadow-depth-xl py-1.5 overflow-y-auto no-scrollbar focus:outline-none transition-all animate-in fade-in-50 zoom-in-95 duration-100"
            >
              {options.map((option) => {
                const isSelected = option.value === value;
                return (
                  <div
                    key={option.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    className={`px-3.5 py-2 text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                      option.disabled
                        ? "opacity-40 cursor-not-allowed"
                        : isSelected
                        ? "bg-(--color-primary)/10 text-(--color-primary) font-black"
                        : "text-(--app-foreground) hover:bg-(--app-surface-container)"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      {option.icon && (
                        <span
                          className={`shrink-0 ${
                            isSelected ? "text-(--color-primary)" : "text-(--app-muted-foreground)"
                          }`}
                        >
                          {option.icon}
                        </span>
                      )}
                      <div className="flex flex-col truncate text-right flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className="truncate">{option.label}</span>
                          {option.badge && (
                            <span className="px-1.5 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) text-[10px] font-black tracking-tight shrink-0 ms-auto">
                              {option.badge}
                            </span>
                          )}
                        </div>
                        {option.description && (
                          <span className="text-[10px] text-(--app-muted-foreground) font-normal truncate mt-0.5">
                            {option.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-(--color-primary) shrink-0 ml-1 stroke-[2.5]" />
                    )}
                  </div>
                );
              })}
            </div>,
            document.body
          )}
      </div>

      {error && <p className="text-[11px] font-bold text-(--app-error) mt-1">{error}</p>}
    </div>
  );
}
