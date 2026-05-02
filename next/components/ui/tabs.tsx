"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const TabsContext = React.createContext<{
  value: string,
  onValueChange: (val: string) => void,
} | null>(null)

const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string,
    onValueChange?: (val: string) => void,
    defaultValue?: string
  }
>(({ className, value, onValueChange, defaultValue, ...props }, ref) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")

  const selectedValue = value !== undefined ? value : internalValue
  const handleValueChange = onValueChange !== undefined ? onValueChange : setInternalValue

  return (
    <TabsContext.Provider value={{ value: selectedValue, onValueChange: handleValueChange }}>
      <div
        ref={ref}
        className={cn("w-full flex flex-col", className)}
        {...props}
      />
    </TabsContext.Provider>
  )
})
Tabs.displayName = "Tabs"

const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsList must be used within Tabs")

  return (
    <div className="relative flex justify-start w-full px-0">
      <div
        ref={ref}
        className={cn(
          "relative flex items-end w-full overflow-visible bg-(--app-surface-container)/40 rounded-t-[1.5rem] p-1 pb-0 gap-1",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
})
TabsList.displayName = "TabsList"

const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string, isFirst?: boolean, isLast?: boolean }
>(({ className, value, children, isFirst, isLast, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsTrigger must be used within Tabs")

  const isActive = context.value === value

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={isActive}
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "relative flex-1 inline-flex items-center justify-center whitespace-nowrap px-6 text-sm transition-all duration-300 cursor-pointer disabled:pointer-events-none disabled:opacity-50 group",
        isActive
          ? "text-(--color-primary) bg-(--app-surface) py-4 z-10 rounded-t-2xl font-black shadow-[0_-4px_12px_-6px_rgba(0,0,0,0.1)]"
          : "text-(--app-foreground)/70 font-bold hover:text-(--color-primary) bg-(--app-surface-container) hover:bg-(--app-surface-container)/80 py-3.5 rounded-t-2xl z-0 border-t border-x border-(--app-border)",
        className
      )}
      onClick={() => context.onValueChange(value)}
      {...props}
    >
      {/* Right curve (for RTL, right side) */}
      {!isFirst && (
        <div className={cn(
          "absolute -right-[20px] bottom-0 w-[20px] h-[20px] overflow-hidden pointer-events-none transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          <div 
            className="absolute left-0 -top-[20px] w-[40px] h-[40px] rounded-full bg-transparent"
            style={{ boxShadow: '0 0 0 20px var(--app-surface)' }}
          />
        </div>
      )}

      {/* Left curve (for RTL, left side) */}
      {!isLast && (
        <div className={cn(
          "absolute -left-[20px] bottom-0 w-[20px] h-[20px] overflow-hidden pointer-events-none transition-opacity duration-300",
          isActive ? "opacity-100" : "opacity-0"
        )}>
          <div 
            className="absolute -left-[20px] -top-[20px] w-[40px] h-[40px] rounded-full bg-transparent"
            style={{ boxShadow: '0 0 0 20px var(--app-surface)' }}
          />
        </div>
      )}

      <span className="relative z-30 flex items-center gap-2">
        {children}
      </span>
    </button>
  )
})
TabsTrigger.displayName = "TabsTrigger"

const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => {
  const context = React.useContext(TabsContext)
  if (!context) throw new Error("TabsContent must be used within Tabs")

  const isActive = context.value === value

  return (
    <div
      ref={ref}
      role="tabpanel"
      data-state={isActive ? "active" : "inactive"}
      className={cn(
        "bg-(--app-surface) rounded-b-[2rem] rounded-t-none",
        isActive
          ? "opacity-100 relative z-10 visible block mt-0"
          : "opacity-0 absolute inset-0 -z-0 invisible hidden",
        className
      )}
      {...props}
    >
      {isActive && (
        <div className="p-8 md:p-10 animate-in fade-in slide-in-from-top-2 duration-700 ease-out">
          {children}
        </div>
      )}
    </div>
  )
})
TabsContent.displayName = "TabsContent"

export { Tabs, TabsList, TabsTrigger, TabsContent }




