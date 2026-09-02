"use client";

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CreateDepartmentModal } from "./create-department-modal";
import { EditDepartmentModal, EditItemType } from "./edit-department-modal";
import { ActionButton } from "@/components/officers/OfficersTable";
import { 
  Building2, 
  GitFork, 
  Info, 
  Trash2, 
  Database, 
  ArrowUp, 
  ArrowDown, 
  ArrowUpDown, 
  X 
} from "lucide-react";

interface BranchItem {
  _id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  order: number;
}

interface DepartmentItem {
  _id: string;
  name: string;
  code?: string;
  branchId: { _id: string; name: string } | string;
  description?: string;
  isActive: boolean;
  order: number;
}

interface SelectedReorderItem {
  type: "branch" | "department";
  id: string;
  name: string;
  branchId?: string;
}

interface DepartmentManagementProps {
  searchQuery?: string;
  canEdit?: boolean;
}

export const DepartmentManagement = forwardRef<{ openCreateModal: () => void }, DepartmentManagementProps>(
  ({ searchQuery = "", canEdit = true }, ref) => {
    const { showToast } = useToast();
    const [branches, setBranches] = useState<BranchItem[]>([]);
    const [departments, setDepartments] = useState<DepartmentItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [showCreate, setShowCreate] = useState(false);
    const [editingItem, setEditingItem] = useState<EditItemType | null>(null);

    // Reorder mode toggle and selection state
    const [isReorderMode, setIsReorderMode] = useState(false);
    const [selectedItem, setSelectedItem] = useState<SelectedReorderItem | null>(null);
    const [reordering, setReordering] = useState(false);

    // Delete Confirmation State
    const [deleteConfirm, setDeleteConfirm] = useState<{
      type: "branch" | "department";
      id: string;
      name: string;
    } | null>(null);
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      openCreateModal: () => setShowCreate(true),
    }));

    const fetchData = useCallback(async () => {
      try {
        setLoading(true);
        const [resB, resD] = await Promise.all([
          fetch("/api/branches"),
          fetch("/api/departments"),
        ]);

        const dataB = await resB.json();
        const dataD = await resD.json();

        if (dataB.success) setBranches(dataB.branches || []);
        if (dataD.success) setDepartments(dataD.departments || []);
      } catch {
        showToast("فشل في تحميل البيانات", "error");
      } finally {
        setLoading(false);
      }
    }, [showToast]);

    useEffect(() => {
      fetchData();
    }, [fetchData]);

    async function handleConfirmDelete() {
      if (!deleteConfirm) return;
      setSaving(true);
      try {
        const endpoint =
          deleteConfirm.type === "branch"
            ? `/api/branches/${deleteConfirm.id}`
            : `/api/departments/${deleteConfirm.id}`;
        const res = await fetch(endpoint, { method: "DELETE" });
        const data = await res.json();
        if (!res.ok) {
          showToast(extractApiError(data, "فشل عملية الحذف"), "error");
          return;
        }
        showToast("تم الحذف بنجاح", "success");
        if (selectedItem?.id === deleteConfirm.id) {
          setSelectedItem(null);
        }
        setDeleteConfirm(null);
        fetchData();
      } catch {
        showToast("حدث خطأ في الاتصال", "error");
      } finally {
        setSaving(false);
      }
    }

    // Handle Reorder Up / Down
    async function handleReorder(direction: "up" | "down") {
      if (!selectedItem) {
        showToast("يرجى تحديد فرع أو قسم أولاً لتحريكه", "info");
        return;
      }

      try {
        setReordering(true);
        const endpoint = selectedItem.type === "branch" ? "/api/branches/reorder" : "/api/departments/reorder";
        const payload = selectedItem.type === "branch"
          ? { id: selectedItem.id, direction }
          : { id: selectedItem.id, direction, branchId: selectedItem.branchId };

        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          showToast(extractApiError(data, "فشل في إعادة الترتيب"), "error");
          return;
        }

        showToast(direction === "up" ? "تم النقل للأعلى بنجاح" : "تم النقل للأسفل بنجاح", "success");
        await fetchData();
      } catch {
        showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
      } finally {
        setReordering(false);
      }
    }

    // Filter Branches and Departments according to searchQuery
    const filteredBranches = branches.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      if (!q) return true;
      const matchBranch = b.name.toLowerCase().includes(q) || (b.description && b.description.toLowerCase().includes(q));
      const matchChildDep = departments.some((d) => {
        const bId = typeof d.branchId === "object" ? d.branchId?._id : d.branchId;
        return bId === b._id && (d.name.toLowerCase().includes(q) || (d.description && d.description.toLowerCase().includes(q)));
      });
      return matchBranch || matchChildDep;
    });

    return (
      <div className="space-y-3" dir="rtl">
        {/* Top Reordering Control Action Bar */}
        {canEdit && (
          <div className="p-3 bg-(--app-surface) border border-(--app-border) rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const nextMode = !isReorderMode;
                  setIsReorderMode(nextMode);
                  if (!nextMode) setSelectedItem(null);
                }}
                className={isReorderMode ? "btn-primary active:scale-95 transition-transform" : "btn-secondary"}
              >
                <ArrowUpDown className="w-4 h-4" />
                <span>{isReorderMode ? "إنهاء الترتيب" : "إعادة الترتيب"}</span>
              </button>

              <span className="text-xs font-bold text-(--app-muted-foreground) mr-2">
                {isReorderMode ? (
                  selectedItem ? (
                    <span className="text-blue-700 dark:text-blue-400">
                      المحدد حالياً: {selectedItem.type === "branch" ? "فرع" : "قسم"} ({selectedItem.name})
                    </span>
                  ) : (
                    "اختر فرعاً أو قسماً من الجدول للتحريك"
                  )
                ) : (
                  "اضغط على مفتاح إعادة الترتيب لتفعيل أسهم وخانات التحريك"
                )}
              </span>
            </div>

            {isReorderMode && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleReorder("up")}
                  disabled={!selectedItem || reordering}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-(--app-surface-container) hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 border border-(--app-border) text-(--app-foreground) transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                  <span>تحريك لأعلى</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleReorder("down")}
                  disabled={!selectedItem || reordering}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-(--app-surface-container) hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 border border-(--app-border) text-(--app-foreground) transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                  <span>تحريك لأسفل</span>
                </button>

                {selectedItem && (
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
                    title="إلغاء التحديد"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Table */}
        <SectionWrapper noPadding className="overflow-hidden rounded-2xl border border-(--app-border)/80 shadow-sm">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <div className="w-10 h-10 border-4 border-(--color-primary)/20 border-t-(--color-primary) rounded-full animate-spin" />
              <p className="text-sm font-bold text-(--app-muted-foreground)">جاري تحميل الفروع والأقسام...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
              <Database className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <h3 className="text-base font-bold text-(--app-foreground)">لا توجد فروع أو أقسام مسجلة</h3>
              <p className="text-xs text-(--app-muted-foreground)">لم يتم العثور على أي بيانات مطابقة للبحث. اضغط على &quot;إضافة فرع/قسم&quot; للبدء.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto min-w-full text-right border-collapse" dir="rtl">
                <thead className="bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs">
                  <tr>
                    {/* Checkbox column only in reorder mode */}
                    {isReorderMode && (
                      <th className="px-3 py-3.5 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                        اختيار
                      </th>
                    )}
                    <th className="px-5 py-3.5 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                      م
                    </th>
                    <th className="px-5 py-3.5 text-right font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>اسم الفرع</th>
                    <th className="px-5 py-3.5 text-right font-bold">اسم القسم</th>
                    {canEdit && (
                      <th className="px-5 py-3.5 text-center font-bold" style={{ width: "1%", whiteSpace: "nowrap" }}>
                        الإجراءات
                      </th>
                    )}
                  </tr>
                </thead>

                {/* Grouped Table Bodies */}
                {filteredBranches.map((branch, branchIndex) => {
                  const branchDeps = departments.filter((d) => {
                    const bId = typeof d.branchId === "object" ? d.branchId?._id : d.branchId;
                    return bId === branch._id;
                  });

                  const rowSpan = Math.max(branchDeps.length, 1);
                  const firstDep = branchDeps[0];
                  const isBranchSelected = selectedItem?.type === "branch" && selectedItem?.id === branch._id;

                  // Case 1: Branch with NO child departments
                  if (branchDeps.length === 0) {
                    return (
                      <tbody key={branch._id} className={`divide-y divide-(--app-border)/40 text-xs border-b border-(--app-border)/40 ${isBranchSelected ? "bg-blue-500/10 ring-1 ring-blue-500/30" : ""}`}>
                        <tr className="hover:bg-(--app-surface-container) transition-colors duration-150">
                          {/* Column 0: Selection Checkbox */}
                          {isReorderMode && (
                            <td className="px-3 py-3.5 text-center align-middle border-l border-(--app-border)/30" style={{ width: "1%" }}>
                              <input
                                type="checkbox"
                                checked={isBranchSelected}
                                onChange={() => {
                                  if (isBranchSelected) {
                                    setSelectedItem(null);
                                  } else {
                                    // Select branch (mutually exclusive with department selection)
                                    setSelectedItem({ type: "branch", id: branch._id, name: branch.name });
                                  }
                                }}
                                className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                                title="تحديد الفرع للترتيب"
                              />
                            </td>
                          )}

                          {/* Column 1: Serial Number */}
                          <td
                            className="px-5 py-3.5 text-center font-mono font-bold text-(--app-muted-foreground) align-middle border-l border-(--app-border)/30 whitespace-nowrap tabular-nums"
                            style={{ width: "1%" }}
                          >
                            {branchIndex + 1}
                          </td>

                          {/* Column 2 & 3 Merged: Branch Name (colSpan={2}) */}
                          <td colSpan={2} className="px-5 py-3.5 align-middle">
                            <div className="flex items-center gap-2.5 group/tooltip relative w-fit">
                              <Building2 className="w-4 h-4 text-(--color-primary) shrink-0" />
                              {canEdit ? (
                                <button
                                  type="button"
                                  onClick={() => setEditingItem({ type: "branch", data: branch })}
                                  className="font-extrabold text-sm text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                                >
                                  {branch.name}
                                </button>
                              ) : (
                                <span className="font-extrabold text-sm text-(--color-primary)">{branch.name}</span>
                              )}

                              {branch.description ? (
                                <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-2.5 bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold rounded-xl shadow-2xl border border-(--app-border)/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                  <div className="flex items-center gap-1 text-blue-300 mb-1 border-b border-white/10 pb-1">
                                    <Info className="w-3 h-3" />
                                    <span>وصف الفرع:</span>
                                  </div>
                                  <p className="leading-relaxed font-normal">{branch.description}</p>
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Column 4: Actions */}
                          {canEdit && (
                            <td className="px-5 py-3.5 text-center align-middle whitespace-nowrap" style={{ width: "1%" }}>
                              <div className="flex items-center justify-center">
                                <ActionButton
                                  icon={<Trash2 className="w-4 h-4 text-red-500" />}
                                  color="btn-action-danger"
                                  title="حذف الفرع"
                                  onClick={() => setDeleteConfirm({ type: "branch", id: branch._id, name: branch.name })}
                                />
                              </div>
                            </td>
                          )}
                        </tr>
                      </tbody>
                    );
                  }

                  // Case 2: Branch WITH child departments
                  return (
                    <tbody key={branch._id} className={`group/branch divide-y divide-(--app-border)/40 text-xs border-b border-(--app-border)/40 has-[.branch-cell:hover]:bg-(--app-surface-container) transition-colors duration-150 ${isBranchSelected ? "bg-blue-500/10 ring-1 ring-blue-500/30" : ""}`}>
                      {/* Row 0 */}
                      <tr className="hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150">
                        {/* Column 0: Selection Checkbox */}
                        {isReorderMode && (
                          <td
                            rowSpan={rowSpan}
                            className="px-3 py-3.5 text-center align-middle border-l border-(--app-border)/30 group-hover/branch:bg-(--app-surface-container) transition-colors duration-150"
                            style={{ width: "1%" }}
                          >
                            <input
                              type="checkbox"
                              checked={isBranchSelected}
                              onChange={() => {
                                if (isBranchSelected) {
                                  setSelectedItem(null);
                                } else {
                                  // Select branch (mutually exclusive with department selection)
                                  setSelectedItem({ type: "branch", id: branch._id, name: branch.name });
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded cursor-pointer accent-blue-600"
                              title="تحديد الفرع للترتيب"
                            />
                          </td>
                        )}

                        {/* Column 1: Serial Number */}
                        <td
                          rowSpan={rowSpan}
                          className="px-5 py-3.5 text-center font-mono font-bold text-(--app-muted-foreground) align-middle border-l border-(--app-border)/30 group-hover/branch:bg-(--app-surface-container) transition-colors duration-150 whitespace-nowrap tabular-nums"
                          style={{ width: "1%" }}
                        >
                          {branchIndex + 1}
                        </td>

                        {/* Column 2: Parent Branch Name */}
                        <td
                          rowSpan={rowSpan}
                          className="branch-cell px-5 py-3.5 align-middle border-l border-(--app-border)/30 group-hover/branch:bg-(--app-surface-container) hover:!bg-blue-500/10 dark:hover:!bg-blue-900/20 transition-colors duration-150 whitespace-nowrap bg-(--app-surface) cursor-default"
                          style={{ width: "1%" }}
                        >
                          <div className="flex items-center gap-2.5 group/tooltip relative w-fit">
                            <Building2 className="w-4 h-4 text-(--color-primary) shrink-0" />
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => setEditingItem({ type: "branch", data: branch })}
                                className="font-extrabold text-sm text-(--color-primary) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                              >
                                {branch.name}
                              </button>
                            ) : (
                              <span className="font-extrabold text-sm text-(--color-primary)">{branch.name}</span>
                            )}

                            {branch.description ? (
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-2.5 bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold rounded-xl shadow-2xl border border-(--app-border)/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center gap-1 text-blue-300 mb-1 border-b border-white/10 pb-1">
                                  <Info className="w-3 h-3" />
                                  <span>وصف الفرع:</span>
                                </div>
                                <p className="leading-relaxed font-normal">{branch.description}</p>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Column 3: Department 0 Name */}
                        <td className={`px-5 py-3.5 font-bold text-(--app-muted-foreground) ${selectedItem?.type === "department" && selectedItem.id === firstDep._id ? "bg-emerald-500/10" : ""}`}>
                          <div className="flex items-center gap-2 group/tooltip relative w-fit">
                            {isReorderMode && (
                              <input
                                type="checkbox"
                                checked={selectedItem?.type === "department" && selectedItem.id === firstDep._id}
                                onChange={() => {
                                  if (selectedItem?.type === "department" && selectedItem.id === firstDep._id) {
                                    setSelectedItem(null);
                                  } else {
                                    // Select department (mutually exclusive with branch selection)
                                    setSelectedItem({ type: "department", id: firstDep._id, name: firstDep.name, branchId: branch._id });
                                  }
                                }}
                                className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer accent-emerald-600 mr-1"
                                title="تحديد القسم للترتيب"
                              />
                            )}
                            <GitFork className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => setEditingItem({ type: "department", data: firstDep })}
                                className="font-bold text-xs text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                              >
                                {firstDep.name}
                              </button>
                            ) : (
                              <span className="font-bold text-xs text-(--app-muted-foreground)">{firstDep.name}</span>
                            )}

                            {firstDep.description ? (
                              <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-2.5 bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold rounded-xl shadow-2xl border border-(--app-border)/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                <div className="flex items-center gap-1 text-blue-300 mb-1 border-b border-white/10 pb-1">
                                  <Info className="w-3 h-3" />
                                  <span>وصف القسم:</span>
                                </div>
                                <p className="leading-relaxed font-normal">{firstDep.description}</p>
                              </div>
                            ) : null}
                          </div>
                        </td>

                        {/* Column 4: Actions */}
                        {canEdit && (
                          <td className="px-5 py-3.5 text-center align-middle whitespace-nowrap" style={{ width: "1%" }}>
                            <div className="flex items-center justify-center">
                              <ActionButton
                                icon={<Trash2 className="w-4 h-4 text-red-500" />}
                                color="btn-action-danger"
                                title="حذف القسم"
                                onClick={() => setDeleteConfirm({ type: "department", id: firstDep._id, name: firstDep.name })}
                              />
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* Remaining Department Rows for this Parent Branch */}
                      {branchDeps.slice(1).map((dep) => {
                        const isDepSelected = selectedItem?.type === "department" && selectedItem.id === dep._id;
                        return (
                          <tr key={dep._id} className={`hover:bg-(--app-surface-container) group-has-[.branch-cell:hover]/branch:bg-(--app-surface-container) transition-colors duration-150 ${isDepSelected ? "bg-emerald-500/10" : ""}`}>
                            {/* Department Name */}
                            <td className="px-5 py-3.5 font-bold text-(--app-muted-foreground)">
                              <div className="flex items-center gap-2 group/tooltip relative w-fit">
                                {isReorderMode && (
                                  <input
                                    type="checkbox"
                                    checked={isDepSelected}
                                    onChange={() => {
                                      if (isDepSelected) {
                                        setSelectedItem(null);
                                      } else {
                                        // Select department (mutually exclusive with branch selection)
                                        setSelectedItem({ type: "department", id: dep._id, name: dep.name, branchId: branch._id });
                                      }
                                    }}
                                    className="w-3.5 h-3.5 text-emerald-600 rounded cursor-pointer accent-emerald-600 mr-1"
                                    title="تحديد القسم للترتيب"
                                  />
                                )}
                                <GitFork className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {canEdit ? (
                                  <button
                                    type="button"
                                    onClick={() => setEditingItem({ type: "department", data: dep })}
                                    className="font-bold text-xs text-(--app-muted-foreground) hover:underline hover:text-(--app-info) cursor-pointer transition-colors text-right"
                                  >
                                    {dep.name}
                                  </button>
                                ) : (
                                  <span className="font-bold text-xs text-(--app-muted-foreground)">{dep.name}</span>
                                )}

                                {dep.description ? (
                                  <div className="absolute right-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-64 p-2.5 bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold rounded-xl shadow-2xl border border-(--app-border)/20 pointer-events-none animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center gap-1 text-blue-300 mb-1 border-b border-white/10 pb-1">
                                      <Info className="w-3 h-3" />
                                      <span>وصف القسم:</span>
                                    </div>
                                    <p className="leading-relaxed font-normal">{dep.description}</p>
                                  </div>
                                ) : null}
                              </div>
                            </td>

                            {/* Actions column for this department */}
                            {canEdit && (
                              <td className="px-5 py-3.5 text-center align-middle whitespace-nowrap" style={{ width: "1%" }}>
                                <div className="flex items-center justify-center">
                                  <ActionButton
                                    icon={<Trash2 className="w-4 h-4 text-red-500" />}
                                    color="btn-action-danger"
                                    title="حذف القسم"
                                    onClick={() => setDeleteConfirm({ type: "department", id: dep._id, name: dep.name })}
                                  />
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  );
                })}
              </table>
            </div>
          )}
        </SectionWrapper>

        {/* Modal: Create Branch or Department */}
        {showCreate && (
          <CreateDepartmentModal
            branches={branches}
            onClose={() => setShowCreate(false)}
            onSuccess={() => {
              setShowCreate(false);
              fetchData();
            }}
          />
        )}

        {/* Modal: Edit Branch or Department */}
        {editingItem && (
          <EditDepartmentModal
            item={editingItem}
            branches={branches}
            onClose={() => setEditingItem(null)}
            onSuccess={() => {
              setEditingItem(null);
              fetchData();
            }}
          />
        )}

        {/* Modal: Confirm Delete */}
        {deleteConfirm && (
          <ModalShell
            title={`تأكيد حذف ${deleteConfirm.type === "branch" ? "الفرع" : "القسم"}`}
            icon={<Trash2 className="w-4 h-4" />}
            titleVariant="danger"
            onClose={() => setDeleteConfirm(null)}
            overlayClassName="bg-black/40"
            panelClassName="max-w-sm border-red-500/30 shadow-depth-xl"
            footer={
              <ModalActions
                submitText="تأكيد الحذف"
                submitVariant="destructive"
                submitLoading={saving}
                onConfirm={handleConfirmDelete}
                onCancel={() => setDeleteConfirm(null)}
              />
            }
          >
            <div className="space-y-2 text-right">
              <p className="text-sm font-bold text-(--app-foreground)">
                هل أنت متأكد من رغبتك في حذف {deleteConfirm.type === "branch" ? "الفرع" : "القسم"}:{" "}
                <span className="text-red-600 font-extrabold">{deleteConfirm.name}</span>؟
              </p>
              {deleteConfirm.type === "branch" && (
                <p className="text-xs text-red-500 font-bold">
                  تنبيه: حذف الفرع سيؤدي أيضاً إلى حذف كافة الأقسام التابعة له.
                </p>
              )}
            </div>
          </ModalShell>
        )}
      </div>
    );
  }
);

DepartmentManagement.displayName = "DepartmentManagement";
