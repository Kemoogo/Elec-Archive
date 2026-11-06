"use client";

import React, { useState, useMemo } from "react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Paginator } from "@/components/ui/paginator";
import { ActionButton } from "@/components/officers/OfficersTable";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { StageSelector } from "./StageSelector";
import { StudentRelocationModal } from "./StudentRelocationModal";
import { StudentPersonnelTransferModal } from "./StudentPersonnelTransferModal";
import {
  ModalShell,
  ModalHeaderCard,
  ModalSection,
  ModalBadge,
} from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { MonoBadge } from "@/components/ui/mono-badge";
import { useToast } from "@/components/ui/toast";
import {
  Search,
  Users,
  Eye,
  GraduationCap,
  ShieldAlert,
  UserCheck,
  RefreshCw,
  Truck,
  UserPlus,
  Layers,
  Target,
  Settings2,
  Plus,
  Trash2,
  CheckSquare,
  Square,
} from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import {
  formatGovernorateDisplay,
  formatBloodTypeDisplay,
  mapGovernorate,
  GOVERNORATE_FILTER_OPTIONS,
  BLOOD_TYPE_FILTER_OPTIONS,
} from "@/lib/students/mappings";
import type {
  IStudentListItem,
  IStageInfo,
  IBatchClassification,
} from "@/types/student";
import {
  formatQualificationLabel,
  formatLocationStatusLabel,
  DEFAULT_BATCH_CLASSIFICATIONS,
} from "@/types/student";

interface CurrentStageTabProps {
  students: IStudentListItem[];
  total: number;
  activeStage: { mrhla: string; name: string };
  stages: IStageInfo[];
  canEdit: boolean;
  onStageChange: (newMrhla: string) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
  initialGovernorateFilter?: string;
  initialBloodTypeFilter?: string;
}

const QUALIFICATION_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "جميع المؤهلات" },
  { value: "high", label: "مؤهل عالٍ" },
  { value: "above_avg", label: "مؤهل فوق متوسط" },
  { value: "average", label: "مؤهل متوسط" },
  { value: "normal", label: "عادة" },
];

const LOCATION_STATUS_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "جميع المواقف بالوحدة" },
  { value: "in_unit", label: "لا زال بالوحدة" },
  { value: "relocated", label: "تم ترحيله" },
  { value: "transferred_to_unit_personnel", label: "انتقل إلى قوة الأفراد" },
];

