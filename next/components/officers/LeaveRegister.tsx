"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, User, Scissors, Calendar } from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { extractApiError } from "@/lib/utils";

interface LeaveItem {
  id: string;
  officerId: string;
  officerName: string;
  officerLabel?: string;
  officerMilitaryId: string;
  category: string;
  categoryLabel: string;
  type: string;
  typeLabel: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  statusLabel: string;
}

interface OfficerOption {
  id: string;
  fullName: string;
  militaryId: string;
}

interface LeaveRegisterProps {
  leaves: LeaveItem[];
  officers?: OfficerOption[];
  canEdit: boolean;
}

const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ["approved", "cancelled"],
  approved: ["closed", "cancelled"],
};

const STATUS_CONFIG: Record<string, string> = {
  draft: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)",
  approved: "bg-(--app-success)/10 border border-(--app-success)/20 text-(--app-success) font-bold",
  interrupted: "bg-amber-500/10 border border-amber-500/20 text-amber-700 font-bold",
  closed: "bg-(--app-surface-container) border border-(--app-border) text-(--app-muted-foreground)/60",
  cancelled: "bg-(--app-error)/10 border border-(--app-error)/20 text-(--app-error)",
};

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("ar-EG");
}

export function LeaveRegister({ leaves, canEdit }: LeaveRegisterProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [statusErrors, setStatusErrors] = useState<Record<string, string>>({});
  
  // Interrupt Leave Modal state
  const [selectedLeaveForInterrupt, setSelectedLeaveForInterrupt] = useState<LeaveItem | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState<string>("");
  const [isInterrupting, setIsInterrupting] = useState(false);

  const handleStatusChange = async (leaveId: string, newStatus: string) => {
    setStatusErrors((prev) => ({ ...prev, [leaveId]: "" }));
    try {
      const res = await fetch(`/api/arkan-harb/leaves/${leaveId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تحديث الحالة");
        setStatusErrors((prev) => ({ ...prev, [leaveId]: errorMsg }));
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم تحديث حالة السجل بنجاح", "success");
      router.refresh();
    } catch {
      setStatusErrors((prev) => ({ ...prev, [leaveId]: "حدث خطأ في الاتصال" }));
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    }
  };

  const handleInterruptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLeaveForInterrupt || !actualReturnDate) return;

    setIsInterrupting(true);
    try {
      const res = await fetch("/api/arkan-harb/leaves/interrupt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leaveId: selectedLeaveForInterrupt.id,
          actualReturnDate,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في قطع الإجازة");
        showToast(errorMsg, "error");
        return;
      }

      showToast("تم قطع الإجازة وتسجيل تاريخ العودة الفعلي بنجاح", "success");
      setSelectedLeaveForInterrupt(null);
      setActualReturnDate("");
      router.refresh();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setIsInterrupting(false);
    }
  };

  const columns: TableColumn<LeaveItem>[] = [
    {
      header: "الرتبة",
      accessor: "officerLabel",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: LeaveItem) => {
        const rankPart = row.officerLabel ? row.officerLabel.split(" / ")[0] : "";
        return (
          <span className="font-extrabold text-xs text-(--app-muted-foreground)">
            {rankPart || "ـ"}
          </span>
        );
      },
    },
    {
      header: "الاسم",
      accessor: "officerName",
      cellAlign: "right" as const,
      headerAlign: "right" as const,
      render: (_: unknown, row: LeaveItem) => (
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-(--app-muted-foreground) shrink-0" />
          <div className="flex flex-col text-right">
            <span className="text-sm font-extrabold text-(--app-foreground)">
              {row.officerName}
            </span>
            {row.officerMilitaryId && (
              <span className="text-xs font-mono text-(--app-muted-foreground)">
                عسكري: #{row.officerMilitaryId}
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: "التصنيف",
      accessor: "categoryLabel",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: LeaveItem) => (
        <Badge
          variant="outline"
          className={
            row.category === "leave"
              ? "bg-(--color-primary)/10 border-(--color-primary)/20 text-(--color-primary) text-xs font-bold"
              : "bg-(--app-error)/10 border-(--app-error)/20 text-(--app-error) text-xs font-bold"
          }
        >
          {row.categoryLabel}
        </Badge>
      ),
    },
    {
      header: "النوع",
      accessor: "typeLabel",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (val: unknown) => (
        <span className="text-xs font-bold text-(--app-foreground)">
          {(val as string) || "---"}
        </span>
      ),
    },
    {
      header: "الفترة الزمنية",
      accessor: "startDate",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: LeaveItem) => (
        <div className="flex flex-col items-center text-xs font-bold">
          <span className="font-extrabold text-(--app-foreground)">
            {formatDate(row.startDate)}
          </span>
          {row.endDate && (
            <span className="text-xs font-semibold text-(--app-muted-foreground) mt-0.5">
              حتى {formatDate(row.endDate)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "الحالة الإدارية والإجراءات",
      accessor: "status",
      cellAlign: "center" as const,
      headerAlign: "center" as const,
      render: (_: unknown, row: LeaveItem) => (
        <div className="flex items-center justify-center gap-2">
          <div className="flex flex-col items-center gap-1">
            {canEdit && STATUS_TRANSITIONS[row.status] ? (
              <div className="relative inline-block w-full max-w-[140px]">
                <select
                  value={row.status}
                  onChange={(e) => handleStatusChange(row.id, e.target.value)}
                  className={`w-full rounded-xl border px-3 py-1.5 text-xs font-bold appearance-none cursor-pointer focus:outline-none ${
                    STATUS_CONFIG[row.status] || STATUS_CONFIG.draft
                  }`}
                >
                  <option value={row.status} className="bg-(--app-surface)">
                    {row.statusLabel}
                  </option>
                  {STATUS_TRANSITIONS[row.status].map((s) => (
                    <option
                      key={s}
                      value={s}
                      className="bg-(--app-surface) text-(--color-primary)"
                    >
                      {s === "approved"
                        ? "اعتماد السجل"
                        : s === "closed"
                        ? "إغلاق السجل"
                        : "إلغاء السجل"}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div
                className={`px-3 py-1 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                  STATUS_CONFIG[row.status] || STATUS_CONFIG.draft
                }`}
              >
                {row.status === "approved" && <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>{row.statusLabel}</span>
              </div>
            )}
            {statusErrors[row.id] && (
              <span className="text-[10px] text-red-500 font-bold">
                {statusErrors[row.id]}
              </span>
            )}
          </div>

          {canEdit && row.status === "approved" && (
            <button
              onClick={() => {
                setSelectedLeaveForInterrupt(row);
                setActualReturnDate(new Date().toISOString().split("T")[0]);
              }}
              title="قطع الإجازة وتسجيل عودة مبكرة"
              className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shrink-0"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>قطع الإجازة</span>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <MainTable<LeaveItem>
        columns={columns}
        data={leaves}
        showSerialNumber={true}
        emptyTitle="لا توجد سجلات إجازات حالياً"
        emptyDescription="لم يتم تسجيل أية إجازات أو انقطاعات للقوة"
      />

      {/* Interrupt Leave Modal */}
      {selectedLeaveForInterrupt && (
        <ModalShell
          title="قطع الإجازة وتسجيل تاريخ العودة الفعلي"
          icon={<Calendar className="w-4 h-4" />}
          onClose={() => setSelectedLeaveForInterrupt(null)}
          overlayClassName="bg-black/40"
          panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-6"
          footer={
            <ModalActions>
              <button
                type="button"
                onClick={() => setSelectedLeaveForInterrupt(null)}
                className="px-4 py-2 text-xs font-bold bg-(--app-surface-container) border border-(--app-border) rounded-xl hover:bg-(--app-border)/30 transition-all"
              >
                إلغاء
              </button>
              <button
                type="submit"
                form="interrupt-leave-form"
                disabled={isInterrupting}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-all disabled:opacity-50"
              >
                {isInterrupting ? "جاري الحفظ..." : "إقرار قطع الإجازة"}
              </button>
            </ModalActions>
          }
        >
          <form id="interrupt-leave-form" onSubmit={handleInterruptSubmit} className="space-y-4 text-right">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-900 font-medium">
              سيتم تعديل حالة إجازة الضابط (<strong>{selectedLeaveForInterrupt.officerName}</strong>) إلى &quot;مقطوعة&quot; وتحديث تمامه تلقائياً كـ &quot;حاضر&quot; من تاريخ العودة الفعلي.
            </div>

            <DateField
              id="actualReturnDate"
              label="تاريخ العودة الفعلي (تاريخ القطع)"
              value={actualReturnDate}
              onChange={setActualReturnDate}
              required
            />
          </form>
        </ModalShell>
      )}
    </>
  );
}

