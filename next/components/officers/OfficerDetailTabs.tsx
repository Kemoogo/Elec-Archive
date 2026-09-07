"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { User, Calendar, History, Briefcase, Filter } from "lucide-react";
import { FolderTabs } from "@/components/ui/folder-tabs";
import { ModernPageHeader as PageHeader, SecondaryHeaderBtn } from "@/components/layout/ModernPageHeader";

interface OfficerDetailTabsProps {
  officerLabel: string;
  basicInfo: React.ReactNode;
  leaves: React.ReactNode;
  careerTimeline: React.ReactNode;
  positionHistory: React.ReactNode;
  actions?: React.ReactNode;
  initialTab?: string;
}

const TAB_META: Record<
  string,
  { name: string; description: string; icon: React.ReactNode }
> = {
  basic: {
    name: "البيانات الأساسية",
    description: "بيانات السجل العام والمعلومات الأساسية وتفاصيل الخدمة للضابط",
    icon: <User className="w-6 h-6" />,
  },
  leaves: {
    name: "سجل الإجازات",
    description: "سجل متابعة وتتبع الإجازات الرسمية والانقطاعات الحالية والسابقة",
    icon: <Calendar className="w-6 h-6" />,
  },
  career: {
    name: "السجل المهني",
    description: "السجل المهني، الترقيات، التنقلات والمشاركات والمهام العسكرية",
    icon: <History className="w-6 h-6" />,
  },
  job: {
    name: "السجل الوظيفي",
    description: "تاريخ وتفاصيل التعيينات والمسؤوليات والوظائف التخصصية والقيادية",
    icon: <Briefcase className="w-6 h-6" />,
  },
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlTab = searchParams.get("tab") || initialTab || "basic";

  const [prevUrlTab, setPrevUrlTab] = React.useState(urlTab);
  const [activeTab, setActiveTab] = React.useState(urlTab);

  if (urlTab !== prevUrlTab) {
    setPrevUrlTab(urlTab);
    setActiveTab(urlTab);
  }

  const jobView = searchParams.get("view") || "active";
  const currentMeta = TAB_META[activeTab] || TAB_META.basic;

  const currentDescription =
    activeTab === "job"
      ? jobView === "all"
        ? "عرض وتفاصيل كافة التكليفات والمسؤوليات والوظائف السابقة والجارية للضابط"
        : "عرض ومتابعة الوظائف والمسؤوليات القيادية والتخصصية المكلف بها الضابط حالياً"
      : currentMeta.description;

  const handleToggleJobView = () => {
    const params = new URLSearchParams(searchParams.toString());
    const nextView = jobView === "all" ? "active" : "all";
    params.set("view", nextView);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  let headerActions: React.ReactNode = undefined;
  if (activeTab === "basic") {
    headerActions = actions;
  } else if (activeTab === "job") {
    headerActions = (
      <SecondaryHeaderBtn
        label={jobView === "all" ? "كافة الوظائف" : "الوظائف الجارية"}
        icon={<Filter className="w-4 h-4" />}
        onClick={handleToggleJobView}
      />
    );
  }

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
        icon={currentMeta.icon}
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
            <span className="text-(--app-muted-foreground)/50 font-semibold">-</span>
            <span className="text-(--color-primary)">{currentMeta.name}</span>
          </span>
        }
        description={currentDescription}
        actions={headerActions}
      />

      <FolderTabs
        tabs={tabs}
        initialTab={initialTab}
        value={activeTab}
        onValueChange={(newTab) => setActiveTab(newTab)}
      />
    </div>
  );
}

