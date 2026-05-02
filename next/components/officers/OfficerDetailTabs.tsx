"use client";
import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { User, Calendar, History, Briefcase } from "lucide-react";

interface OfficerDetailTabsProps {
  basicInfo: React.ReactNode;
  leaves: React.ReactNode;
  careerTimeline: React.ReactNode;
  positionHistory: React.ReactNode;
  initialTab?: string;
}

export function OfficerDetailTabs(props: OfficerDetailTabsProps) {
  return (
    <React.Suspense fallback={<div className="h-12 w-full bg-(--app-surface-container) animate-pulse rounded-2xl" />}>
      <OfficerDetailTabsContent {...props} />
    </React.Suspense>
  );
}

function OfficerDetailTabsContent({
  basicInfo,
  leaves,
  careerTimeline,
  positionHistory,
  initialTab = "basic",
}: OfficerDetailTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const currentTab = searchParams.get("tab") || initialTab || "basic";

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} dir="rtl">
      <TabsList>
        <TabsTrigger value="basic" isFirst className="flex items-center gap-2">
          <User className="h-[18px] w-[18px]" />
          <span>البيانات الأساسية</span>
        </TabsTrigger>
        <TabsTrigger value="leaves" className="flex items-center gap-2">
          <Calendar className="h-[18px] w-[18px]" />
          <span>سجل الإجازات</span>
        </TabsTrigger>
        <TabsTrigger value="career" className="flex items-center gap-2">
          <History className="h-[18px] w-[18px]" />
          <span>السجل المهني</span>
        </TabsTrigger>
        <TabsTrigger value="job" isLast className="flex items-center gap-2">
          <Briefcase className="h-[18px] w-[18px]" />
          <span>السجل الوظيفي</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="basic">
        {basicInfo}
      </TabsContent>
      <TabsContent value="leaves">
        {leaves}
      </TabsContent>
      <TabsContent value="career">
        {careerTimeline}
      </TabsContent>
      <TabsContent value="job">
        {positionHistory}
      </TabsContent>
    </Tabs>
  );
}


