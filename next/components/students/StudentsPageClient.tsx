"use client";

import React, { useState, useCallback } from "react";
import { FolderTabs, type TabItem } from "@/components/ui/folder-tabs";
import { PageContainer } from "@/components/layout/PageContainer";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { StudentsDashboardTab } from "./StudentsDashboardTab";
import { StudentRollcallTab } from "./StudentRollcallTab";
import { CurrentStageTab } from "./CurrentStageTab";
import { PreviousStagesTab } from "./PreviousStagesTab";
import { MdbImportModal } from "./MdbImportModal";
import {
  GraduationCap,
  LayoutDashboard,
  Calendar,
  Layers,
  Archive,
  FileSpreadsheet,
} from "lucide-react";
import type {
  IStudentListItem,
  IStageInfo,
  IStudentsAnalyticsData,
} from "@/types/student";

interface StudentsPageClientProps {
  initialStudents: IStudentListItem[];
  initialTotal: number;
  initialActiveStage: { mrhla: string; name: string };
  initialStages: IStageInfo[];
  initialAnalytics: IStudentsAnalyticsData;
  canEdit: boolean;
  isAdmin: boolean;
}

export function StudentsPageClient({
  initialStudents,
  initialTotal,
  initialActiveStage,
  initialStages,
  initialAnalytics,
  canEdit,
  isAdmin,
}: StudentsPageClientProps) {
  // Active Tab
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Stages & Active Stage state
  const [activeStage, setActiveStage] = useState(initialActiveStage);
  const [stages, setStages] = useState<IStageInfo[]>(initialStages);

  // Students state for Tab 3 (Current Stage)
  const [currentStudents, setCurrentStudents] = useState<IStudentListItem[]>(initialStudents);
  const [totalStudents, setTotalStudents] = useState(initialTotal);
  const [loadingCurrentStage, setLoadingCurrentStage] = useState(false);

  // Analytics state
  const [analytics, setAnalytics] = useState<IStudentsAnalyticsData>(initialAnalytics);

  // Modals state
  const [showMdbModal, setShowMdbModal] = useState(false);

  // Refetch data for current stage and stages list
  const refreshStageData = useCallback(async (targetMrhla?: string) => {
    setLoadingCurrentStage(true);
    try {
      const mrhlaToFetch = targetMrhla || activeStage.mrhla;

      const [studentsRes, stagesRes, analyticsRes] = await Promise.all([
        fetch(`/api/students?mrhla=${mrhlaToFetch}&limit=100`),
        fetch("/api/students/stages"),
        fetch(`/api/students/analytics?mrhla=${mrhlaToFetch}`),
      ]);

      if (studentsRes.ok) {
        const sData = await studentsRes.json();
        if (sData.success) {
          setCurrentStudents(sData.data.items || []);
          setTotalStudents(sData.data.total || 0);
        }
      }

      if (stagesRes.ok) {
        const stData = await stagesRes.json();
        if (stData.success) {
          setStages(stData.data.stages || []);
          if (stData.data.activeStage) {
            setActiveStage(stData.data.activeStage);
          }
        }
      }

      if (analyticsRes.ok) {
        const aData = await analyticsRes.json();
        if (aData.success) {
          setAnalytics(aData.data);
        }
      }
    } catch (err) {
      console.error("Failed to refresh stage data:", err);
    } finally {
      setLoadingCurrentStage(false);
    }
  }, [activeStage.mrhla]);

  const handleStageChange = async (newMrhla: string) => {
    const found = stages.find((s) => s.mrhla === newMrhla);
    if (found) {
      setActiveStage({ mrhla: found.mrhla, name: found.name });
    }
    await refreshStageData(newMrhla);
  };

  const [selectedGovFilter, setSelectedGovFilter] = useState<string>("all");
  const [selectedBloodFilter, setSelectedBloodFilter] = useState<string>("all");

  const handleQualificationFilterSelect = (_qualification: string) => {
    setActiveTab("current_stage");
  };

  const handleGovernorateFilterSelect = (governorate: string) => {
    setSelectedGovFilter(governorate);
    setActiveTab("current_stage");
  };

  const handleBloodTypeFilterSelect = (bloodType: string) => {
    setSelectedBloodFilter(bloodType);
    setActiveTab("current_stage");
  };

  // FolderTabs Items
  const tabItems: TabItem[] = [
    {
      id: "dashboard",
      label: "الرئيسية والمؤشرات",
      icon: <LayoutDashboard className="w-4 h-4" />,
      content: (
        <StudentsDashboardTab
          initialAnalytics={analytics}
          canEdit={canEdit}
          onSelectQualification={handleQualificationFilterSelect}
          onSelectGovernorate={handleGovernorateFilterSelect}
          onSelectBloodType={handleBloodTypeFilterSelect}
          onNavigateToRollcall={() => setActiveTab("rollcall")}
          onOpenMdbUpload={() => setShowMdbModal(true)}
        />
      ),
    },
    {
      id: "rollcall",
      label: "التمام اليومي للطلبة",
      icon: <Calendar className="w-4 h-4" />,
      content: (
        <StudentRollcallTab
          activeStage={activeStage}
          canEdit={canEdit}
          isAdmin={isAdmin}
        />
      ),
    },
    {
      id: "current_stage",
      label: activeStage.name || "المرحلة الحالية النشطة",
      icon: <Layers className="w-4 h-4" />,
      badge: totalStudents > 0 ? totalStudents : undefined,
      content: (
        <CurrentStageTab
          students={currentStudents}
          total={totalStudents}
          activeStage={activeStage}
          stages={stages}
          canEdit={canEdit}
          initialGovernorateFilter={selectedGovFilter}
          initialBloodTypeFilter={selectedBloodFilter}
          onStageChange={handleStageChange}
          onRefresh={() => refreshStageData()}
          isLoading={loadingCurrentStage}
        />
      ),
    },
    {
      id: "previous_stages",
      label: "متبقيات وأرشيف المراحل السابقة",
      icon: <Archive className="w-4 h-4" />,
      content: (
        <PreviousStagesTab
          activeStage={activeStage}
          stages={stages}
          canEdit={canEdit}
          onRefresh={() => refreshStageData()}
        />
      ),
    },
  ];

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12 space-y-4">
      {/* Page Header */}
      <PageHeader
        title="شئون الطلاب والدارسين"
        description="إدارة السجلات العسكرية، التمام اليومي، استيراد قواعد بيانات Access، وأرشيف المراحل"
        icon={<GraduationCap className="w-6 h-6" />}
        action={
          canEdit && (
            <button
              type="button"
              onClick={() => setShowMdbModal(true)}
              className="btn-primary flex items-center gap-2 py-2 px-4 text-xs font-bold cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>استيراد ملف Access (.mdb)</span>
            </button>
          )
        }
      />

      {/* Modern FolderTabs Navigation */}
      <FolderTabs
        tabs={tabItems}
        value={activeTab}
        onValueChange={setActiveTab}
        variant="folder"
      />

      {/* MDB Import Modal */}
      <MdbImportModal
        isOpen={showMdbModal}
        onClose={() => setShowMdbModal(false)}
        onSuccess={() => refreshStageData()}
      />
    </PageContainer>
  );
}
