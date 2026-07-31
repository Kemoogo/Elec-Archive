"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { User, Calendar, History, Briefcase, Shield } from "lucide-react";
import { FolderTabs } from "@/components/ui/folder-tabs";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";

interface OfficerDetailTabsProps {
  officerLabel: string;
  basicInfo: React.ReactNode;
  leaves: React.ReactNode;
  careerTimeline: React.ReactNode;
  positionHistory: React.ReactNode;
  actions?: React.ReactNode;
  initialTab?: string;
}

const TAB_DESCRIPTIONS: Record<string, string> = {
  basic: "بيانات السجل العام والمعلومات الأساسية وتفاصيل الخدمة للضابط",
  leaves: "سجل متابعة وتتبع الإجازات الرسمية والانقطاعات الحالية والسابقة",
  career: "السجل المهني، الترقيات، التنقلات والمشاركات والمهام العسكرية",
  job: "تاريخ وتفاصيل التعيينات والمسؤوليات والوظائف التخصصية والقيادية",
};

export function OfficerDetailTabs({
  officerLabel,
  basicInfo,
  leaves,
  careerTimeline,
  positionHistory,
  actions,
  initialTab = "basic",
}: OfficerDetailTabsProps) {
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || initialTab || "basic";
  const currentDescription = TAB_DESCRIPTIONS[activeTab] || TAB_DESCRIPTIONS.basic;

  const tabs = [
    {
      id: "basic",
      label: "البيانات الأساسية",
      icon: <User className="h-[18px] w-[18px]" />,
      content: basicInfo,
    },
    {
      id: "leaves",
      label: "سجل الإجازات",
      icon: <Calendar className="h-[18px] w-[18px]" />,
      content: leaves,
    },
    {
      id: "career",
      label: "السجل المهني",
      icon: <History className="h-[18px] w-[18px]" />,
      content: careerTimeline,
    },
    {
      id: "job",
      label: "السجل الوظيفي",
      icon: <Briefcase className="h-[18px] w-[18px]" />,
      content: positionHistory,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Shield className="w-6 h-6" />}
        title={
          <span className="flex items-center gap-2 flex-wrap">
            <Link
              href="/officers"
              className="text-(--color-primary) hover:underline hover:text-blue-600 transition-colors"
            >
              شئون الضباط
            </Link>
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span>{officerLabel}</span>
          </span>
        }
        description={currentDescription}
        actions={actions}
      />

      <FolderTabs tabs={tabs} initialTab={initialTab} />
    </div>
  );
}

