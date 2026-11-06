"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useReactToPrint } from "react-to-print";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { DateField } from "@/components/ui/date-field";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { MonoBadge } from "@/components/ui/mono-badge";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalHeaderCard, ModalSection } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { StudentRollcallPrint } from "./StudentRollcallPrint";
import {
  Calendar,
  CheckCircle2,
  Printer,
  Save,
  RotateCcw,
  AlertCircle,
  Users,
  ShieldAlert,
  UserCheck,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import { formatDateDisplay } from "@/lib/utils/date-display";
import type {
  IStudentRollcallEntry,
  StudentAttendanceStatus,
  RollcallStatus,
} from "@/lib/db/models/StudentRollcall.shared";

const ROLLCALL_STATUS_OPTIONS: CustomSelectOption[] = [
  // الموجود
  { value: "present", label: "حاضر (تدريب / طابور)" },
  { value: "duty_service", label: "خدمة داخلية / نوبتجية" },
  { value: "clinic", label: "عيادة الوحدة" },
  // خوارج رسمية وطبية واختبارات
  { value: "leave", label: "إجازة دورية / ميدانية" },
  { value: "sick_leave", label: "إجازة مرضي" },
  { value: "rest", label: "راحة طبية" },
  { value: "hospital", label: "حجز مستشفى عسكري" },
  { value: "police_academy_exam", label: "اختبار كلية شرطة" },
  { value: "military_academy_exam", label: "اختبار أكاديمية عسكرية" },
  { value: "mission", label: "مأمورية خارجية" },
  // خوارج انضباطية
  { value: "absent", label: "غياب بدون إذن" },
  { value: "prison", label: "حبس انضباطي / سجن" },
  { value: "court", label: "محكمة / نيابة عسكرية" },
];

interface StudentRollcallTabProps {
  activeStage: { mrhla: string; name: string };
  canEdit: boolean;
  isAdmin: boolean;
}

export function StudentRollcallTab({
  activeStage,
  canEdit,
  isAdmin,
}: StudentRollcallTabProps) {
  const { showToast } = useToast();

  // Tomorrow by default
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rollcallStatus, setRollcallStatus] = useState<RollcallStatus>("draft");
  const [entries, setEntries] = useState<IStudentRollcallEntry[]>([]);
  const [isPastSixAm, setIsPastSixAm] = useState(false);
  const [canReopen, setCanReopen] = useState(false);

  // Selection for bulk action
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<StudentAttendanceStatus>("present");

  // Reopen modal state
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  // Print ref
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `تمام الطلبة - ${activeStage.name} - ${selectedDate}`,
  });

  // Fetch rollcall for date & mrhla
  const fetchRollcall = useCallback(async () => {
    if (!activeStage.mrhla) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/students/rollcall?date=${selectedDate}&mrhla=${activeStage.mrhla}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل استرجاع التمام", "error");
        return;
      }

      const rc = data.data.rollcall;
      setRollcallStatus(rc.status || "draft");
      setEntries(rc.entries || []);
      setIsPastSixAm(Boolean(data.data.isPastSixAm));
      setCanReopen(Boolean(data.data.canReopen));
      setSelectedIds(new Set());
    } catch {
      showToast("خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeStage.mrhla, showToast]);

  useEffect(() => {
    fetchRollcall();
  }, [fetchRollcall]);

  // Entry status change
  const handleEntryStatusChange = (studentId: string, newStatus: StudentAttendanceStatus) => {
    setEntries((prev) =>
      prev.map((e) => (e.studentId === studentId ? { ...e, status: newStatus } : e))
    );
  };

  const handleEntryNotesChange = (studentId: string, notes: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.studentId === studentId ? { ...e, notes } : e))
    );
  };

  const handleEntryDestinationChange = (studentId: string, destination: string) => {
    setEntries((prev) =>
      prev.map((e) => (e.studentId === studentId ? { ...e, destination } : e))
    );
  };

  // Bulk actions
  const toggleSelectAll = () => {
    if (selectedIds.size === entries.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map((e) => e.studentId)));
    }
  };

  const toggleSelectRow = (studentId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const applyBulkStatus = () => {
    if (selectedIds.size === 0) {
      showToast("يرجى تحديد طلاب لتطبيق الحالة عليهم", "info");
      return;
    }

    setEntries((prev) =>
      prev.map((e) => (selectedIds.has(e.studentId) ? { ...e, status: bulkStatus } : e))
    );
    showToast(`تم تطبيق الحالة على ${selectedIds.size} طالب بنجاح`, "success");
    setSelectedIds(new Set());
  };

  // Save / Approve / Reopen handler
  const handleSaveRollcall = async (action: "save_draft" | "approve" | "reopen", reason?: string) => {
    if (saving) return;

    setSaving(true);
    try {
      const payload = {
        date: selectedDate,
        mrhla: activeStage.mrhla,
        action,
        entries,
        overrideReason: reason || overrideReason || undefined,
      };

      const res = await fetch("/api/students/rollcall", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل حفظ التمام", "error");
        return;
      }

      showToast(data.message || "تمت العملية بنجاح", "success");
      setShowReopenModal(false);
      setOverrideReason("");
      await fetchRollcall();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setSaving(false);
    }
  };

  // Counts summary
  const summary = useMemo(() => {
    let present = 0;
    let official = 0;
    let disciplinary = 0;

    for (const e of entries) {
      if (["present", "duty_service", "clinic"].includes(e.status)) present++;
      else if (["absent", "prison", "court"].includes(e.status)) disciplinary++;
      else official++;
    }

    return {
      total: entries.length,
      present,
      official,
      disciplinary,
    };
  }, [entries]);

  const isReadOnly = (rollcallStatus === "closed" || rollcallStatus === "approved") && !isAdmin;

  const columns: TableColumn<IStudentRollcallEntry>[] = [
    {
      header: (
        <button
          type="button"
          onClick={toggleSelectAll}
          disabled={isReadOnly}
          className="cursor-pointer p-1 text-white hover:text-(--app-info) transition-colors"
          title="تحديد الكل"
        >
          {selectedIds.size > 0 && selectedIds.size === entries.length ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
        </button>
      ),
      accessor: "select",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <input
          type="checkbox"
          checked={selectedIds.has(row.studentId)}
          onChange={() => toggleSelectRow(row.studentId)}
          disabled={isReadOnly}
          className="rounded border-(--app-border) text-(--color-primary) focus:ring-blue-500 cursor-pointer"
        />
      ),
    },
    {
      header: "الرقم العسكري",
      accessor: "militaryNo",
      cellAlign: "center",
      headerAlign: "center",
      render: (_, row) => (
        <span className="font-mono text-xs font-bold text-(--app-muted-foreground)">
          {row.militaryNo}
        </span>
      ),
    },
    {
      header: "الاسم والملاحظات الانضباطية",
      accessor: "fullName",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-black text-(--color-primary)">
            {row.fullName}
          </span>
          {row.isOngoingDisciplinary && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-(--color-primary) bg-(--color-primary)/5 px-2 py-0.5 rounded border border-(--color-primary)/20 w-max">
              <ShieldAlert className="w-3 h-3 text-(--color-primary)" />
              {row.status === "absent" ? "غياب مستمر من ملف Access" : "حبس مستمر من ملف Access"}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "حالة التمام",
      accessor: "status",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => {
        if (isReadOnly) {
          const opt = ROLLCALL_STATUS_OPTIONS.find((o) => o.value === row.status);
          return (
            <span className="text-xs font-bold text-(--app-foreground)">
              {opt?.label || row.status}
            </span>
          );
        }

        return (
          <div className="w-52">
            <CustomSelect
              value={row.status}
              onChange={(val) => handleEntryStatusChange(row.studentId, val as StudentAttendanceStatus)}
              options={ROLLCALL_STATUS_OPTIONS}
              disabled={isReadOnly || saving}
              className="!py-1 !text-xs font-bold"
            />
          </div>
        );
      },
    },
    {
      header: "الجهة / الملاحظات",
      accessor: "notes",
      cellAlign: "right",
      headerAlign: "right",
      render: (_, row) => {
        if (isReadOnly) {
          return (
            <span className="text-xs text-(--app-muted-foreground)">
              {row.destination ? `الجهة: ${row.destination}` : ""}
              {row.destination && row.notes ? " - " : ""}
              {row.notes || "—"}
            </span>
          );
        }

        const isOut = !["present", "duty_service", "clinic"].includes(row.status);

        return (
          <div className="flex items-center gap-2">
            {isOut && (
              <input
                type="text"
                placeholder="الجهة المستهدفة..."
                value={row.destination || ""}
                maxLength={100}
                onChange={(e) => handleEntryDestinationChange(row.studentId, e.target.value)}
                className="w-32 px-2 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-lg text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
              />
            )}
            <input
              type="text"
              placeholder="ملاحظات..."
              value={row.notes || ""}
              maxLength={200}
              onChange={(e) => handleEntryNotesChange(row.studentId, e.target.value)}
              className="flex-1 min-w-[120px] px-2 py-1 bg-(--app-surface-container) border border-(--app-border) rounded-lg text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        );
      },
    },
  ];

  if (!activeStage.mrhla) {
    return (
      <div className="bg-(--app-surface) p-10 rounded-2xl border border-(--app-border) text-center space-y-3">
        <div className="w-12 h-12 bg-(--color-primary)/10 text-(--color-primary) rounded-2xl flex items-center justify-center mx-auto border border-(--color-primary)/20">
          <Calendar className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black text-(--color-primary)">لا توجد مرحلة تجنيدية مسجلة حالياً</h3>
        <p className="text-xs font-bold text-(--app-muted-foreground) max-w-md mx-auto">
          يرجى استيراد ملف Access (.mdb) أو اعتماد مرحلة تجنيدية بالمنظومة للبدء في إعداد واعتماد التمام اليومي للطلبة.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Controls Strip */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-(--app-surface) p-4 rounded-2xl border border-(--app-border) shadow-depth-sm">
        {/* Date Selector & Status Badge */}
        <div className="flex flex-wrap items-center gap-4">
          <DateField
            id="rollcall-date"
            label="تاريخ التمام"
            value={selectedDate}
            onChange={(val) => setSelectedDate(val)}
            className="!flex !flex-row !items-center !space-y-0 gap-2"
            containerClassName="w-44"
          />

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-(--app-muted-foreground)">حالة التمام:</span>
            {rollcallStatus === "closed" ? (
              <MonoBadge
                size="sm"
                variant="outline"
                value="مغلق نهائياً (06:00)"
                className="!bg-(--app-surface-container) !text-(--color-primary) !border-(--color-primary)/20"
              />
            ) : rollcallStatus === "approved" ? (
              <MonoBadge
                size="sm"
                variant="surface"
                value="معتمد (مغلق مؤقتاً)"
                className="!text-(--color-primary)"
              />
            ) : (
              <MonoBadge
                size="sm"
                variant="primary"
                value="مسودة قيد الإعداد"
                className="!bg-(--color-primary)/10 !text-(--color-primary) !border-(--color-primary)/20"
              />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && rollcallStatus === "draft" && (
            <>
              <button
                type="button"
                onClick={() => handleSaveRollcall("save_draft")}
                disabled={saving || loading}
                className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>حفظ مسودة</span>
              </button>

              <button
                type="button"
                onClick={() => handleSaveRollcall("approve")}
                disabled={saving || loading}
                className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>اعتماد التمام</span>
              </button>
            </>
          )}

          {canReopen && (
            <button
              type="button"
              onClick={() => setShowReopenModal(true)}
              disabled={saving || loading}
              className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-(--color-primary)" />
              <span>إعادة فتح التمام</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handlePrint()}
            disabled={loading || entries.length === 0}
            className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs font-bold cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-(--color-primary)" />
            <span>طباعة A4</span>
          </button>

          <button
            type="button"
            onClick={fetchRollcall}
            disabled={loading}
            title="تحديث البيانات"
            className="p-2 rounded-xl border border-(--app-border) hover:bg-(--app-surface-container) text-(--color-primary) hover:text-(--app-info) transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-(--app-surface) p-3 rounded-2xl border border-(--app-border) shadow-depth-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block">القوة الإجمالية</span>
            <span className="text-lg font-black font-mono text-(--app-foreground)">{summary.total}</span>
          </div>
          <Users className="w-5 h-5 text-(--color-primary)" />
        </div>

        <div className="bg-(--app-surface) p-3 rounded-2xl border border-(--app-border) shadow-depth-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block">الموجود الفعلي</span>
            <span className="text-lg font-black font-mono text-(--color-primary)">{summary.present}</span>
          </div>
          <UserCheck className="w-5 h-5 text-(--color-primary)" />
        </div>

        <div className="bg-(--app-surface) p-3 rounded-2xl border border-(--app-border) shadow-depth-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block">خوارج رسمية وطبية</span>
            <span className="text-lg font-black font-mono text-(--app-foreground)">{summary.official}</span>
          </div>
          <Calendar className="w-5 h-5 text-(--color-primary)" />
        </div>

        <div className="bg-(--app-surface) p-3 rounded-2xl border border-(--app-border) shadow-depth-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-(--app-muted-foreground) block">خوارج انضباطية (حبس/غياب)</span>
            <span className="text-lg font-black font-mono text-(--color-primary)">{summary.disciplinary}</span>
          </div>
          <ShieldAlert className="w-5 h-5 text-(--color-primary)" />
        </div>
      </div>

      {/* Bulk Action Bar (when not read-only) */}
      {!isReadOnly && canEdit && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-(--app-surface-container) px-4 py-2.5 rounded-2xl border border-(--app-border)">
          <div className="flex items-center gap-2 text-xs font-bold text-(--app-foreground)">
            <span>المحدد:</span>
            <span className="font-mono text-(--color-primary) font-black">{selectedIds.size}</span>
            <span>طالب</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-56">
              <CustomSelect
                value={bulkStatus}
                onChange={(val) => setBulkStatus(val as StudentAttendanceStatus)}
                options={ROLLCALL_STATUS_OPTIONS}
                placeholder="اختر الحالة..."
                className="!py-1 !text-xs font-bold"
              />
            </div>
            <button
              type="button"
              onClick={applyBulkStatus}
              disabled={selectedIds.size === 0}
              className="btn-primary py-1.5 px-3 text-xs font-bold cursor-pointer disabled:opacity-50"
            >
              تطبيق على المحددين
            </button>
          </div>
        </div>
      )}

      {/* Rollcall MainTable */}
      <MainTable
        columns={columns}
        data={entries}
        showSerialNumber={true}
        isLoading={loading}
        emptyTitle="لا يوجد طلاب مسجلين للتمام في هذا التاريخ"
        emptyDescription="تأكد من وجود طلاب نشطين في المرحلة الحالية المسجلة."
      />

      {/* Hidden Print Container */}
      <div className="hidden">
        <StudentRollcallPrint
          ref={printRef}
          date={selectedDate}
          mrhla={activeStage.mrhla}
          totalStrength={summary.total}
          presentCount={summary.present}
          outOfficialCount={summary.official}
          outDisciplinaryCount={summary.disciplinary}
          entries={entries}
        />
      </div>

      {/* Reopen Rollcall Modal */}
      {showReopenModal && (
        <ModalShell
          title="إعادة فتح تمام الطلبة للتعديل"
          icon={<RotateCcw className="w-4 h-4" />}
          onClose={() => setShowReopenModal(false)}
          overlayClassName="bg-black/40"
          panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 no-scrollbar"
          footer={
            <ModalActions
              mode="action"
              submitText="تأكيد إعادة الفتح"
              submitLoading={saving}
              submitDisabled={saving || (isPastSixAm && !overrideReason.trim())}
              cancelText="إلغاء"
              onCancel={() => setShowReopenModal(false)}
              onConfirm={() => handleSaveRollcall("reopen", overrideReason)}
            />
          }
        >
          <ModalHeaderCard
            icon={<RotateCcw className="w-6 h-6" />}
            title="إعادة فتح التمام المعتمد"
            subtitle={`تاريخ التمام: ${formatDateDisplay(selectedDate)} | ${activeStage.name}`}
          />

          {isPastSixAm && (
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary) flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-(--color-primary)" />
              <div>
                <p>تنبيه إداري:</p>
                <p className="font-normal text-(--app-muted-foreground)">
                  تم تجاوز موعد الإغلاق النهائي (الساعة 06:00 صباحاً). يتطلب إعادة الفتح تصديق مدير النظام وتسجيل السبب الاستثنائي بسجل التدقيق.
                </p>
              </div>
            </div>
          )}

          <ModalSection title="بيانات إعادة الفتح">
            <div className="space-y-1.5">
              <label htmlFor="reopen-reason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                سبب إعادة فتح التمام {isPastSixAm ? "(إلزامي)" : "(اختياري)"}
              </label>
              <textarea
                id="reopen-reason"
                rows={3}
                placeholder="أدخل سبب إعادة فتح التمام..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </ModalSection>
        </ModalShell>
      )}
    </div>
  );
}
