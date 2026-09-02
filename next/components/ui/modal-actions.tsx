"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  submitText?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  submitVariant?: "primary" | "destructive";
  cancelText?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
  onConfirm?: () => void;
  form?: string;
}

export function ModalActions({
  className,
  submitText,
  submitLoading,
  submitDisabled,
  submitVariant = "primary",
  cancelText,
  onCancel,
  onSubmit,
  onConfirm,
  children,
  form,
  ...props
}: ModalActionsProps) {
  const handleClick = onSubmit || onConfirm;

  return (
    <div
      className={cn("flex flex-row-reverse items-center justify-start gap-3 w-full", className)}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          <button
            type={form ? "submit" : "button"}
            form={form}
            onClick={handleClick}
            disabled={submitLoading || submitDisabled}
            className={submitVariant === "destructive" ? "btn-destructive" : "btn-primary"}
          >
            {submitLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>جاري الحفظ...</span>
              </>
            ) : (
              <span>{submitText || "حفظ التغييرات"}</span>
            )}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
            >
              {cancelText || "إلغاء"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
