"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ModalShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  titleVariant?: "default" | "danger" | "warning" | "info";
  onClose?: () => void;
  closeOnOverlayClick?: boolean;
  hideCloseButton?: boolean;
  dir?: "rtl" | "ltr";
  overlayClassName?: string;
  panelClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const emptySubscribe = () => () => {};

export function ModalShell({
  children,
  footer,
  title,
  icon,
  titleVariant = "default",
  onClose,
  closeOnOverlayClick = true,
  hideCloseButton = false,
  dir = "rtl",
  overlayClassName = "bg-black/40",
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: ModalShellProps) {
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  // Keep onCloseRef updated without re-triggering the mount effect
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Lock body scroll while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Auto-focus ONCE on initial modal mount only
    const focusTimer = setTimeout(() => {
      if (panelRef.current) {
        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
        );

        const firstInput = focusables.find((el) =>
          ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)
        );

        if (firstInput) {
          firstInput.focus();
        } else if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          panelRef.current.focus();
        }
      }
    }, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      // Trap Tab Navigation inside the Modal
      if (event.key === "Tab") {
        if (!panelRef.current) return;

        const focusables = Array.from(
          panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        ).filter(
          (el) => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0
        );

        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusables[0];
        const lastElement = focusables[focusables.length - 1];
        const currentActive = document.activeElement;

        if (event.shiftKey) {
          // Shift + Tab (Backward navigation)
          if (
            currentActive === firstElement ||
            !panelRef.current.contains(currentActive)
          ) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab (Forward navigation)
          if (
            currentActive === lastElement ||
            !panelRef.current.contains(currentActive)
          ) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the element that was focused prior to opening the modal
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
        previousActiveElementRef.current.focus();
      }
    };
  }, []); // Empty dependency array: runs strictly ONCE on mount!

  if (!mounted) return null;

  const modalContent = (
    <div
      className={cn(
        "fixed inset-0 z-60 flex items-center justify-center p-4 sm:p-6 no-print animate-fade-in-up transition-opacity transform-gpu",
        overlayClassName
      )}
      onClick={closeOnOverlayClick ? () => onCloseRef.current?.() : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className={cn(
          "flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-2xl transition-transform transform-gpu animate-modal-enter outline-none",
          panelClassName
        )}
        dir={dir}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || icon || !hideCloseButton) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-(--app-border) px-6 py-4 bg-(--app-surface-container-low)",
              headerClassName
            )}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {icon && (
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border",
                    titleVariant === "danger"
                      ? "bg-red-500/10 border-red-500/20 text-red-600"
                      : "bg-(--color-primary)/10 border-(--color-primary)/20 text-(--color-primary)"
                  )}
                >
                  {icon}
                </div>
              )}
              {title ? (
                typeof title === "string" ? (
                  <h2
                    className={cn(
                      "truncate text-base font-extrabold tracking-tight",
                      titleVariant === "danger"
                        ? "text-red-600 dark:text-red-400"
                        : "text-(--color-primary)"
                    )}
                  >
                    {title}
                  </h2>
                ) : (
                  <div
                    className={cn(
                      "text-base font-extrabold tracking-tight min-w-0",
                      titleVariant === "danger"
                        ? "text-red-600 dark:text-red-400"
                        : "text-(--color-primary)"
                    )}
                  >
                    {title}
                  </div>
                )
              ) : null}
            </div>

            {!hideCloseButton && onClose ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCloseRef.current?.()}
                  className="p-2 text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container) border border-transparent hover:border-(--app-border) rounded-xl transition-all duration-150 active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 shrink-0"
                  title="إغلاق (Esc)"
                  type="button"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-6 py-5 no-scrollbar", bodyClassName)}>
          {children}
        </div>

        {footer ? (
          <div
            className={cn(
              "shrink-0 border-t border-(--app-border) bg-(--app-surface-container-low) px-6 py-4",
              footerClassName
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

/* -----------------------------------------------------------------------
   Unified Sub-Components for Modal Internal Sections & Badges
   Ensures 100% Centralized Styling across all project Modals
----------------------------------------------------------------------- */

export interface ModalHeaderCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/** Standardized top summary card inside a modal */
export function ModalHeaderCard({
  title,
  subtitle,
  icon,
  badge,
  className,
}: ModalHeaderCardProps) {
  return (
    <div
      className={cn(
        "p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl flex items-center justify-between text-right",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary) shrink-0">
            {icon}
          </div>
        )}
        <div>
          {typeof title === "string" ? (
            <h4 className="text-base font-extrabold text-(--color-primary)">{title}</h4>
          ) : (
            title
          )}
          {subtitle && (
            <div className="text-xs text-(--app-muted-foreground) font-bold mt-0.5">{subtitle}</div>
          )}
        </div>
      </div>
      {badge && <div className="text-left">{badge}</div>}
    </div>
  );
}

export interface ModalSectionProps {
  children: React.ReactNode;
  className?: string;
  variant?: "card" | "recessed" | "danger" | "info";
  title?: React.ReactNode;
  badge?: React.ReactNode;
}

/** Standardized section / card container inside a modal */
export function ModalSection({
  children,
  className,
  variant = "card",
  title,
  badge,
}: ModalSectionProps) {
  const variantClasses = {
    card: "bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm",
    recessed: "bg-(--app-surface-container) border border-(--app-border)",
    danger: "bg-red-500/10 border border-red-500/30",
    info: "bg-blue-500/10 border border-blue-500/20",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-2xl space-y-2 text-right transition-all",
        variantClasses[variant],
        className
      )}
    >
      {(title || badge) && (
        <div className="flex items-center justify-between">
          {title ? (
            typeof title === "string" ? (
              <h5 className="text-xs font-black text-(--color-primary) flex items-center gap-1.5">
                {title}
              </h5>
            ) : (
              title
            )
          ) : (
            <div />
          )}
          {badge}
        </div>
      )}
      {children}
    </div>
  );
}

export interface ModalBadgeProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Standardized badge / chip inside modal cards */
export function ModalBadge({
  children,
  icon,
  className,
  onClick,
}: ModalBadgeProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm text-xs font-bold text-(--app-muted-foreground)",
        onClick && "hover:underline hover:text-(--app-info) cursor-pointer transition-colors",
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </div>
  );
}

