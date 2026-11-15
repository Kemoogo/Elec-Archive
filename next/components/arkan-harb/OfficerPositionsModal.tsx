"use client";

import React, { useState, useMemo } from "react";
import { ModalShell, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { useToast } from "@/components/ui/toast";
import { User, Briefcase, Plus, Trash2, Award, AlertTriangle, ArrowDown } from "lucide-react";
import { ActionButton } from "@/components/officers/OfficersTable";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { RANK_LABELS, type OfficerRank } from "@/lib/db/models/Officer.shared";
import type { OfficerData } from "@/types";

export type { OfficerData };

export interface PositionItem {
  id: string;
  positionTitle: string;
  department: string;
  primaryOfficer?: { id?: string; _id?: string; fullName?: string } | null;
  substituteOfficers?: ({ id?: string; _id?: string; fullName?: string })[];
  hasNoSubstitute?: boolean;
}

interface OfficerPositionsModalProps {
  isOpen: boolean;
  officer: OfficerData | null;
  allPositions: PositionItem[];
  canEdit: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AssignedRow {
  id: string; // position id
  positionTitle: string;
  department: string;
  role: "primary" | "substitute";
  roleLabel: string;
}

export function extractOfficerId(officer: unknown): string {
  if (!officer) return "";
  if (typeof officer === "string") return officer.trim();
  if (typeof officer === "object" && officer !== null) {
    const obj = officer as { _id?: unknown; id?: unknown };
    if (obj.id && String(obj.id) !== "undefined" && String(obj.id) !== "null") {
      return String(obj.id);
    }
    if (obj._id && String(obj._id) !== "undefined" && String(obj._id) !== "null") {
      return typeof obj._id === "object" && "_id" in (obj._id as object)
        ? String((obj._id as { _id: unknown })._id)
        : String(obj._id);
    }
  }
  return "";
}

export function getOfficerDisplay(officer?: OfficerData | null): string {
  if (!officer) return "";
  if (officer.officerLabel) return officer.officerLabel;
  const rLabel = officer.rank ? RANK_LABELS[officer.rank as OfficerRank] || officer.rank : "";
  const arkan = officer.isArkanHarb ? " أ ح" : "";
  return rLabel ? `${rLabel}${arkan} / ${officer.fullName}` : officer.fullName;
}

export function OfficerPositionsModal({
  isOpen,
  officer,
  allPositions,
  canEdit,
  onClose,
  onSuccess,
}: OfficerPositionsModalProps) {
  if (!isOpen || !officer) return null;

  const targetOfficerId = extractOfficerId(officer);
  if (!targetOfficerId) return null;

  return (
    <OfficerPositionsModalContent
      key={targetOfficerId}
      officer={officer}
      targetOfficerId={targetOfficerId}
      allPositions={allPositions}
      canEdit={canEdit}
      onClose={onClose}
      onSuccess={onSuccess}
    />
  );
}

function OfficerPositionsModalContent({
  officer,
  targetOfficerId,
  allPositions,
  canEdit,
  onClose,
  onSuccess,
}: Omit<OfficerPositionsModalProps, "isOpen"> & {
  officer: OfficerData;
  targetOfficerId: string;
}) {
  const { showToast } = useToast();
  const [selectedPositionId, setSelectedPositionId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"primary" | "substitute">("primary");
  const [loading, setLoading] = useState(false);

  // Compute initial assignments from allPositions
  const initialAssigned = useMemo(() => {
    if (!targetOfficerId) return [];
    const list: AssignedRow[] = [];
    allPositions.forEach((pos) => {
      const pId = extractOfficerId(pos.primaryOfficer);
      if (pId && pId === targetOfficerId) {
        list.push({
          id: pos.id,
          positionTitle: pos.positionTitle,
          department: pos.department,
          role: "primary",
          roleLabel: "ضابط أساسي",
        });
      }

      const isSub = (pos.substituteOfficers || []).some((sub) => {
        const sId = extractOfficerId(sub);
        return Boolean(sId && sId === targetOfficerId);
      });

      if (isSub) {
        list.push({
          id: pos.id,
          positionTitle: pos.positionTitle,
          department: pos.department,
          role: "substitute",
          roleLabel: "ضابط بديل",
        });
      }
    });
    return list;
  }, [targetOfficerId, allPositions]);

  // Local state for assignments being edited in the modal
  const [assignedList, setAssignedList] = useState<AssignedRow[]>(initialAssigned);
  const [confirmTargetPos, setConfirmTargetPos] = useState<PositionItem | null>(null);

  // Group positions by department for dropdown
  const groupedPositions = useMemo(() => {
    const map = new Map<string, PositionItem[]>();
    allPositions.forEach((pos) => {
      const dept = pos.department || "عام";
      if (!map.has(dept)) {
        map.set(dept, []);
      }
      map.get(dept)!.push(pos);
    });
    return Array.from(map.entries()).map(([department, items]) => ({
      department,
      items,
    }));
  }, [allPositions]);

  const officerLabel = getOfficerDisplay(officer);

  function commitAddAssignment(targetPos: PositionItem) {
    setAssignedList((prev) => [
      ...prev,
      {
        id: targetPos.id,
        positionTitle: targetPos.positionTitle,
        department: targetPos.department,
        role: selectedRole,
        roleLabel: selectedRole === "primary" ? "ضابط أساسي" : "ضابط بديل",
      },
    ]);
    setSelectedPositionId("");
    setConfirmTargetPos(null);
  }

  // Add assignment locally to the modal table
  function handleAddAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPositionId) {
      showToast("يرجى اختيار الوظيفة المراد التسكين عليها", "error");
      return;
    }

    const targetPos = allPositions.find((p) => p.id === selectedPositionId);
    if (!targetPos) return;

    if (selectedRole === "substitute" && targetPos.hasNoSubstitute) {
      showToast("هذه الوظيفة محددة كـ (وظيفة بدون بديل) ولا تقبل تعيين بدلاء", "error");
      return;
    }

    const existingPositionAssignment = assignedList.find(
      (r) => r.id === selectedPositionId
    );

    if (existingPositionAssignment) {
      showToast(
        existingPositionAssignment.role === selectedRole
          ? "الضابط مسكن بالفعل على هذه الوظيفة بهذه الصفة"
          : "لا يمكن تسكين الضابط كـ (ضابط أساسي) و(ضابط بديل) لنفس الوظيفة في آنٍ واحد",
        "info"
      );
      return;
    }

    // Check if replacing an existing primary officer on that position
    if (selectedRole === "primary" && targetPos.primaryOfficer) {
      const currentOccupantId = extractOfficerId(targetPos.primaryOfficer);
      if (currentOccupantId && currentOccupantId !== targetOfficerId) {
        setConfirmTargetPos(targetPos);
        return;
      }
    }

    commitAddAssignment(targetPos);
  }

  // Remove assignment locally from the modal table
  function handleRemoveAssignment(posId: string, role: "primary" | "substitute") {
    setAssignedList((prev) => prev.filter((r) => !(r.id === posId && r.role === role)));
  }

  // Save all changes to the server on confirm
  async function handleSaveAll() {
    if (!targetOfficerId) return;

    try {
      setLoading(true);

      const affectedPositionIds = new Set<string>([
        ...initialAssigned.map((r) => r.id),
        ...assignedList.map((r) => r.id),
      ]);

      const updatePromises: Promise<Response>[] = [];

      for (const posId of affectedPositionIds) {
        const originalPos = allPositions.find((p) => p.id === posId);
        if (!originalPos) continue;

        const newPrimary = assignedList.some((r) => r.id === posId && r.role === "primary");
        const newSub = assignedList.some((r) => r.id === posId && r.role === "substitute");

        const origPrimaryId = extractOfficerId(originalPos.primaryOfficer);
        const origWasPrimary = origPrimaryId === targetOfficerId;

        const origSubs: string[] = (originalPos.substituteOfficers || [])
          .map(extractOfficerId)
          .filter((id): id is string => Boolean(id));
        const origWasSub = origSubs.includes(targetOfficerId);

        let primaryChanged = false;
        let finalPrimaryOfficerId: string | null | undefined = undefined;

        if (newPrimary && !origWasPrimary) {
          finalPrimaryOfficerId = targetOfficerId;
          primaryChanged = true;
        } else if (!newPrimary && origWasPrimary) {
          finalPrimaryOfficerId = null;
          primaryChanged = true;
        }

        let subsChanged = false;
        let finalSubstituteOfficerIds: string[] | undefined = undefined;

        if (newSub && !origWasSub) {
          finalSubstituteOfficerIds = Array.from(new Set([...origSubs, targetOfficerId]));
          subsChanged = true;
        } else if (!newSub && origWasSub) {
          finalSubstituteOfficerIds = origSubs.filter((id) => id !== targetOfficerId);
          subsChanged = true;
        }

        if (primaryChanged || subsChanged) {
          const payload: Record<string, unknown> = {};
          if (primaryChanged) payload.primaryOfficerId = finalPrimaryOfficerId;
          if (subsChanged) payload.substituteOfficerIds = finalSubstituteOfficerIds;

          updatePromises.push(
            fetch(`/api/arkan-harb/positions/${posId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          );
        }
      }

      if (updatePromises.length === 0) {
        onClose();
        return;
      }

      const results = await Promise.all(updatePromises);
      const anyFailed = results.some((r) => !r.ok);

      if (anyFailed) {
        showToast("حدث خطأ أثناء حفظ بعض التكليفات", "error");
      } else {
        showToast("تم حفظ وتحديث تكليفات الضابط بنجاح", "success");
        onSuccess();
        onClose();
      }
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  const columns: TableColumn<AssignedRow>[] = [
    {
      header: "الفرع / القسم",
      accessor: "department",
      className: "text-xs font-bold text-(--app-muted-foreground)",
    },
    {
      header: "الوظيفة",
      accessor: "positionTitle",
      render: (val) => <span className="font-black text-xs text-(--color-primary)">{String(val)}</span>,
    },
    {
      header: "نوع التكليف",
      accessor: "roleLabel",
      render: (val, row) => (
        <ModalBadge
          icon={row.role === "substitute" ? <User className="w-3.5 h-3.5 text-(--app-muted-foreground)" /> : <Award className="w-3.5 h-3.5 text-(--color-primary)" />}
        >
          {String(val)}
        </ModalBadge>
      ),
    },
    ...(canEdit
      ? [
          {
            header: "الإجراءات",
            render: (_val: unknown, row: AssignedRow) => (
              <div className="flex items-center justify-center">
                <ActionButton
                  icon={<Trash2 className="w-4 h-4 text-(--color-primary) hover:text-(--app-info)" />}
                  color="btn-action-primary"
                  title="إلغاء التسكين عن هذه الوظيفة"
                  onClick={() => handleRemoveAssignment(row.id, row.role)}
                />
              </div>
            ),
            cellAlign: "center" as const,
            headerAlign: "center" as const,
            minWidth: true,
          },
        ]
      : []),
  ];

  const selectedPos = allPositions.find((p) => p.id === selectedPositionId);

  const positionSelectOptions: CustomSelectOption[] = useMemo(() => {
    return allPositions.map((p) => ({
      value: p.id,
      label: `${p.positionTitle} (${p.department || "عام"})`,
      description: p.hasNoSubstitute ? "وظيفة بدون بديل" : undefined,
      badge: p.hasNoSubstitute ? "بدون بديل" : undefined,
    }));
  }, [allPositions]);

  const roleSelectOptions: CustomSelectOption[] = useMemo(
    () => [
      { value: "primary", label: "ضابط أساسي" },
      { value: "substitute", label: "ضابط بديل", disabled: Boolean(selectedPos?.hasNoSubstitute) },
    ],
    [selectedPos]
  );

  return (
    <ModalShell
      title={`تكليفات ووظائف الضابط: ${officerLabel}`}
      icon={<Briefcase className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-2xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode={canEdit ? "action" : "view"}
          submitText={canEdit ? "حفظ التغييرات" : undefined}
          submitLoading={loading}
          onConfirm={canEdit ? handleSaveAll : undefined}
          onCancel={onClose}
        />
      }
    >
      {/* Officer Summary Card */}
      <div className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl flex items-center justify-between text-right">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-(--color-primary)/10 flex items-center justify-center text-(--color-primary) border border-(--color-primary)/20">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-(--color-primary)">
              {officerLabel}
            </h4>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-(--app-muted-foreground) font-bold">
              {officer.militaryId && (
                <span className="font-mono tabular-nums">الرقم العسكري: {officer.militaryId}</span>
              )}
              {officer.seniorityNumber && (
                <span className="font-mono tabular-nums">الأقدمية: {officer.seniorityNumber}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-left">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-xl shadow-sm">
            <span className="text-xs font-bold text-(--app-muted-foreground)">إجمالي الوظائف:</span>
            <span className="text-xs font-black text-(--color-primary)">{assignedList.length}</span>
          </div>
        </div>
      </div>

      {/* Current Assigned Positions Table */}
      <div className="space-y-2 text-right">
        <h5 className="text-xs font-black text-(--color-primary) flex items-center gap-1.5">
          <Award className="w-4 h-4 text-(--color-primary)" />
          <span>الوظائف والتكليفات الحالية</span>
        </h5>
        <MainTable
          columns={columns}
          data={assignedList}
          showSerialNumber
          emptyTitle="لا توجد وظائف مكلف بها"
          emptyDescription="هذا الضابط غير مسكن على أي وظيفة أساسية أو بديلة حالياً."
        />
      </div>

      {/* Add Additional Position Form */}
      {canEdit && (
        <form
          onSubmit={handleAddAssignment}
          className="p-4 bg-(--color-primary)/5 border border-(--color-primary)/10 shadow-sm rounded-2xl space-y-3 text-right"
        >
          <h5 className="text-xs font-black text-(--color-primary) flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            <span>تسكين وتكليف على وظيفة جديدة</span>
          </h5>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            {/* 1. Position Select */}
            <div className="sm:col-span-6 space-y-1.5">
              <CustomSelect
                id="modal-pos-select"
                label="الوظيفة المراد التسكين عليها"
                value={selectedPositionId}
                onChange={(val) => {
                  setSelectedPositionId(val);
                  const p = allPositions.find((item) => item.id === val);
                  if (p?.hasNoSubstitute) {
                    setSelectedRole("primary");
                  }
                }}
                options={positionSelectOptions}
                placeholder="-- اختر الوظيفة المراد التسكين عليها --"
                required
              />
            </div>

            {/* 2. Role Select */}
            <div className="sm:col-span-4 space-y-1.5">
              <CustomSelect
                id="modal-role-select"
                label="نوع التكليف"
                value={selectedRole}
                onChange={(val) => setSelectedRole(val as "primary" | "substitute")}
                options={roleSelectOptions}
                required
              />
            </div>

            {/* 3. Add Button */}
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={!selectedPositionId}
                className="btn-primary text-xs h-[38px] w-full flex items-center justify-center gap-1.5"
                title="إضافة التكليف"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Confirmation Modal for Primary Officer Replacement */}
      {confirmTargetPos && (
        <ModalShell
          title="تأكيد استبدال الضابط الأساسي"
          icon={<AlertTriangle className="w-4 h-4 text-(--color-primary)" />}
          onClose={() => setConfirmTargetPos(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl z-[70]"
          bodyClassName="p-5 space-y-4 text-right"
          footer={
            <ModalActions
              submitText="تأكيد الاستبدال والإضافة"
              onConfirm={() => commitAddAssignment(confirmTargetPos)}
              onCancel={() => setConfirmTargetPos(null)}
            />
          }
        >
          {/* Position Info Banner */}
          <div className="p-3 bg-(--app-surface-container) border border-(--app-border) rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-(--color-primary) shrink-0" />
              <span className="text-xs font-bold text-(--app-muted-foreground)">الوظيفة:</span>
              <span className="text-xs font-black text-(--app-foreground)">{confirmTargetPos.positionTitle}</span>
            </div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground)">فرع / {confirmTargetPos.department}</span>
          </div>

          {/* Officers Transition Flow */}
          <div className="space-y-2">
            {/* Current Officer */}
            <div className="p-3 bg-(--app-surface) border border-(--app-border) rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400">الضابط الحالي:</span>
                <span className="text-xs font-black text-(--app-foreground) mt-0.5">
                  {getOfficerDisplay(confirmTargetPos.primaryOfficer as unknown as OfficerData)}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20">
                إنهاء التكليف
              </span>
            </div>

            <div className="flex items-center justify-center -my-0.5 text-(--app-muted-foreground)">
              <ArrowDown className="w-3.5 h-3.5" />
            </div>

            {/* New Officer */}
            <div className="p-3 bg-(--app-surface) border border-blue-500/30 rounded-xl flex items-center justify-between shadow-xs">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-bold text-(--color-primary)">الضابط الجديد:</span>
                <span className="text-xs font-black text-(--color-primary) mt-0.5">
                  {officerLabel}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20">
                ضابط أساسي
              </span>
            </div>
          </div>

          {/* Notice Note */}
          <div className="flex items-start gap-2 p-2.5 bg-(--app-surface-container)/60 rounded-xl border border-(--app-border)/60 text-[11px] font-bold text-(--app-muted-foreground)">
            <AlertTriangle className="w-3.5 h-3.5 text-(--color-primary) shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              سيتم إنهاء تكليف الضابط الحالي كضابط أساسي تلقائياً وأرشفة فترته السابقة في السجل التاريخي للوظيفة عند حفظ التغييرات.
            </p>
          </div>
        </ModalShell>
      )}
    </ModalShell>
  );
}
