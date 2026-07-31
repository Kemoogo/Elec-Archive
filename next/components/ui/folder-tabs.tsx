"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  badge?: number | string;
  color?: string;
}

interface FolderTabsProps {
  tabs: TabItem[];
  initialTab?: string;
  fallback?: React.ReactNode;
  variant?: "folder" | "pills" | "underlined" | "cards";
  className?: string;
  contentClassName?: string;
}

export function FolderTabs({
  tabs,
  initialTab,
  fallback,
  variant = "folder",
  className,
  contentClassName,
}: FolderTabsProps) {
  const defaultFallback = (
    <div className="w-full space-y-4">
      <div className="h-12 w-full max-w-md bg-(--app-surface-container) animate-pulse rounded-xl" />
      <div className="h-64 w-full bg-(--app-surface-container-low) animate-pulse rounded-2xl" />
    </div>
  );

  return (
    <React.Suspense fallback={fallback || defaultFallback}>
      <FolderTabsContent
        tabs={tabs}
        initialTab={initialTab}
        variant={variant}
        className={className}
        contentClassName={contentClassName}
      />
    </React.Suspense>
  );
}

function FolderTabsContent({
  tabs,
  initialTab,
  variant = "folder",
  className,
  contentClassName,
}: Omit<FolderTabsProps, "fallback">) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentTab = searchParams.get("tab") || initialTab || (tabs.length > 0 ? tabs[0].id : "");

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (tabs.length === 0) return null;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} variant={variant} dir="rtl" className={className}>
      <TabsList>
        {tabs.map((tab, index) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            isFirst={index === 0}
            isLast={index === tabs.length - 1}
            badge={tab.badge}
            className="group"
          >
            {tab.icon && (
              <span className="flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110">
                {tab.icon}
              </span>
            )}
            <span className="font-extrabold">{tab.label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className={contentClassName}>
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
