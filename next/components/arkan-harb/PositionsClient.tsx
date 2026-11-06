"use client";

import React, { useState, useCallback, useMemo } from "react";
import { PositionAssignmentTable, extractOfficerId, type PositionRowData, type OfficerInfo } from "./PositionAssignmentTable";
import { PositionDetailModal } from "./PositionDetailModal";
import { PositionPlacementModal } from "./PositionPlacementModal";
import { PositionViewModal } from "./PositionViewModal";
import { PositionHistoryModal } from "./PositionHistoryModal";
import { OfficerPositionsModal } from "./OfficerPositionsModal";
import { PositionsHistoryArchiveModal } from "./PositionsHistoryArchiveModal";
import { UnassignAllModal } from "./UnassignAllModal";
import { DeletePositionModal } from "./DeletePositionModal";
import { PageStatusBar } from "@/components/layout/PageStatusBar";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { 
  AlertTriangle, 
  Info, 
  Eye, 
  EyeOff, 
  Trash2
} from "lucide-react";

import { useSearchParams, useRouter } from "next/navigation";

interface PositionsClientProps {
  initialPositions: PositionRowData[];
  departments: string[];
  officers: OfficerInfo[];
  canEdit: boolean;
  isCommander?: boolean;
}

export function PositionsClient({
  initialPositions,
  departments,
  officers,
  canEdit,
  isCommander = false,
}: PositionsClientProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlSearch = searchParams.get("search") || "";
  const viewMode = (searchParams.get("view") as "by-position" | "by-officer") || "by-position";

  const [positions, setPositions] = useState<PositionRowData[]>(initialPositions);
  const [prevInitialPositions, setPrevInitialPositions] = useState(initialPositions);
  if (prevInitialPositions !== initialPositions) {
    setPrevInitialPositions(initialPositions);
    setPositions(initialPositions);
  }

  const [filterType, setFilterType] = useState<"all" | "vacant-primary" | "vacant-substitute" | "unassigned-officers">("all");
  const [hideSubstituteAlert, setHideSubstituteAlert] = useState(false);

  const [prevViewMode, setPrevViewMode] = useState(viewMode);
  if (prevViewMode !== viewMode) {
    setPrevViewMode(viewMode);
    setFilterType("all");
  }

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewingPosition, setViewingPosition] = useState<PositionRowData | null>(null);
  const [editingPosition, setEditingPosition] = useState<PositionRowData | null>(null);
  const [placementPosition, setPlacementPosition] = useState<PositionRowData | null>(null);
  const [historyPosition, setHistoryPosition] = useState<PositionRowData | null>(null);
  const [selectedOfficer, setSelectedOfficer] = useState<OfficerInfo | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isUnassignAllOpen, setIsUnassignAllOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PositionRowData | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [_loading, setLoading] = useState(false);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/arkan-harb/positions");
      const result = await res.json();
      if (result.success && result.data?.items) {
        setPositions(result.data.items);
        router.refresh();
      }
    } catch {
      showToast("فشل في تحديث بيانات الوظائف", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast, router]);

  // Sync when window gains focus
  React.useEffect(() => {
    const handleFocus = () => {
      refreshData();
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [refreshData]);

  // Listen to main ArkanHarb header action events
  React.useEffect(() => {
    const handleOpenCreate = () => setIsCreateOpen(true);
    const handleOpenArchive = () => setIsArchiveOpen(true);
    const handleOpenUnassign = () => setIsUnassignAllOpen(true);

    window.addEventListener("open-create-position-modal", handleOpenCreate);
    window.addEventListener("open-archive-modal", handleOpenArchive);
    window.addEventListener("open-unassign-all-modal", handleOpenUnassign);

    return () => {
      window.removeEventListener("open-create-position-modal", handleOpenCreate);
      window.removeEventListener("open-archive-modal", handleOpenArchive);
      window.removeEventListener("open-unassign-all-modal", handleOpenUnassign);
    };
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/arkan-harb/positions/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      const result = await res.json();
      if (!res.ok) {
        showToast(extractApiError(result, "فشل حذف الوظيفة"), "error");
        return;
      }
      showToast("تم حذف الوظيفة بنجاح", "success");
      setDeleteConfirm(null);
      refreshData();
    } catch {
      showToast("حدث خطأ أثناء محاولة الحذف", "error");
    } finally {
      setDeleting(false);
    }
  }

  // Calculate vacancy metrics
  const vacantPrimaryPositions = useMemo(() => {
    return positions.filter((p) => !extractOfficerId(p.primaryOfficer));
  }, [positions]);

  const vacantSubstitutePositions = useMemo(() => {
    return positions.filter(
      (p) =>
        !p.hasNoSubstitute &&
        (!p.substituteOfficers ||
          p.substituteOfficers.filter((s) => extractOfficerId(s) !== "").length === 0)
    );
  }, [positions]);

  const unassignedOfficers = useMemo(() => {
    return officers.filter((off) => {
      const isPrimary = positions.some((p) => {
        const pId = extractOfficerId(p.primaryOfficer);
        return Boolean(pId && pId === off.id);
      });
      const isSub = positions.some((p) =>
        (p.substituteOfficers || []).some((s) => {
          const sId = extractOfficerId(s);
          return Boolean(sId && sId === off.id);
        })
      );
      return !isPrimary && !isSub;
    });
  }, [officers, positions]);

  // Filter positions and officers based on search and active vacancy filters
  const filteredPositions = useMemo(() => {
    return positions.filter((p) => {
      const q = urlSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.positionTitle.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q) ||
        (p.primaryOfficer &&
          (p.primaryOfficer.fullName.toLowerCase().includes(q) ||
            (p.primaryOfficer.militaryId && p.primaryOfficer.militaryId.includes(q)))) ||
        (p.substituteOfficers &&
          p.substituteOfficers.some(
            (s) => s.fullName.toLowerCase().includes(q) || (s.militaryId && s.militaryId.includes(q))
          ));

      if (!matchSearch) return false;

      if (filterType === "vacant-primary") return !extractOfficerId(p.primaryOfficer);
      if (filterType === "vacant-substitute") {
        return (
          !p.hasNoSubstitute &&
          (!p.substituteOfficers ||
            p.substituteOfficers.filter((s) => extractOfficerId(s) !== "").length === 0)
        );
      }

      return true;
    });
  }, [positions, urlSearch, filterType]);

  const filteredOfficers = useMemo(() => {
    return officers.filter((off) => {
      const q = urlSearch.toLowerCase().trim();
      const matchSearch =
        !q ||
        off.fullName.toLowerCase().includes(q) ||
        (off.militaryId && off.militaryId.includes(q)) ||
        (off.rank && off.rank.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterType === "unassigned-officers") {
        return unassignedOfficers.some((u) => u.id === off.id);
      }

      return true;
    });
  }, [officers, urlSearch, filterType, unassignedOfficers]);

  return (
    <div className="space-y-6">
      {/* Dynamic Contextual Alert Badges Bar (Hidden for Commander role) */}
      {!isCommander && (
        <PageStatusBar
          title={viewMode === "by-position" ? "حالة الشواغر والتسكين:" : "حالة تسكين ضباط الوحدة:"}
          actions={
            canEdit && !isCommander ? (
              <button
                type="button"
                onClick={() => setIsUnassignAllOpen(true)}
                className="btn-destructive px-3.5 py-1.5 font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 transition-all shrink-0"
                title="تفريغ كافة التسكينات لجميع الوظائف"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إلغاء التكليف للجميع</span>
              </button>
            ) : null
          }
        >
          {viewMode === "by-position" ? (
            <>
              {/* Vacant Primary Alert Badge */}
              {vacantPrimaryPositions.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setFilterType((prev) => (prev === "vacant-primary" ? "all" : "vacant-primary"))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    filterType === "vacant-primary"
                      ? "bg-(--color-primary) text-white shadow-md"
                      : "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary)/20"
                  }`}
                  title="اضغط للفلترة وعرض الوظائف الشاغرة"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{vacantPrimaryPositions.length} وظيفة شاغرة (بدون أساسي)</span>
                </button>
              ) : null}

              {/* Vacant Substitute Alert Badge with Eye Toggle */}
              {vacantSubstitutePositions.length > 0 ? (
                !hideSubstituteAlert ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setFilterType((prev) => (prev === "vacant-substitute" ? "all" : "vacant-substitute"))}
                      className={`btn-secondary text-xs !py-1.5 !px-3 gap-1.5 ${
                        filterType === "vacant-substitute"
                          ? "ring-2 ring-blue-500/30 !bg-(--app-border)"
                          : ""
                      }`}
                      title="اضغط للفلترة وعرض الوظائف التي ليس لها ضابط بديل"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>{vacantSubstitutePositions.length} وظيفة بدون بديل</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setHideSubstituteAlert(true)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-(--app-surface-container) transition-colors cursor-pointer"
                      title="إخفاء تنبيه الوظائف بدون بديل"
                    >
                      <EyeOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setHideSubstituteAlert(false)}
                    className="btn-secondary text-[11px] !py-1 !px-2.5 gap-1"
                    title="إظهار تنبيه الوظائف بدون بديل"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>إظهار تنبيه البدلاء</span>
                  </button>
                )
              ) : null}

              {vacantPrimaryPositions.length === 0 && vacantSubstitutePositions.length === 0 && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✓ جميع الوظائف مسكنة ومكتملة
                </span>
              )}
            </>
          ) : (
            /* By Officer Mode Alert Badge */
            unassignedOfficers.length > 0 ? (
              <button
                type="button"
                onClick={() => setFilterType((prev) => (prev === "unassigned-officers" ? "all" : "unassigned-officers"))}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === "unassigned-officers"
                    ? "bg-(--color-primary) text-white shadow-md"
                    : "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 hover:bg-(--color-primary)/20"
                }`}
                title="اضغط للفلترة وعرض الضباط غير المسكنين"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{unassignedOfficers.length} ضابط غير مسكن على أي وظيفة</span>
              </button>
            ) : (
              <span className="text-xs font-bold text-(--color-primary) flex items-center gap-1">
                ✓ جميع ضباط الوحدة مسكنون على وظائف
              </span>
            )
          )}

          {/* Reset Filter Button if active */}
          {filterType !== "all" && (
            <button
              type="button"
              onClick={() => setFilterType("all")}
              className="text-xs font-bold text-blue-600 hover:underline mr-2 cursor-pointer"
            >
              إلغاء الفلتر النشط
            </button>
          )}
        </PageStatusBar>
      )}

      {/* Main Table */}
      <PositionAssignmentTable
        viewMode={viewMode}
        positions={filteredPositions}
        officers={filteredOfficers}
        canEdit={canEdit}
        onViewPosition={(pos) => setViewingPosition(pos)}
        onEditPosition={(pos) => setEditingPosition(pos)}
        onAssignPosition={(pos) => setPlacementPosition(pos)}
        onViewHistory={(pos) => setHistoryPosition(pos)}
        onDeletePosition={(pos) => setDeleteConfirm(pos)}
        onSelectOfficer={(off) => setSelectedOfficer(off)}
      />

      {/* 1. View Position Details Preview Modal */}
      {viewingPosition && (
        <PositionViewModal
          isOpen={Boolean(viewingPosition)}
          position={positions.find((p) => p.id === viewingPosition.id) ?? viewingPosition}
          canEdit={canEdit}
          onClose={() => setViewingPosition(null)}
          onEditPosition={(pos) => setEditingPosition(pos as PositionRowData)}
          onPlacementPosition={(pos) => setPlacementPosition(pos as PositionRowData)}
          onViewHistory={(pos) => setHistoryPosition(pos as PositionRowData)}
          onDeletePosition={(pos) => setDeleteConfirm(pos as PositionRowData)}
          onSelectOfficer={(off) => setSelectedOfficer(off as OfficerInfo)}
        />
      )}

      {/* 2. Position History Modal */}
      {historyPosition && (
        <PositionHistoryModal
          isOpen={Boolean(historyPosition)}
          position={historyPosition}
          onClose={() => setHistoryPosition(null)}
        />
      )}

      {/* 3. Create Position Definition Modal */}
      {isCreateOpen && (
        <PositionDetailModal
          isOpen={isCreateOpen}
          position={null}
          departments={departments}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={refreshData}
        />
      )}

      {/* 4. Edit Position Definition Modal */}
      {editingPosition && (
        <PositionDetailModal
          isOpen={Boolean(editingPosition)}
          position={editingPosition}
          departments={departments}
          onClose={() => setEditingPosition(null)}
          onSuccess={refreshData}
        />
      )}

      {/* 5. Officer Placement Modal for Position */}
      {placementPosition && (
        <PositionPlacementModal
          isOpen={Boolean(placementPosition)}
          position={placementPosition}
          officers={officers}
          onClose={() => setPlacementPosition(null)}
          onSuccess={refreshData}
        />
      )}

      {/* Officer Assigned Positions Modal */}
      {selectedOfficer && (
        <OfficerPositionsModal
          isOpen={Boolean(selectedOfficer)}
          officer={selectedOfficer}
          allPositions={positions}
          canEdit={canEdit}
          onClose={() => setSelectedOfficer(null)}
          onSuccess={refreshData}
        />
      )}

      {/* Historical Archive Modal */}
      {isArchiveOpen && (
        <PositionsHistoryArchiveModal
          isOpen={isArchiveOpen}
          onClose={() => setIsArchiveOpen(false)}
        />
      )}

      {/* Unassign All Modal */}
      {isUnassignAllOpen && (
        <UnassignAllModal
          isOpen={isUnassignAllOpen}
          onClose={() => setIsUnassignAllOpen(false)}
          onSuccess={refreshData}
        />
      )}

      {/* Double-Check Delete Position Modal */}
      {deleteConfirm && (
        <DeletePositionModal
          isOpen={Boolean(deleteConfirm)}
          position={deleteConfirm}
          loading={deleting}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  );
}
