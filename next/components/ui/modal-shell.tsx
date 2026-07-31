"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ModalShellProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  title?: React.ReactNode;
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

export function ModalShell({
  children,
  footer,
  title,
  onClose,
  closeOnOverlayClick = true,
  hideCloseButton = false,
  dir = "rtl",
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: ModalShellProps) {
  const [mounted, setMounted] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previousActiveElementRef = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);

  // Keep onCloseRef updated without re-triggering the mount effect
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    setMounted(true);
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
        "fixed inset-0 z-60 flex items-center justify-center bg-slate-950/75 p-4 sm:p-6 no-print animate-fade-in-up transition-opacity transform-gpu",
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
          "flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-(--app-border) bg-(--app-surface) shadow-2xl transition-transform transform-gpu animate-tab-premium outline-none",
          panelClassName
        )}
        dir={dir}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || !hideCloseButton) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-(--app-border) px-6 py-4 bg-(--app-surface-container-low)",
              headerClassName
            )}
          >
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate text-base sm:text-lg font-extrabold text-(--app-foreground)">
                  {title}
                </h2>
              ) : null}
            </div>

            {!hideCloseButton && onClose ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCloseRef.current?.()}
                  className="p-2 text-(--app-muted-foreground) hover:text-(--app-foreground) hover:bg-(--app-surface-container) border border-transparent hover:border-(--app-border) rounded-xl transition-all duration-150 active:scale-90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30"
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
