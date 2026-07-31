"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* ============================================
   Shared Form Field Components
   "Officer Style" — consistent with the Sapphire Archive design system
   ============================================ */

/* --- Focus colour variants --- */
const FOCUS_VARIANTS = {
  blue: "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  amber: "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  orange: "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
  cyan: "focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
} as const;

type FocusVariant = keyof typeof FOCUS_VARIANTS;

/* --- Label --- */
interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function FormLabel({ className, children, required, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        "text-xs font-bold text-(--app-muted-foreground) block mr-1",
        className,
      )}
      {...props}
    >
      {children}
      {required && <span className="text-(--app-error) mr-0.5">*</span>}
    </label>
  );
}

/* --- Input --- */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  inputSize?: "default" | "sm";
  focusVariant?: FocusVariant;
}

export const FormInput = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, inputSize = "default", focusVariant = "blue", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none transition-all text-right placeholder:text-(--app-muted-foreground)/50 disabled:opacity-60 disabled:cursor-not-allowed",
          inputSize === "default" && "px-3 py-2",
          inputSize === "sm" && "px-2.5 py-1.5 text-xs",
          FOCUS_VARIANTS[focusVariant],
          className,
        )}
        {...props}
      />
    );
  },
);
FormInput.displayName = "FormInput";

/* --- Select --- */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  selectSize?: "default" | "sm";
  focusVariant?: FocusVariant;
}

export const FormSelect = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, selectSize = "default", focusVariant = "blue", ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "w-full bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) appearance-none text-right focus:outline-none transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
            selectSize === "default" && "px-3 py-2 pr-3 pl-10",
            selectSize === "sm" && "px-2.5 py-1.5 pr-2.5 pl-8 text-xs",
            FOCUS_VARIANTS[focusVariant],
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground)/60 pointer-events-none" />
      </div>
    );
  },
);
FormSelect.displayName = "FormSelect";

/* --- Textarea --- */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  textareaSize?: "default" | "sm";
  focusVariant?: FocusVariant;
}

export const FormTextarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, textareaSize = "default", focusVariant = "blue", ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none transition-all text-right resize-none placeholder:text-(--app-muted-foreground)/50 disabled:opacity-60 disabled:cursor-not-allowed",
          textareaSize === "default" && "min-h-[80px] px-3 py-2",
          textareaSize === "sm" && "min-h-[60px] px-2.5 py-1.5 text-xs",
          FOCUS_VARIANTS[focusVariant],
          className,
        )}
        {...props}
      />
    );
  },
);
FormTextarea.displayName = "FormTextarea";

/* --- FormField (convenience wrapper: label + input) --- */
interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}

export function FormField({ label, required, error, children, className, labelClassName }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <FormLabel required={required} className={labelClassName}>{label}</FormLabel>
      {children}
      {error && (
        <p className="text-xs font-bold text-(--app-error) mr-1">{error}</p>
      )}
    </div>
  );
}
