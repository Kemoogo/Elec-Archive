"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { User, Calendar, History, Briefcase } from "lucide-react"

interface OfficerDetailTabsProps {
  basicInfo: React.ReactNode
  leaves: React.ReactNode
  careerTimeline: React.ReactNode
  positionHistory: React.ReactNode
  initialTab?: string
}

/**
 * مكون التبويبات لصفحة تفاصيل الضابط.
 * يدعم المزامنة مع URL عبر Query Parameter (?tab=...).
 */
export function OfficerDetailTabs({
  basicInfo,
  leaves,
  careerTimeline,
  positionHistory,
  initialTab = "basic",
}: OfficerDetailTabsProps) {
  return (
    <React.Suspense fallback={<div className="h-10 w-full bg-(--app-surface-container) animate-pulse rounded-lg" />}>
      <OfficerDetailTabsContent
        basicInfo={basicInfo}
        leaves={leaves}
        careerTimeline={careerTimeline}
        positionHistory={positionHistory}
        initialTab={initialTab}
      />
    </React.Suspense>
  )
}

function OfficerDetailTabsContent({
  basicInfo,
  leaves,
  careerTimeline,
  positionHistory,
  initialTab,
}: OfficerDetailTabsProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // الحصول على التبويبة الحالية من URL أو الافتراض للمعلومات الشخصية
  const currentTab = searchParams.get("tab") || initialTab || "basic"

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", value)
    // تحديث URL بدون إعادة تحميل الصفحة
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
      <TabsList className="mb-6 flex w-full justify-start overflow-x-auto bg-(--app-surface-container)/50 p-1 scrollbar-hide border border-(--app-border)">
        <TabsTrigger 
          value="basic" 
          className="flex items-center gap-2 px-6 py-2 transition-all duration-200"
        >
          <User className="h-4 w-4" />
          <span>البيانات الأساسية</span>
        </TabsTrigger>
        <TabsTrigger 
          value="leaves" 
          className="flex items-center gap-2 px-6 py-2 transition-all duration-200"
        >
          <Calendar className="h-4 w-4" />
          <span>سجل الإجازات</span>
        </TabsTrigger>
        <TabsTrigger 
          value="career" 
          className="flex items-center gap-2 px-6 py-2 transition-all duration-200"
        >
          <History className="h-4 w-4" />
          <span>السجل المهني</span>
        </TabsTrigger>
        <TabsTrigger 
          value="job" 
          className="flex items-center gap-2 px-6 py-2 transition-all duration-200"
        >
          <Briefcase className="h-4 w-4" />
          <span>السجل الوظيفي</span>
        </TabsTrigger>
      </TabsList>

      <div className="min-h-[400px]">
        <TabsContent value="basic" className="mt-0 focus-visible:ring-0">
          {basicInfo}
        </TabsContent>
        <TabsContent value="leaves" className="mt-0 focus-visible:ring-0">
          {leaves}
        </TabsContent>
        <TabsContent value="career" className="mt-0 focus-visible:ring-0">
          {careerTimeline}
        </TabsContent>
        <TabsContent value="job" className="mt-0 focus-visible:ring-0">
          {positionHistory}
        </TabsContent>
      </div>
    </Tabs>
  )
}
