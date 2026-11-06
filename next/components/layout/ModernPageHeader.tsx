"use client";

import { ReactNode, useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowRight, LayoutDashboard, Search, X } from "lucide-react";

/* -----------------------------------------------------------------------
   Shared button shapes used across all page headers.
   - PrimaryAction  → filled blue (btn-primary)
   - SecondaryAction → ghost/outline (btn-secondary)
----------------------------------------------------------------------- */
export interface HeaderAction {
  /** Button label */
  label: string;
  /** Lucide icon node */
  icon?: ReactNode;
  /** If href is provided the button renders as a <Link>, otherwise a <button> */
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Optional hover tooltip */
  title?: string;
}

/** Primary (filled) button for the page header */
export function PrimaryHeaderBtn({ label, icon, href, onClick, disabled, title }: HeaderAction) {
  if (href) {
    return (
      <Link href={href} title={title} className="btn-primary">
        {icon}
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Secondary (outline/ghost) button for the page header */
export function SecondaryHeaderBtn({ label, icon, href, onClick, disabled, title }: HeaderAction) {
  if (href) {
    return (
      <Link href={href} title={title} className="btn-secondary">
        {icon}
        <span>{label}</span>
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* -----------------------------------------------------------------------
   ModernPageHeader
----------------------------------------------------------------------- */
interface ModernPageHeaderProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  description?: string | ReactNode;
  icon?: ReactNode;
  /** Arbitrary ReactNode actions (e.g. custom modals, dropdowns) */
  actions?: ReactNode;
  /** Alias for actions */
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  children?: ReactNode;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  searchPlaceholder?: string;
}

export { ModernPageHeader as PageHeader };
export function ModernPageHeader({
  title,
  subtitle,
  description,
  icon,
  actions,
  action,
  backHref,
  backLabel = "رجوع",
  children,
  showSearch = false,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "بحث...",
}: ModernPageHeaderProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(Boolean(searchQuery));
  const [inputValue, setInputValue] = useState(searchQuery);
  const lastCommittedRef = useRef(searchQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const displaySubtitle = subtitle || description;
  const displayActions = actions || action;

  // Synchronize internal input value if external searchQuery prop updates (e.g. URL change, reset)
  useEffect(() => {
    setInputValue(searchQuery);
    lastCommittedRef.current = searchQuery;
    if (searchQuery && !isSearchOpen) {
      setIsSearchOpen(true);
    }
  }, [searchQuery, isSearchOpen]);

  /* Auto-focus input when search opens */
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const commitSearch = useCallback(
    (queryToCommit: string) => {
      const trimmed = queryToCommit.trim();
      // Ignore single character to avoid excessive database table scans
      if (trimmed.length === 1) return;
      if (trimmed === lastCommittedRef.current) return;
      lastCommittedRef.current = trimmed;
      onSearchChange?.(trimmed);
    },
    [onSearchChange]
  );

  // Debounced search: triggers 500ms after user stops typing (for queries >= 2 chars)
  useEffect(() => {
    if (!inputValue.trim()) return;
    if (inputValue.trim().length < 2) return;
    if (inputValue.trim() === lastCommittedRef.current) return;

    const timer = setTimeout(() => {
      commitSearch(inputValue);
    }, 500);

    return () => clearTimeout(timer);
  }, [inputValue, commitSearch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setInputValue(nextVal);
    // When cleared completely, immediately reset search without delay
    if (!nextVal.trim() && lastCommittedRef.current !== "") {
      lastCommittedRef.current = "";
      onSearchChange?.("");
    }
  };

  const handleClear = () => {
    setInputValue("");
    if (lastCommittedRef.current !== "") {
      lastCommittedRef.current = "";
      onSearchChange?.("");
    }
    inputRef.current?.focus();
  };

  const handleToggleSearch = () => {
    if (isSearchOpen) {
      setInputValue("");
      if (lastCommittedRef.current !== "") {
        lastCommittedRef.current = "";
        onSearchChange?.("");
      }
      setIsSearchOpen(false);
    } else {
      setIsSearchOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitSearch(inputValue);
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleClear();
      setIsSearchOpen(false);
    }
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-(--color-surface) rounded-2xl shadow-sm border border-(--color-border) mb-6 print:hidden">
      {/* Icon + Title */}
      <div className="flex items-center gap-4 flex-1 min-w-0 group">
        <div className="bg-(--color-primary) p-3 rounded-xl text-white shadow-md shadow-blue-900/10 flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-lg">
          {icon || <LayoutDashboard className="w-6 h-6" />}
        </div>
        <div className="min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="mb-1 flex w-fit items-center text-[10px] font-bold text-(--color-muted) transition hover:text-(--color-primary)"
            >
              <ArrowRight className="ml-1 h-3 w-3" />
              {backLabel}
            </Link>
          )}
          <h1 className="text-xl font-black text-(--color-primary) leading-tight truncate">
            {title}
          </h1>
          {displaySubtitle && (
            <p className="text-xs text-(--color-muted) font-bold mt-1">{displaySubtitle}</p>
          )}
        </div>
      </div>

      {/* Right side: expanding search + action buttons */}
      <div className="flex gap-2 items-center flex-wrap justify-end">
        {/* Expanding search field with fixed-width inner container */}
        {showSearch && (
          <div className="flex items-center gap-1.5">
            <div
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                isSearchOpen
                  ? "max-w-[260px] opacity-100"
                  : "max-w-0 opacity-0 pointer-events-none"
              }`}
            >
              <div className="w-[200px] sm:w-[240px] relative">
                <button
                  type="button"
                  onClick={() => commitSearch(inputValue)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
                  title="بحث (Enter)"
                >
                  <Search className="w-4 h-4" />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  tabIndex={isSearchOpen ? 0 : -1}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full pr-9 pl-8 py-2 bg-(--app-surface-container) border border-(--app-border)/60 rounded-xl text-sm font-bold text-(--color-primary) placeholder:text-(--app-muted-foreground)/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-xs"
                  dir="rtl"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-(--app-border) rounded-md text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors cursor-pointer"
                    title="مسح النص"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Search toggle button with smooth icon morphing */}
            <button
              type="button"
              onClick={handleToggleSearch}
              title={isSearchOpen ? "إغلاق البحث" : "فتح البحث"}
              className={`p-2 rounded-xl text-sm font-bold transition-all active:scale-95 focus:outline-none cursor-pointer ${
                isSearchOpen
                  ? "bg-(--app-surface-container) text-(--color-primary) border border-(--app-border)/60 shadow-xs"
                  : "bg-(--app-surface-container-low) text-(--color-primary) hover:bg-(--app-surface-container)"
              }`}
            >
              {isSearchOpen ? <X className="w-5 h-5 text-(--app-muted-foreground)" /> : <Search className="w-5 h-5" />}
            </button>
          </div>
        )}

        {children}
        {displayActions}
      </div>
    </header>
  );
}
