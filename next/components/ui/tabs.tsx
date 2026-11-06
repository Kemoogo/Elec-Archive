"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type TabsVariant = "folder" | "pills" | "underlined" | "cards";

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (val: string) => void;
  variant: TabsVariant;
} | null>(null);

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string;
    onValueChange?: (val: string) => void;
    defaultValue?: string;
    variant?: TabsVariant;
  }
>(({ className, value, onValueChange, defaultValue, variant = "folder", ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "");

  const selectedValue = value !== undefined ? value : internalValue;
  const handleValueChange = onValueChange !== undefined ? onValueChange : setInternalValue;

  return (
    <TabsContext.Provider
      value={{
        value: selectedValue,
        onValueChange: handleValueChange,
        variant,
      }}
    >
      <div
        ref={ref}
        className={cn("w-full flex flex-col space-y-0", className)}
        {...props}
      />
    </TabsContext.Provider>
  );
});
Tabs.displayName = "Tabs";

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsList must be used within Tabs");

  const { variant } = context;

  return (
    <div
      className={cn(
        "relative w-full print:hidden",
        variant === "folder" && "bg-(--app-surface-container) rounded-t-2xl border border-b-0 border-(--app-border) pt-2 px-2.5 shadow-xs",
        variant === "underlined" && "border-b border-(--app-border) px-1",
        variant === "pills" && "bg-(--app-surface-container) border border-(--app-border) p-1.5 rounded-2xl w-fit max-w-full mb-4 shadow-xs",
        variant === "cards" && "gap-2 mb-4"
      )}
    >
      <div
        ref={ref}
        className={cn(
          "flex gap-1.5 overflow-x-auto overflow-y-hidden no-scrollbar",
          variant === "folder" ? "items-end -mb-[1px] border-b border-(--app-border)" : "items-center",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
});
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    value: string;
    isFirst?: boolean;
    isLast?: boolean;
    badge?: number | string;
  }
>(({ className, value, children, isFirst: _isFirst, isLast: _isLast, badge, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsTrigger must be used within Tabs");

  const { value: activeValue, onValueChange, variant } = context;
  const isActive = activeValue === value;

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap text-xs sm:text-sm font-bold transition-all duration-150 cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
        
        /* Folder Variant: Distinct header container contrast, active tab pops seamlessly into content container below */
        variant === "folder" && [
          isActive
            ? "px-5 py-2.5 sm:px-6 sm:py-3 rounded-t-xl bg-(--app-surface) text-(--color-primary) border-t border-x border-(--app-border) border-b-0 font-black -mb-[1px] z-20 shadow-xs after:absolute after:-bottom-[2px] after:inset-x-0 after:h-[3px] after:bg-(--app-surface) after:z-30"
            : "px-4 py-2 my-0.5 rounded-lg border border-transparent text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface)/80 transition-all duration-150"
        ],

        /* Pills Variant */
        variant === "pills" && [
          "px-4 py-2 rounded-xl transition-all",
          isActive
            ? "bg-(--app-surface) text-(--color-primary) shadow-sm font-black border border-(--app-border)/40"
            : "text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface)/80"
        ],

        /* Underlined Variant */
        variant === "underlined" && [
          "px-4 py-3 rounded-none border-b-2 transition-all",
          isActive
            ? "border-(--color-primary) text-(--color-primary) font-black"
            : "border-transparent text-(--app-muted-foreground) hover:text-(--color-primary) hover:border-(--color-primary)/40"
        ],

        /* Cards Variant */
        variant === "cards" && [
          "px-5 py-3 rounded-2xl border transition-all",
          isActive
            ? "bg-(--app-surface) text-(--color-primary) border-blue-500/40 shadow-md font-black"
            : "bg-(--app-surface-container) text-(--app-muted-foreground) border-(--app-border) hover:text-(--color-primary) hover:bg-(--app-surface)"
        ],

        className
      )}
      onClick={() => onValueChange(value)}
      {...props}
    >
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
        {badge !== undefined && badge !== null && (
          <span
            className={cn(
              "inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-extrabold tabular-nums rounded-full transition-all duration-200",
              isActive
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 shadow-xs"
                : "bg-(--app-surface-container-low) text-(--app-muted-foreground) border border-(--app-border)"
            )}
          >
            {badge}
          </span>
        )}
      </span>
    </button>
  );
});
TabsTrigger.displayName = "TabsTrigger";

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error("TabsContent must be used within Tabs");

  const { value: activeValue, variant } = context;
  const isActive = activeValue === value;

  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "bg-(--app-surface)",
        variant === "folder" && "rounded-b-2xl border border-t-0 border-(--app-border) shadow-xs",
        variant === "pills" && "rounded-2xl border border-(--app-border) shadow-xs mt-2",
        variant === "underlined" && "rounded-b-2xl border border-t-0 border-(--app-border) shadow-xs",
        variant === "cards" && "rounded-2xl border border-(--app-border) shadow-xs mt-2",
        isActive
          ? "opacity-100 relative visible block"
          : "opacity-0 absolute inset-0 -z-10 invisible hidden",
        className
      )}
      {...props}
    >
      {isActive && (
        <div key={value} className="p-5 sm:p-6 md:p-8 animate-tab-enter">
          {children}
        </div>
      )}
    </div>
  );
});
TabsContent.displayName = "TabsContent";

export { Tabs, TabsList, TabsTrigger, TabsContent };