export function CurrentStageTab({
  students,
  total,
  activeStage,
  stages,
  canEdit,
  onStageChange,
  onRefresh,
  isLoading = false,
  initialGovernorateFilter,
  initialBloodTypeFilter,
}: CurrentStageTabProps) {
  const { showToast } = useToast();

  const [search, setSearch] = useState("");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [governorateFilter, setGovernorateFilter] = useState(initialGovernorateFilter || "all");
  const [bloodTypeFilter, setBloodTypeFilter] = useState(initialBloodTypeFilter || "all");
  const [selectedStudent, setSelectedStudent] = useState<IStudentListItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state for relocation, personnel transfer, target count, and classifications
  const [relocateTargetStudents, setRelocateTargetStudents] = useState<IStudentListItem[]>([]);
  const [isRelocateModalOpen, setIsRelocateModalOpen] = useState(false);
  const [personnelTransferStudents, setPersonnelTransferStudents] = useState<IStudentListItem[]>([]);
  const [isPersonnelModalOpen, setIsPersonnelModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [targetCountInput, setTargetCountInput] = useState<string>("");
  const [savingTarget, setSavingTarget] = useState(false);
  const [isClassificationsModalOpen, setIsClassificationsModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [savingClass, setSavingClass] = useState(false);

  const [page, setPage] = useState(1);
  const [prevMrhla, setPrevMrhla] = useState(activeStage.mrhla);
  if (activeStage.mrhla !== prevMrhla) {
    setPrevMrhla(activeStage.mrhla);
    setPage(1);
    setSelectedIds(new Set());
  }
  const pageSize = 15;

  // Find current stage object from stages list
  const currentStageInfo = useMemo(() => {
    return stages.find((s) => s.mrhla === activeStage.mrhla);
  }, [stages, activeStage.mrhla]);

  const batchClassifications: IBatchClassification[] = useMemo(() => {
    if (currentStageInfo?.classifications && currentStageInfo.classifications.length > 0) {
      return currentStageInfo.classifications;
    }
    return DEFAULT_BATCH_CLASSIFICATIONS;
  }, [currentStageInfo]);

  const classificationFilterOptions: CustomSelectOption[] = useMemo(() => {
    return [
      { value: "all", label: "جميع التصنيفات" },
      ...batchClassifications.map((c) => ({
        value: c.id,
        label: c.name,
      })),
    ];
  }, [batchClassifications]);

  // Compute batch flow counters from stage info or live students list
  const flowMetrics = useMemo(() => {
    const arrived = currentStageInfo?.arrivedCount ?? (total || students.length);
    const target =
      currentStageInfo?.targetCount && currentStageInfo.targetCount > 0
        ? currentStageInfo.targetCount
        : arrived;
    const remaining = Math.max(0, target - arrived);

    const inUnit =
      currentStageInfo?.inUnitCount ??
      students.filter((s) => !s.locationStatus || s.locationStatus === "in_unit").length;
    const relocated =
      currentStageInfo?.relocatedCount ??
      students.filter((s) => s.locationStatus === "relocated").length;
    const transferredPersonnel =
      currentStageInfo?.transferredPersonnelCount ??
      students.filter((s) => s.locationStatus === "transferred_to_unit_personnel").length;

    return {
      target,
      arrived,
      remaining,
      inUnit,
      relocated,
      transferredPersonnel,
    };
  }, [currentStageInfo, total, students]);

  // Filter in-memory for fast interaction
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (activeStage.mrhla && s.mrhla && s.mrhla !== activeStage.mrhla) {
        return false;
      }

      if (classificationFilter !== "all") {
        const sClassId = s.classificationId || "sig-nco";
        if (sClassId !== classificationFilter) {
          return false;
        }
      }

      if (locationFilter !== "all") {
        const sLoc = s.locationStatus || "in_unit";
        if (sLoc !== locationFilter) {
          return false;
        }
      }

      if (qualificationFilter !== "all" && s.qualification !== qualificationFilter) {
        return false;
      }

      if (governorateFilter !== "all") {
        const govName = formatGovernorateDisplay(s.governorate);
        if (govName !== governorateFilter) {
          return false;
        }
      }

      if (bloodTypeFilter !== "all") {
        const blood = formatBloodTypeDisplay(s.bloodType);
        if (blood !== bloodTypeFilter) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const govName = formatGovernorateDisplay(s.governorate).toLowerCase();
        const blood = formatBloodTypeDisplay(s.bloodType).toLowerCase();
        const area = (
          s.recruitmentArea ||
          mapGovernorate(s.governorate).recruitmentArea ||
          ""
        ).toLowerCase();
        const matchName = s.fullName?.toLowerCase().includes(q);
        const matchMil = s.militaryNo?.toLowerCase().includes(q);
        const matchNat = s.nationalNo?.toLowerCase().includes(q);
        const matchGov = govName.includes(q) || area.includes(q);
        const matchBlood = blood.includes(q);
        const matchClass = (s.classificationName || "").toLowerCase().includes(q);
        if (!matchName && !matchMil && !matchNat && !matchGov && !matchBlood && !matchClass) {
          return false;
        }
      }

      return true;
    });
  }, [
    students,
    activeStage.mrhla,
    classificationFilter,
    locationFilter,
    qualificationFilter,
    governorateFilter,
    bloodTypeFilter,
    search,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const currentPageData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, page, pageSize]);

  const selectedStudentObjects = useMemo(() => {
    return students.filter((s) => selectedIds.has(s._id));
  }, [students, selectedIds]);

  const toggleSelectAllPage = () => {
    const pageIds = currentPageData.map((s) => s._id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        for (const id of pageIds) next.delete(id);
      } else {
        for (const id of pageIds) next.add(id);
      }
      return next;
    });
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveTargetCount = async () => {
    const num = Number(targetCountInput);
    if (!Number.isFinite(num) || num < 0) {
      showToast("يرجى إدخال رقم صحيح للمقرر وصوله", "error");
      return;
    }

    setSavingTarget(true);
    try {
      const res = await fetch(`/api/students/stages/${activeStage.mrhla}/target`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCount: num }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تحديث المقرر وصوله", "error");
        return;
      }
      showToast(data.message || "تم تحديث المقرر وصوله بنجاح", "success");
      setIsTargetModalOpen(false);
      onRefresh?.();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSavingTarget(false);
    }
  };

  const handleAddClassification = async () => {
    if (!newClassName.trim()) {
      showToast("يرجى إدخال اسم التصنيف", "error");
      return;
    }

    setSavingClass(true);
    try {
      const generatedId = `custom_${Date.now()}`;
      const res = await fetch(`/api/students/stages/${activeStage.mrhla}/classifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: generatedId,
          name: newClassName.trim(),
          isCustom: true,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل إضافة التصنيف", "error");
        return;
      }
      showToast(data.message || "تمت إضافة التصنيف بنجاح", "success");
      setNewClassName("");
      onRefresh?.();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSavingClass(false);
    }
  };

  const handleDeleteClassification = async (classId: string) => {
    setSavingClass(true);
    try {
      const res = await fetch(
        `/api/students/stages/${activeStage.mrhla}/classifications?classificationId=${encodeURIComponent(classId)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل حذف التصنيف", "error");
        return;
      }
      showToast(data.message || "تم حذف التصنيف بنجاح", "success");
      onRefresh?.();
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setSavingClass(false);
    }
  };

  const columns: TableColumn<IStudentListItem>[] = [
    ...(canEdit
      ? [
          {
            header: (
              <button
                type="button"
                onClick={toggleSelectAllPage}
                className="cursor-pointer p-1 text-white hover:text-(--app-info) transition-colors"
                title="تحديد عناصر الصفحة"
              >
                {currentPageData.length > 0 &&
                currentPageData.every((s) => selectedIds.has(s._id)) ? (
                  <CheckSquare className="w-4 h-4" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
              </button>
            ),
            accessor: "select",
            cellAlign: "center" as const,
            headerAlign: "center" as const,
            render: (_: unknown, row: IStudentListItem) => (
              <input
                type="checkbox"
                checked={selectedIds.has(row._id)}
                onChange={() => toggleSelectRow(row._id)}
                className="rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500 cursor-pointer"
              />
            ),
          },
        ]
      : []),
    {
      header: "الرقم العسكري",
      accessor: "militaryNo",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground)">
          {row.militaryNo || row.studentId}
        </span>
      ),
    },
    {
      header: "الاسم والبيانات العسكرية",
      accessor: "fullName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <div className="flex flex-col max-w-[240px] sm:max-w-[300px]">
          <button
            type="button"
            onClick={() => setSelectedStudent(row)}
            title={row.fullName}
            className="text-right text-xs font-black text-(--color-primary) hover:underline hover:text-(--app-info) transition-colors cursor-pointer truncate block"
          >
            {row.fullName}
          </button>
          {row.solasyNo && (
            <span className="text-[10px] text-(--app-muted-foreground) font-mono">
              ثلاثي: {row.solasyNo}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "التصنيف التخصصي",
      accessor: "classificationName",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.classificationName || "صف إشارة"}
        </span>
      ),
    },
    {
      header: "المؤهل الدراسي",
      accessor: "qualificationName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.qualificationName || formatQualificationLabel(row.qualification, "غير محدد")}
        </span>
      ),
    },
    {
      header: "المحافظة",
      accessor: "governorate",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const govDisplay = formatGovernorateDisplay(row.governorate);
        const area = row.recruitmentArea || mapGovernorate(row.governorate).recruitmentArea;
        return (
          <div className="flex flex-col items-center">
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              {govDisplay}
            </span>
            {area && (
              <span className="text-[10px] text-(--app-muted-foreground)/75">
                {area}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "فصيلة الدم",
      accessor: "bloodType",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground)">
          {formatBloodTypeDisplay(row.bloodType)}
        </span>
      ),
    },
    {
      header: "الموقف بالوحدة",
      accessor: "locationStatus",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => {
        const locStatus = row.locationStatus || "in_unit";
        if (locStatus === "relocated") {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <MonoBadge
                size="sm"
                variant="muted"
                value={formatLocationStatusLabel("relocated")}
                className="!bg-(--app-surface-container) !text-(--app-muted-foreground) !border-(--app-border)"
              />
              {row.relocationDetails?.destination && (
                <span className="text-[10px] font-bold text-(--app-muted-foreground) truncate max-w-[120px]">
                  إلى: {row.relocationDetails.destination}
                </span>
              )}
            </div>
          );
        }
        if (locStatus === "transferred_to_unit_personnel" || row.isStriken) {
          return (
            <div className="flex flex-col items-center gap-0.5">
              <MonoBadge
                size="sm"
                variant="outline"
                value={formatLocationStatusLabel("transferred_to_unit_personnel")}
                className="!bg-(--app-info)/10 !text-(--app-info) !border-(--app-info)/20"
              />
              {row.unitPersonnelDetails?.assignedRole && (
                <span className="text-[10px] font-bold text-(--app-muted-foreground) truncate max-w-[120px]">
                  {row.unitPersonnelDetails.assignedRole}
                </span>
              )}
            </div>
          );
        }
        return (
          <MonoBadge
            size="sm"
            variant="primary"
            value={formatLocationStatusLabel("in_unit")}
            className="!bg-(--color-primary)/10 !text-(--color-primary) !border-(--color-primary)/20"
          />
        );
      },
    },
    {
      header: "عامود الإجراءات",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5">
          <ActionButton
            icon={<Eye className="w-3.5 h-3.5" />}
            color="text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10"
            title="عرض الملف والبيانات التفصيلية"
            onClick={() => setSelectedStudent(row)}
          />

          {canEdit && (!row.locationStatus || row.locationStatus === "in_unit") && (
            <>
              <ActionButton
                icon={<Truck className="w-3.5 h-3.5" />}
                color="text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10"
                title="ترحيل خارج الوحدة"
                onClick={() => {
                  setRelocateTargetStudents([row]);
                  setIsRelocateModalOpen(true);
                }}
              />

              <ActionButton
                icon={<UserPlus className="w-3.5 h-3.5" />}
                color="text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10"
                title="نقل إلى قوة الأفراد بالوحدة"
                onClick={() => {
                  setPersonnelTransferStudents([row]);
                  setIsPersonnelModalOpen(true);
                }}
              />
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Batch Arrival & Location Flow Strip */}
      <div className="bg-(--app-surface) p-4 rounded-2xl border border-(--app-border) shadow-depth-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-(--color-primary)" />
            <h3 className="text-sm font-black text-(--color-primary)">
              مؤشرات تدفق الدفعة والموقف الميداني ({activeStage.name || activeStage.mrhla})
            </h3>
          </div>

          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setTargetCountInput(String(flowMetrics.target));
                  setIsTargetModalOpen(true);
                }}
                className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
              >
                <Target className="w-3.5 h-3.5 text-(--color-primary)" />
                <span>تحديد المقرر وصوله</span>
              </button>

              <button
                type="button"
                onClick={() => setIsClassificationsModalOpen(true)}
                className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-(--color-primary)" />
                <span>تخصيص التصنيفات</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRelocateTargetStudents(selectedStudentObjects);
                  setIsRelocateModalOpen(true);
                }}
                className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>
                  {selectedIds.size > 0
                    ? `ترحيل المحددين (${selectedIds.size})`
                    : "تسجيل حركة ترحيل"}
                </span>
              </button>

              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setPersonnelTransferStudents(selectedStudentObjects);
                    setIsPersonnelModalOpen(true);
                  }}
                  className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>نقل المحددين للأفراد ({selectedIds.size})</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex flex-col">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">المقرر وصوله</span>
            <span className="text-base font-black font-mono text-(--color-primary)">
              {flowMetrics.target}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex flex-col">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">ما تم وصوله</span>
            <span className="text-base font-black font-mono text-(--color-primary)">
              {flowMetrics.arrived}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex flex-col">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">المتبقي للوصول</span>
            <span className="text-base font-black font-mono text-(--app-muted-foreground)">
              {flowMetrics.remaining}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-(--color-primary)/5 border border-(--color-primary)/20 flex flex-col">
            <span className="text-[11px] font-bold text-(--color-primary)">لا زال بالوحدة</span>
            <span className="text-base font-black font-mono text-(--color-primary)">
              {flowMetrics.inUnit}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex flex-col">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">تم ترحيله</span>
            <span className="text-base font-black font-mono text-(--app-muted-foreground)">
              {flowMetrics.relocated}
            </span>
          </div>
          <div className="p-2.5 rounded-xl bg-(--app-surface-container) border border-(--app-border) flex flex-col">
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">انتقل إلى قوة الأفراد</span>
            <span className="text-base font-black font-mono text-(--color-primary)">
              {flowMetrics.transferredPersonnel}
            </span>
          </div>
        </div>
      </div>

      {/* Top Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-(--app-surface) p-4 rounded-2xl border border-(--app-border) shadow-depth-sm">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Stage Selector */}
          <StageSelector
            activeStage={activeStage.mrhla}
            stages={stages}
            canEdit={canEdit}
            onStageChange={onStageChange}
            disabled={isLoading}
          />

          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-(--app-muted-foreground)" />
            <input
              type="text"
              placeholder="بحث بالاسم أو الرقم العسكري..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pr-9 pl-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) placeholder:text-(--app-muted-foreground)/60 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
          </div>

          {/* Classification Filter */}
          <div className="w-44">
            <CustomSelect
              value={classificationFilter}
              onChange={(val) => {
                setClassificationFilter(val);
                setPage(1);
              }}
              options={classificationFilterOptions}
              placeholder="التصنيف التخصصي..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Location Status Filter */}
          <div className="w-44">
            <CustomSelect
              value={locationFilter}
              onChange={(val) => {
                setLocationFilter(val);
                setPage(1);
              }}
              options={LOCATION_STATUS_OPTIONS}
              placeholder="الموقف بالوحدة..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Qualification Filter */}
          <div className="w-40">
            <CustomSelect
              value={qualificationFilter}
              onChange={(val) => {
                setQualificationFilter(val);
                setPage(1);
              }}
              options={QUALIFICATION_OPTIONS}
              placeholder="المؤهل الدراسي..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Governorate Filter */}
          <div className="w-44">
            <CustomSelect
              value={governorateFilter}
              onChange={(val) => {
                setGovernorateFilter(val);
                setPage(1);
              }}
              options={GOVERNORATE_FILTER_OPTIONS}
              placeholder="فلتر المحافظة..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>

          {/* Blood Type Filter */}
          <div className="w-36">
            <CustomSelect
              value={bloodTypeFilter}
              onChange={(val) => {
                setBloodTypeFilter(val);
                setPage(1);
              }}
              options={BLOOD_TYPE_FILTER_OPTIONS}
              placeholder="فصيلة الدم..."
              className="!py-1.5 !text-xs font-bold"
            />
          </div>
        </div>

        {/* Count & Refresh */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-(--app-muted-foreground) bg-(--app-surface-container) px-3 py-1.5 rounded-xl border border-(--app-border)">
            <Users className="w-3.5 h-3.5 text-(--color-primary)" />
            <span>العدد:</span>
            <span className="font-mono text-(--color-primary) font-black">
              {filteredStudents.length}
            </span>
            <span className="text-[10px]">من {total}</span>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isLoading}
              title="تحديث البيانات"
              className="p-2 rounded-xl border border-(--app-border) hover:bg-(--app-surface-container) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <MainTable
        columns={columns}
        data={currentPageData}
        showSerialNumber={true}
        isLoading={isLoading}
        emptyTitle="لا يوجد طلاب مسجلين في هذه المرحلة"
        emptyDescription="لم يتم العثور على أي طالب يطابق معايير البحث والفلترة المحددة."
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center pt-2">
          <Paginator
            page={page}
            totalPages={totalPages}
            total={filteredStudents.length}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Student Relocation Modal */}
      <StudentRelocationModal
        isOpen={isRelocateModalOpen}
        onClose={() => setIsRelocateModalOpen(false)}
        onSuccess={() => {
          setSelectedIds(new Set());
          onRefresh?.();
        }}
        mrhla={activeStage.mrhla}
        mrhlaName={activeStage.name}
        selectedStudents={relocateTargetStudents}
        classifications={batchClassifications}
      />

      {/* Student Personnel Transfer Modal */}
      <StudentPersonnelTransferModal
        isOpen={isPersonnelModalOpen}
        onClose={() => setIsPersonnelModalOpen(false)}
        onSuccess={() => {
          setSelectedIds(new Set());
          onRefresh?.();
        }}
        mrhla={activeStage.mrhla}
        mrhlaName={activeStage.name}
        selectedStudents={personnelTransferStudents}
      />

      {/* Target Count Update Modal */}
      {isTargetModalOpen && (
        <ModalShell
          title="تحديث المقرر وصوله للدفعة"
          icon={<Target className="w-4 h-4" />}
          onClose={() => setIsTargetModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="action"
              submitText="حفظ المقرر"
              cancelText="إلغاء"
              onCancel={() => setIsTargetModalOpen(false)}
              onConfirm={handleSaveTargetCount}
              submitLoading={savingTarget}
              submitDisabled={savingTarget}
            />
          }
        >
          <ModalSection title="إجمالي المقرر وصوله للمرحلة">
            <div className="space-y-1.5">
              <label
                htmlFor="batch-target-count"
                className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
              >
                العدد المقرر وصوله *
              </label>
              <input
                id="batch-target-count"
                type="number"
                min={0}
                value={targetCountInput}
                onChange={(e) => setTargetCountInput(e.target.value)}
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold font-mono text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </ModalSection>
        </ModalShell>
      )}

      {/* Classifications Management Modal */}
      {isClassificationsModalOpen && (
        <ModalShell
          title="تخصيص التصنيفات التخصصية للدفعة"
          icon={<Settings2 className="w-4 h-4" />}
          onClose={() => setIsClassificationsModalOpen(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="view"
              cancelText="إغلاق"
              onCancel={() => setIsClassificationsModalOpen(false)}
            />
          }
        >
          <ModalSection title="إضافة تصنيف جديد">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="مثال: إشارة بحري / تد مهني خاص..."
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                className="flex-1 px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
              <button
                type="button"
                onClick={handleAddClassification}
                disabled={savingClass || !newClassName.trim()}
                className="btn-primary flex items-center gap-1.5 py-2 px-3 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة</span>
              </button>
            </div>
          </ModalSection>

          <ModalSection title="التصنيفات المعتمدة بالدفعة">
            <div className="space-y-2">
              {batchClassifications.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-2.5 bg-(--app-surface) rounded-xl border border-(--app-border)"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-(--app-foreground)">{c.name}</span>
                    {c.isDefault === false && (
                      <MonoBadge size="sm" variant="muted" value="مخصص" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteClassification(c.id)}
                    disabled={savingClass || batchClassifications.length <= 1}
                    title="حذف التصنيف"
                    className="p-1.5 rounded-lg text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10 transition-colors cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </ModalSection>
        </ModalShell>
      )}

      {/* Student Details Modal */}
      {selectedStudent && (
        <ModalShell
          title="بيانات الطالب العسكرية والتجنيدية"
          icon={<GraduationCap className="w-4 h-4" />}
          onClose={() => setSelectedStudent(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-2xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="view"
              cancelText="إغلاق"
              onCancel={() => setSelectedStudent(null)}
            />
          }
        >
          <ModalHeaderCard
            icon={<GraduationCap className="w-6 h-6" />}
            title={selectedStudent.fullName}
            subtitle={`الرقم العسكري: ${selectedStudent.militaryNo || selectedStudent.studentId} | المرحلة: ${selectedStudent.mrhlaName || selectedStudent.mrhla}`}
            badge={
              selectedStudent.locationStatus === "relocated" ? (
                <ModalBadge icon={<Truck className="w-3.5 h-3.5" />}>
                  تم ترحيله
                </ModalBadge>
              ) : selectedStudent.locationStatus === "transferred_to_unit_personnel" ||
                selectedStudent.isStriken ? (
                <ModalBadge icon={<ShieldAlert className="w-3.5 h-3.5" />}>
                  انتقل إلى قوة الأفراد
                </ModalBadge>
              ) : (
                <ModalBadge icon={<UserCheck className="w-3.5 h-3.5" />}>
                  لا زال بالوحدة
                </ModalBadge>
              )
            }
          />

          <ModalSection title="البيانات الشخصية والتخصصية">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">الرقم القومي:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.nationalNo || "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">الرقم الثلاثي:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.solasyNo || "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">التصنيف التخصصي:</span>
                <span className="font-bold text-(--color-primary)">
                  {selectedStudent.classificationName || "صف إشارة"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">المؤهل:</span>
                <span className="font-bold text-(--app-foreground)">
                  {selectedStudent.qualificationName ||
                    formatQualificationLabel(selectedStudent.qualification, "—")}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">المحافظة:</span>
                <span className="font-bold text-(--app-foreground)">
                  {formatGovernorateDisplay(selectedStudent.governorate)}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">
                  منطقة التجنيد التابعة:
                </span>
                <span className="font-bold text-(--app-foreground)">
                  {selectedStudent.recruitmentArea ||
                    mapGovernorate(selectedStudent.governorate).recruitmentArea ||
                    "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">فصيلة الدم:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {formatBloodTypeDisplay(selectedStudent.bloodType)}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">العنوان:</span>
                <span className="font-bold text-(--app-foreground)">
                  {selectedStudent.address || "—"}
                </span>
              </div>
            </div>
          </ModalSection>

          <ModalSection title="التواريخ العسكرية">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">تاريخ الميلاد:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.birthDate ? formatDateDisplay(selectedStudent.birthDate) : "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">تاريخ التجنيد:</span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.tagneedDate
                    ? formatDateDisplay(selectedStudent.tagneedDate)
                    : "—"}
                </span>
              </div>
              <div>
                <span className="font-bold text-(--app-muted-foreground) block">
                  تاريخ التسريح المخطط:
                </span>
                <span className="font-mono font-bold text-(--app-foreground)">
                  {selectedStudent.tasrehDate
                    ? formatDateDisplay(selectedStudent.tasrehDate)
                    : "—"}
                </span>
              </div>
            </div>
          </ModalSection>

          {selectedStudent.locationStatus === "relocated" && selectedStudent.relocationDetails && (
            <ModalSection
              title="بيانات حركة الترحيل خارج الوحدة"
              badge={<ModalBadge>أمر ترحيل</ModalBadge>}
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="font-bold text-(--app-muted-foreground) block">
                    الجهة المرحل إليها:
                  </span>
                  <span className="font-bold text-(--color-primary)">
                    {selectedStudent.relocationDetails.destination}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-(--app-muted-foreground) block">
                    تاريخ الترحيل:
                  </span>
                  <span className="font-mono font-bold text-(--app-foreground)">
                    {selectedStudent.relocationDetails.date
                      ? formatDateDisplay(selectedStudent.relocationDetails.date)
                      : "—"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-(--app-muted-foreground) block">
                    رقم أمر الترحيل:
                  </span>
                  <span className="font-bold text-(--app-foreground)">
                    {selectedStudent.relocationDetails.orderNo}
                  </span>
                </div>
              </div>
              {selectedStudent.relocationDetails.reason && (
                <div className="mt-2 text-xs">
                  <span className="font-bold text-(--app-muted-foreground) block">ملاحظات:</span>
                  <p className="text-(--app-foreground) font-medium bg-(--app-surface-container) p-2 rounded-lg border border-(--app-border)">
                    {selectedStudent.relocationDetails.reason}
                  </p>
                </div>
              )}
            </ModalSection>
          )}

          {selectedStudent.locationStatus === "transferred_to_unit_personnel" &&
            selectedStudent.unitPersonnelDetails && (
              <ModalSection
                title="بيانات النقل إلى قوة أفراد الوحدة"
                badge={<ModalBadge>أمر نقل للأفراد</ModalBadge>}
              >
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="font-bold text-(--app-muted-foreground) block">
                      تاريخ النقل:
                    </span>
                    <span className="font-mono font-bold text-(--app-foreground)">
                      {selectedStudent.unitPersonnelDetails.transferDate
                        ? formatDateDisplay(selectedStudent.unitPersonnelDetails.transferDate)
                        : "—"}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-(--app-muted-foreground) block">
                      رقم أمر النقل:
                    </span>
                    <span className="font-bold text-(--app-foreground)">
                      {selectedStudent.unitPersonnelDetails.orderNo}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-(--app-muted-foreground) block">
                      الوظيفة / التسكين:
                    </span>
                    <span className="font-bold text-(--color-primary)">
                      {selectedStudent.unitPersonnelDetails.assignedRole || "—"}
                    </span>
                  </div>
                </div>
              </ModalSection>
            )}
        </ModalShell>
      )}
    </div>
  );
}
