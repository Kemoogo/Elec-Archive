"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Calendar,
  Upload,
  FileText,
  X,
} from "lucide-react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { DateField } from "@/components/ui/date-field";
import { DaysInput } from "@/components/ui/days-input";
import { FormLabel, FormTextarea } from "@/components/ui/form-fields";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import {
  LEAVE_TYPE_LABELS,
  LEAVE_TYPE_DEFAULT_DAYS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  type LeaveType,
  type OfficerLeaveSystem,
} from "@/lib/db/models/Leave.shared";
import type { OfficerOption } from "@/lib/db/models/Officer.shared";
export type { OfficerOption };

interface LeaveRequestModalProps {
  officers: OfficerOption[];
  preselectedOfficerId?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

/** أنواع طلبات الإجازة المتاحة للتقديم */
const ALL_REQUEST_TYPES: LeaveType[] = [
  "field",
  "weekly_rest",
  "casual",
  "annual",
  "permission",
  "medical",
  "rest",
];

function formatISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseDateParts(dateStr: string): { year: number; month: number; day: number } | null {
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
  };
}

function calculateDiffDays(startDateStr: string, endDateStr: string): number {
  const sParts = parseDateParts(startDateStr);
  const eParts = parseDateParts(endDateStr);
  if (!sParts || !eParts) return 1;

  const s = new Date(sParts.year, sParts.month - 1, sParts.day);
  const e = new Date(eParts.year, eParts.month - 1, eParts.day);
  const diffMs = e.getTime() - s.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

function calculateEndDate(startDate: string, type: LeaveType): string {
  const days = LEAVE_TYPE_DEFAULT_DAYS[type] || 1;
  const parts = parseDateParts(startDate);
  if (!parts) return startDate;
  const start = new Date(parts.year, parts.month - 1, parts.day);
  start.setDate(start.getDate() + (days - 1));
  return formatISODate(start);
}

function getSmartDefaultType(officer?: OfficerOption): LeaveType {
  const sys = officer?.defaultLeaveSystem;
  if (sys === "daily_sleep") return "weekly_rest";
  if (sys === "weekly_rest") return "weekly_rest";
  return "field";
}

export function LeaveRequestModal({
  officers,
  preselectedOfficerId,
  isOpen = true,
  onClose,
}: LeaveRequestModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [medicalFile, setMedicalFile] = useState<File | null>(null);

    const getTomorrowDate = () => {
      const tom = new Date();
      tom.setDate(tom.getDate() + 1);
      return formatISODate(tom);
    };

    const initialStartDate = getTomorrowDate();
    const initialType: LeaveType = "field";
    const initialEndDate = calculateEndDate(initialStartDate, initialType);

    interface LeaveFormState {
      officerId: string;
      category: "leave";
      type: LeaveType;
      startDate: string;
      endDate: string;
      lastReturnDate: string;
      presenceDurationDays: number;
      actingOfficerId: string;
      isActingOfficerPresentConfirmed: boolean;
      reason: string;
    }

    const [form, setForm] = useState<LeaveFormState>({
      officerId: preselectedOfficerId || "",
      category: "leave",
      type: initialType,
      startDate: initialStartDate,
      endDate: initialEndDate,
      lastReturnDate: "",
      presenceDurationDays: 0,
      actingOfficerId: "",
      isActingOfficerPresentConfirmed: false,
      reason: "",
    });

    const [leaveDays, setLeaveDays] = useState(() => calculateDiffDays(initialStartDate, initialEndDate));

    // Sync leaveDays whenever startDate or endDate changes
    useEffect(() => {
      setLeaveDays(calculateDiffDays(form.startDate, form.endDate));
    }, [form.startDate, form.endDate]);

    useEffect(() => {
      if (preselectedOfficerId) {
        const off = officers.find((o) => o.id === preselectedOfficerId);
        const defType = getSmartDefaultType(off);
        const tom = getTomorrowDate();
        setForm((prev) => ({
          ...prev,
          officerId: preselectedOfficerId,
          type: defType,
          startDate: tom,
          endDate: calculateEndDate(tom, defType),
        }));
      }
    }, [preselectedOfficerId, officers]);

  const officerOptions: CustomSelectOption[] = useMemo(
    () =>
      officers.map((o) => ({
        value: o.id,
        label: o.officerLabel || `${o.rank || ""} / ${o.fullName}`,
        badge: `#${o.militaryId}`,
      })),
    [officers]
  );

  const actingOfficerOptions: CustomSelectOption[] = useMemo(
    () =>
      officers
        .filter((o) => o.id !== form.officerId)
        .map((o) => ({
          value: o.id,
          label: o.officerLabel || `${o.rank || ""} / ${o.fullName}`,
          badge: `#${o.militaryId}`,
        })),
    [officers, form.officerId]
  );

  const currentOfficer = useMemo(() => {
    return officers.find((o) => o.id === form.officerId);
  }, [officers, form.officerId]);

  const officerSystem = currentOfficer?.defaultLeaveSystem as OfficerLeaveSystem | undefined;

  // جميع أنواع الإجازات متاحة للاختيار لكافة الضباط
  const availableRequestTypes = ALL_REQUEST_TYPES;

  const requestTypeOptions: CustomSelectOption[] = useMemo(() => {
    return availableRequestTypes.map((sys) => ({
      value: sys,
      label: sys === "weekly_rest" && officerSystem === "daily_sleep" ? "راحة (مبيت يومي)" : LEAVE_TYPE_LABELS[sys],
    }));
  }, [availableRequestTypes, officerSystem]);

  const isDailySleepRest = officerSystem === "daily_sleep" && form.type === "weekly_rest";
  const isMedical = form.type === "medical";
  const isAutoApproved = isDailySleepRest || isMedical;

  const resetFormState = () => {
    const tom = getTomorrowDate();
    const off = preselectedOfficerId ? officers.find((o) => o.id === preselectedOfficerId) : undefined;
    const defType = off ? getSmartDefaultType(off) : initialType;
    const end = calculateEndDate(tom, defType);
    setForm({
      officerId: preselectedOfficerId || "",
      category: "leave",
      type: defType,
      startDate: tom,
      endDate: end,
      lastReturnDate: "",
      presenceDurationDays: 0,
      actingOfficerId: "",
      isActingOfficerPresentConfirmed: false,
      reason: "",
    });
    setLeaveDays(calculateDiffDays(tom, end));
    setMedicalFile(null);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetFormState();
    if (onClose) onClose();
  };

  const handleOfficerChange = (officerId: string) => {
    const off = officers.find((o) => o.id === officerId);
    const defType = getSmartDefaultType(off);
    setForm((prev) => ({
      ...prev,
      officerId,
      actingOfficerId: prev.actingOfficerId === officerId ? "" : prev.actingOfficerId,
      isActingOfficerPresentConfirmed:
        prev.actingOfficerId === officerId ? false : prev.isActingOfficerPresentConfirmed,
      type: defType,
      endDate: calculateEndDate(prev.startDate, defType),
    }));
    setError("");
  };

  const handleTypeChange = (newType: LeaveType) => {
    setForm((prev) => ({
      ...prev,
      type: newType,
      endDate: calculateEndDate(prev.startDate, newType),
    }));
    if (newType !== "medical") {
      setMedicalFile(null);
    }
    setError("");
  };

  const handleLeaveDaysChange = (days: number) => {
    setLeaveDays(days);
    const parts = parseDateParts(form.startDate);
    if (parts) {
      const start = new Date(parts.year, parts.month - 1, parts.day);
      start.setDate(start.getDate() + (days - 1));
      setForm((prev) => ({ ...prev, endDate: formatISODate(start) }));
    }
  };

  const handleStartDateChange = (newStartDate: string) => {
    setForm((prev) => ({
      ...prev,
      startDate: newStartDate,
      endDate: calculateEndDate(newStartDate, prev.type),
    }));
  };

  const handleEndDateChange = (newEndDate: string) => {
    setForm((prev) => ({
      ...prev,
      endDate: newEndDate,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const allowedExts = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (!allowedExts.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g)$/i)) {
        setError("نوع الملف غير مدعوم. يرجى اختيار ملف PDF أو صورة (PNG, JPG)");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت)");
        return;
      }
      setError("");
      setMedicalFile(file);
    }
  };

  const handleRemoveFile = () => {
    setMedicalFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.officerId) {
      setError("يرجى اختيار الضابط أولاً");
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError("يرجى تحديد تاريخي البداية والنهاية");
      return;
    }
    if (form.type === "medical" && !medicalFile) {
      setError("يجب رفع صورة شيت الإجازة المرضية / الأورنيك الطبي للاعتماد");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("officerId", form.officerId);
      formData.append("category", form.category);
      formData.append("type", form.type);
      formData.append("startDate", form.startDate);
      formData.append("endDate", form.endDate);
      if (form.lastReturnDate) formData.append("lastReturnDate", form.lastReturnDate);
      if (form.presenceDurationDays) formData.append("presenceDurationDays", String(form.presenceDurationDays));
      if (form.actingOfficerId) {
        formData.append("actingOfficerId", form.actingOfficerId);
        formData.append("isActingOfficerPresentConfirmed", String(Boolean(form.isActingOfficerPresentConfirmed)));
      } else {
        formData.append("isActingOfficerPresentConfirmed", "false");
      }
      if (form.reason) formData.append("reason", form.reason);

      if (form.type === "medical" && medicalFile) {
        formData.append("medicalFile", medicalFile);
      }

      const res = await fetch("/api/arkan-harb/leaves", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        const errorMsg = extractApiError(data, "فشل في تقديم طلب الإجازة");
        setError(errorMsg);
        showToast(errorMsg, "error");
        return;
      }

      if (data.data?.isAutoApproved) {
        showToast(
          isMedical
            ? "تم تسجيل الإجازة المرضية المعتمدة وحفظ الشيت بنجاح"
            : "تم تسجيل وتنفيذ الراحة للضابط مباشرة بنجاح",
          "success"
        );
      } else {
        showToast("تم رفع طلب الإجازة بنجاح في انتظار تصديق القائد", "success");
      }

      handleClose();
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال بالخادم");
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic submit button text
  const submitBtnText = loading
    ? "جاري المعالجة..."
    : isAutoApproved
    ? "تسجيل وتنفيذ مباشرة"
    : "رفع الطلب للقائد";

  if (!isOpen) return null;

  return (
    <ModalShell
      title="تقديم طلب إجازة للضابط"
      icon={<Calendar className="w-4 h-4" />}
      onClose={handleClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[92vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText={submitBtnText}
          submitLoading={loading}
          cancelText="إلغاء"
          onCancel={handleClose}
          form="leave-request-form"
        />
      }
    >
      {error && (
        <div className="rounded-xl bg-(--app-error)/10 border border-(--app-error)/20 p-3.5 text-(--app-error) font-bold text-xs text-right whitespace-pre-line leading-relaxed">
          {error}
        </div>
      )}

      <form id="leave-request-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {/* Officer Select */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="req-officerId" className="text-xs font-bold text-(--app-muted-foreground) block mr-1 select-none">
              الضابط المعني <span className="text-(--app-error) mr-1 font-bold">*</span>
            </label>
            {currentOfficer && (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">النظام المسجل:</span>
                <Badge
                  variant="outline"
                  className="bg-(--color-primary)/5 border-(--color-primary)/20 text-(--color-primary) text-[11px] font-bold px-2 py-0.5"
                >
                  {officerSystem ? OFFICER_LEAVE_SYSTEM_LABELS[officerSystem] : "غير محدد"}
                </Badge>
              </div>
            )}
          </div>
          <CustomSelect
            id="req-officerId"
            value={form.officerId}
            onChange={(val) => handleOfficerChange(val)}
            options={officerOptions}
            placeholder="اختر الضابط من القوة..."
            required
            disabled={Boolean(preselectedOfficerId)}
          />
        </div>

        {/* Dynamic Request Type & Days Count Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <CustomSelect
            id="req-type"
            label="نوع الطلب المقدم"
            value={form.type}
            onChange={(val) => handleTypeChange(val as LeaveType)}
            options={requestTypeOptions}
            required
          />

          <DaysInput
            id="req-leaveDays"
            label="عدد أيام الإجازة"
            value={leaveDays}
            onChange={handleLeaveDaysChange}
            min={1}
            max={90}
            required
            disabled={loading}
          />
        </div>

        {/* Medical Sheet Upload Area (When type === 'medical') */}
        {isMedical && (
          <div className="p-4 bg-(--app-surface-container-low) rounded-2xl border border-dashed border-blue-300 dark:border-blue-700/50 space-y-3">
            <div className="flex items-center justify-between">
              <FormLabel htmlFor="req-medicalFile" required className="text-blue-950 dark:text-blue-200">
                صورة شيت الإجازة المرضية / الأورنيك الطبي
              </FormLabel>
              <span className="text-[11px] font-semibold text-(--app-muted-foreground)">
                (مستند PDF أو صورة PNG/JPG)
              </span>
            </div>

            <input
              ref={fileInputRef}
              id="req-medicalFile"
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
            />

            {!medicalFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-5 border border-dashed border-(--app-border) hover:border-(--color-primary) rounded-xl bg-(--app-surface) cursor-pointer transition-all hover:bg-blue-50/40 dark:hover:bg-blue-950/20 group"
              >
                <Upload className="w-6 h-6 text-(--app-muted-foreground) group-hover:text-(--color-primary) group-hover:scale-110 transition-all mb-1.5" />
                <span className="text-xs font-bold text-(--app-foreground)">
                  انقر لاختيار ملف شيت الإجازة المرضية من الجهاز
                </span>
                <span className="text-[10px] text-(--app-muted-foreground) mt-0.5">
                  الحد الأقصى للملف: 10 ميجابايت
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-(--app-surface) border border-(--app-border) rounded-xl">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-(--app-foreground) truncate max-w-xs">
                      {medicalFile.name}
                    </div>
                    <div className="text-[10px] text-(--app-muted-foreground) font-mono">
                      {(medicalFile.size / 1024).toFixed(1)} KB
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="p-1.5 text-(--color-primary) hover:text-(--app-info) hover:bg-(--color-primary)/10 rounded-lg transition-colors cursor-pointer"
                  title="حذف الملف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Dates: Start & End */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DateField
            id="req-startDate"
            label="تاريخ البدء (اليوم أو باكر)"
            value={form.startDate}
            onChange={handleStartDateChange}
            min={formatISODate(new Date())}
            max={getTomorrowDate()}
            required
          />

          <DateField
            id="req-endDate"
            label="تاريخ الانتهاء"
            value={form.endDate}
            onChange={handleEndDateChange}
            min={form.startDate}
            required
          />
        </div>

        {/* Acting Officer & Confirmation Checkbox */}
        <div className="p-4 bg-(--app-surface-container-low) rounded-2xl border border-(--app-border) space-y-3">
          <div className="flex items-center gap-2 text-xs font-black text-(--color-primary)">
            <User className="w-4 h-4" />
            <span>القائم بالأعمال خلال فترة الإجازة</span>
          </div>

          <CustomSelect
            id="req-actingOfficerId"
            label="اسم الضابط القائم بالأعمال"
            value={form.actingOfficerId}
            onChange={(val) =>
              setForm((prev) => ({
                ...prev,
                actingOfficerId: val,
                isActingOfficerPresentConfirmed: Boolean(val),
              }))
            }
            options={actingOfficerOptions}
            placeholder="حدد الضابط البديل..."
          />

          <label
            className={`flex items-center gap-2 pt-1 transition-opacity ${
              form.actingOfficerId ? "cursor-pointer" : "opacity-40 cursor-not-allowed"
            }`}
          >
            <input
              type="checkbox"
              disabled={!form.actingOfficerId}
              checked={Boolean(form.actingOfficerId && form.isActingOfficerPresentConfirmed)}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActingOfficerPresentConfirmed: e.target.checked }))
              }
              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-(--app-border) disabled:cursor-not-allowed"
            />
            <span className="text-xs font-bold text-(--app-foreground)">
              تأكيد أن القائم بالأعمال موجود ومتواجد بالوحدة
            </span>
          </label>
        </div>

        {/* Notes / Reason */}
        <div className="space-y-1.5">
          <FormLabel>ملاحظات إضافية أو مبررات الطلب</FormLabel>
          <FormTextarea
            id="req-reason"
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            rows={2}
            placeholder={
              isMedical
                ? "بيانات التشخيص أو جهة المستشفى العسكري المصدرة للتقرير..."
                : isDailySleepRest
                ? "ملاحظات دورية الراحة..."
                : "اكتب أية تفاصيل تفيد القائد في اتخاذ القرار..."
            }
          />
        </div>
      </form>
    </ModalShell>
  );
}
