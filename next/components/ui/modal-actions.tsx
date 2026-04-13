"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface ModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  submitText?: string;
  submitLoading?: boolean;
  cancelText?: string;
  onCancel?: () => void;
}

export function ModalActions({
  className,
  submitText,
  submitLoading,
  cancelText,
  onCancel,
  children,
  ...props
}: ModalActionsProps) {
  return (
    <div
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-start", className)}
      {...props}
    >
      {children ? children : (
        <>
          <button
            type="submit"
            disabled={submitLoading}
            className="inline-flex justify-center items-center rounded-xl bg-(--app-accent) px-4 py-2 text-sm font-bold text-(--app-accent-foreground) hover:bg-(--app-accent)/90 disabled:opacity-50 transition-all cursor-pointer"
          >
            {submitLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                جاري المعالجة...
              </>
            ) : submitText || "حفظ"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex justify-center items-center rounded-xl bg-(--app-surface-container) border border-(--app-border) px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-all cursor-pointer"
            >
              {cancelText || "إلغاء"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
