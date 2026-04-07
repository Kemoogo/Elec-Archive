"use client";

import { ReactNode, useState, useRef, useEffect } from "react";
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
}

/** Primary (filled) button for the page header */
export function PrimaryHeaderBtn({ label, icon, href, onClick, disabled }: HeaderAction) {
  if (href) {
    return (
      <Link href={href} className="btn-primary">
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
      className="btn-primary disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/** Secondary (outline/ghost) button for the page header */
export function SecondaryHeaderBtn({ label, icon, href, onClick, disabled }: HeaderAction) {
  if (href) {
    return (
      <Link href={href} className="btn-secondary">
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
      className="btn-secondary disabled:opacity-60 disabled:cursor-not-allowed"
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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const displaySubtitle = subtitle || description;
  const displayActions = actions || action;

  /* Auto-focus input when search opens */
  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isSearchOpen]);

  const handleToggleSearch = () => {
    if (isSearchOpen) onSearchChange?.("");
    setIsSearchOpen((prev) => !prev);
  };

  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4 bg-(--color-surface) rounded-2xl shadow-sm border border-(--color-border) mb-6">
      {/* Icon + Title */}
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="bg-(--color-primary) p-3 rounded-xl text-white shadow-md shadow-blue-900/10 flex items-center justify-center shrink-0">
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
        {/* Expanding search field — CodeGeex style */}
        {showSearch && (
          <div
            className={`transition-all duration-300 overflow-hidden ${isSearchOpen ? "w-64 opacity-100" : "w-0 opacity-0"
              }`}
          >
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground)" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pr-9 pl-9 py-2 bg-(--app-surface-container) border border-(--app-border) rounded-xl text-sm font-bold text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-(--color-primary)/20 focus:border-(--color-primary) transition-all"
                dir="rtl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-(--app-border) rounded-md text-(--app-muted-foreground) transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Search toggle button */}
        {showSearch && (
          <button
            type="button"
            onClick={handleToggleSearch}
            title="بحث"
            className={[
              "p-2 rounded-xl transition-all active:scale-95",
              isSearchOpen
                ? "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20"
                : "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border) hover:bg-(--app-border)",
            ].join(" ")}
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {children}
        {displayActions}
      </div>
    </header>
  );
}
