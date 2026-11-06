"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ModalActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  mode?: "action" | "view";
  submitText?: string;
  submitLoading?: boolean;
  submitDisabled?: boolean;
  submitVariant?: "primary" | "destructive";
  cancelText?: string;
  onCancel?: () => void;
  onSubmit?: () => void;
  onConfirm?: () => void;
  form?: string;
  isDirty?: boolean;
  readOnly?: boolean;
  hideSubmit?: boolean;
  destructiveText?: string;
  onDestructive?: () => void;
  destructiveLoading?: boolean;
  destructiveDisabled?: boolean;
  startSlot?: React.ReactNode;
}

export function ModalActions({
  className,
  mode = "action",
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
  isDirty = true,
  readOnly = false,
  hideSubmit = false,
  destructiveText,
  onDestructive,
  destructiveLoading = false,
  destructiveDisabled = false,
  startSlot,
  ...props
}: ModalActionsProps) {
  const isViewMode = mode === "view" || readOnly;
  const shouldHideSubmit = hideSubmit || (isViewMode && !submitText && !onSubmit && !onConfirm);
  const handleClick = onSubmit || onConfirm;
  const effectiveCancelText = cancelText || (isViewMode ? "إغلاق" : "إلغاء");
  const isSubmitDisabled = Boolean(submitLoading || submitDisabled || !isDirty);

  // If children are supplied explicitly, preserve existing custom layout
  if (children) {
    return (
      <div
        className={cn("flex flex-row-reverse items-center justify-start gap-3 w-full", className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Right-side auxiliary action (Destructive or startSlot)
  const hasStartContent = Boolean(startSlot || (destructiveText && onDestructive));

  const startContent = hasStartContent ? (
    <div className="flex items-center gap-2">
      {startSlot}
      {destructiveText && onDestructive && (
        <button
          type="button"
          onClick={onDestructive}
          disabled={destructiveDisabled || destructiveLoading}
          className="btn-destructive inline-flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {destructiveLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{destructiveText}</span>
        </button>
      )}
    </div>
  ) : null;

  // Left-side primary & secondary action buttons
  const actionButtons = (
    <div className="flex flex-row-reverse items-center gap-3">
      {!shouldHideSubmit && (
        <button
          type={form ? "submit" : "button"}
          form={form}
          onClick={handleClick}
          disabled={isSubmitDisabled}
          className={cn(
            submitVariant === "destructive" ? "btn-destructive" : "btn-primary",
            "inline-flex items-center gap-1.5 text-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          )}
          title={!isDirty && !submitLoading ? "لم يتم إجراء أي تعديل بعد" : undefined}
        >
          {submitLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
              <span>جاري الحفظ...</span>
            </>
          ) : (
            <span>{submitText || "حفظ التغييرات"}</span>
          )}
        </button>
      )}

      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary text-xs cursor-pointer"
        >
          {effectiveCancelText}
        </button>
      )}
    </div>
  );

  if (hasStartContent) {
    return (
      <div
        className={cn("flex items-center justify-between gap-3 w-full", className)}
        {...props}
      >
        {startContent}
        {actionButtons}
      </div>
    );
  }

  return (
    <div
      className={cn("flex flex-row-reverse items-center justify-start gap-3 w-full", className)}
      {...props}
    >
      {actionButtons}
    </div>
  );
}

