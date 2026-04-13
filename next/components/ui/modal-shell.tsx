"use client";

import * as React from "react";
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

export function ModalShell({
  children,
  footer,
  title,
  onClose,
  closeOnOverlayClick = false,
  hideCloseButton = false,
  dir = "rtl",
  overlayClassName,
  panelClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
}: ModalShellProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4",
        overlayClassName,
      )}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={cn(
          "flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-(--app-border) bg-(--app-surface) shadow-xl",
          panelClassName,
        )}
        dir={dir}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || !hideCloseButton) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between border-b border-(--app-border) px-6 py-4",
              headerClassName,
            )}
          >
            <div className="min-w-0">
              {title ? (
                <h2 className="truncate text-lg font-bold text-(--app-white)">{title}</h2>
              ) : null}
            </div>

            {!hideCloseButton && onClose ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={onClose} 
                  className="p-1 hover:bg-slate-50 rounded-full transition-colors" 
                  title="إغلاق"
                  type="button"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            ) : null}
          </div>
        )}

        <div className={cn("flex-1 overflow-y-auto px-6 py-5", bodyClassName)}>{children}</div>

        {footer ? (
          <div
            className={cn(
              "shrink-0 border-t border-(--app-border) bg-(--app-surface) px-6 py-4",
              footerClassName,
            )}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
