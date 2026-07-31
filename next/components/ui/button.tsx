import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  asChild?: boolean;
}

const buttonVariants = {
  default: "bg-(--color-primary) text-white hover:bg-(--color-primary-hover) shadow-md hover:shadow-lg active:scale-[0.97]",
  destructive: "bg-(--app-error) text-white hover:bg-(--app-error)/90 shadow-sm active:scale-[0.97]",
  outline: "border border-(--app-border) bg-(--app-surface) hover:bg-(--app-surface-container) hover:text-(--app-foreground) active:scale-[0.97]",
  secondary: "bg-(--app-surface-container) text-(--app-foreground) hover:bg-(--app-surface-container-low) border border-(--app-border)/20 active:scale-[0.97]",
  ghost: "hover:bg-(--app-surface-container) hover:text-(--app-foreground) active:scale-[0.97]",
  link: "text-(--color-primary) underline-offset-4 hover:underline",
};

const buttonSizes = {
  default: "h-10 px-4 py-2 rounded-xl text-sm font-bold",
  sm: "h-8 rounded-lg px-3 text-xs font-bold",
  lg: "h-11 rounded-xl px-8 text-base font-bold",
  icon: "h-10 w-10 rounded-xl",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild: _asChild = false, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          buttonSizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
