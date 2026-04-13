"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Save, AlertCircle, Search, ArrowRight, FileText, Trash2, Calendar, ChevronDown, Edit } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";

/* ─── Date helpers (DD-MM-YYYY ↔ YYYY-MM-DD) ─── */
function toDisplay(iso: string): string {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : iso;
}
function toISO(display: string): string {
  const m = display.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : display;
}

/* ─── DateField — CodeGeeX-style custom-date with DD-MM-YYYY auto-format + calendar picker ─── */
function DateField({ id, label, value, onChange, disabled, required }: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; disabled?: boolean; required?: boolean;
}) {
  const pickerRef = useRef<HTMLInputElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "").slice(0, 8);
    let formatted = raw;
    if (raw.length > 2) formatted = raw.slice(0, 2) + "-" + raw.slice(2);
    if (raw.length > 4) formatted = formatted.slice(0, 5) + "-" + raw.slice(4, 8);
    // only try to convert to ISO if fully typed
    if (/^\d{2}-\d{2}-\d{4}$/.test(formatted)) {
      onChange(toISO(formatted));
    } else {
      // keep raw for in-progress typing (store display format temporarily)
      onChange(formatted);
    }
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    onChange(e.target.value); // native picker gives YYYY-MM-DD
  };

  return (
    <div className="space-y-1.5 w-full">
      <label htmlFor={id} className="text-xs font-bold text-slate-600 block mr-1">{label}</label>
      <div className="relative">
        <div
          className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer hover:scale-110 active:scale-95 transition-transform"
          onClick={() => pickerRef.current?.showPicker()}
        >
          <Calendar className="w-4 h-4 text-(--color-primary)" />
        </div>
        <input
          id={id}
          type="text"
          placeholder="يوم-شهر-سنة"
          value={toDisplay(value)}
          onChange={handleTextChange}
          maxLength={10}
          disabled={disabled}
          required={required}
          className="w-full pr-9 pl-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right disabled:opacity-70 disabled:cursor-not-allowed"
        />
        <input
          ref={pickerRef}
          type="date"
          className="absolute opacity-0 pointer-events-none w-0 h-0"
          onChange={handlePickerChange}
        />
      </div>
    </div>
  );
}

const RANK_OPTIONS = [
  { value: "second_lieutenant", label: "ملازم" },
  { value: "first_lieutenant", label: "ملازم أول" },
  { value: "captain", label: "نقيب" },
  { value: "major", label: "رائد" },
  { value: "lieutenant_colonel", label: "مقدم" },
  { value: "colonel", label: "عقيد" },
  { value: "brigadier", label: "عميد" },
  { value: "major_general", label: "لواء" },
];

const TYPE_OPTIONS = [
  { value: "worker", label: "عامل" },
  { value: "reserve", label: "احتياط" },
  { value: "university", label: "جامعي" },
  { value: "honorary", label: "شرف" },
  { value: "technical", label: "فني" },
  { value: "engineer", label: "مهندس" },
];

const WEAPON_OPTIONS = [
  { value: "signals", label: "إشارة" },
  { value: "vehicles", label: "مركبات" },
  { value: "armored", label: "مدرعات" },
  { value: "admin_affairs", label: "شئون ادارية" },
  { value: "infantry", label: "مشاه" },
];

const RETURN_REASON_OPTIONS = [
  { value: "joined", label: "انضم" },
  { value: "rejoining", label: "انضمام" },
  { value: "return", label: "عودة" },
  { value: "transfer", label: "نقل" },
];

interface OfficerInitialValues {
  id: string;
  militaryId: string;
  seniorityNumber: string;
  fullName: string;
  rank: string;
  unit: string;
  position: string;
  batch: string;
  type: string;
  weapon: string;
  phone: string;
  nationalId: string;
  employmentStatus: string;
  joinDate: string;
  birthDate: string;
  file121Url: string;
}

interface ExistingOfficer {
  existingId: string;
  fullName: string;
  rank: string;
  employmentStatus: string;
}

interface OfficerFormCreateProps {
  mode: "create";
  initialValues?: never;
  trigger?: React.ReactNode;
}

interface OfficerFormEditProps {
  mode: "edit";
  initialValues: OfficerInitialValues;
  trigger?: React.ReactNode;
}

type OfficerFormProps = OfficerFormCreateProps | OfficerFormEditProps;

type CreateStep = "seniority" | "returning" | "form";

export function OfficerForm(props: OfficerFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initialValues : null;
  const trigger = props.trigger;

  const [step, setStep] = useState<CreateStep>("seniority");
  const [seniorityInput, setSeniorityInput] = useState("");
  const [existingOfficer, setExistingOfficer] = useState<ExistingOfficer | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const returnReasonState = useState("rejoining");
  const returnReason = returnReasonState[0];
  const setReturnReason = returnReasonState[1];

  const [form, setForm] = useState({
    militaryId: initial?.militaryId ?? "",
    seniorityNumber: initial?.seniorityNumber ?? "",
    fullName: initial?.fullName ?? "",
    rank: initial?.rank ?? "second_lieutenant",
    unit: initial?.unit ?? "",
    position: initial?.position ?? "",
    batch: initial?.batch ?? "",
    type: initial?.type ?? "",
    weapon: initial?.weapon ?? "",
    phone: initial?.phone ?? "",
    nationalId: initial?.nationalId ?? "",
    joinDate: initial?.joinDate ? initial.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
    birthDate: initial?.birthDate ? (typeof initial.birthDate === "string" ? initial.birthDate.split("T")[0] : "") : "",
    employmentStatus: initial?.employmentStatus ?? "active",
    file121Url: initial?.file121Url ?? "",
  });

  const [file121, setFile121] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleSeniorityCheck = async () => {
    if (!seniorityInput.trim()) {
      setError("رقم الأقدمية مطلوب");
      return;
    }

    // التحقق من صحة التنسيق قبل الإرسال (اختياري ولكن يفضل)
    if (!/^\d+(?:[A-Za-z\u0600-\u06FF]+\d*)?$/.test(seniorityInput.trim())) {
      setError("رقم الأقدمية غير صالح. يجب أن يبدأ برقم.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/officers/check-seniority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seniorityNumber: seniorityInput.trim() }),
      });

      const data = await res.json();

      if (data.success) {
        setError("");
        // ترك الرقم العسكري فارغاً للإدخال اليدوي كما طلب المستخدم
        setForm({
          ...form,
          seniorityNumber: seniorityInput.trim(),
          militaryId: ""
        });
        setStep("form");
      } else if (data.data?.existingId) {
        setExistingOfficer(data.data);
        setStep("returning");
      } else {
        setError(data.error || "حدث خطأ أثناء التحقق");
      }
    } catch {
      setError("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handleReturningProceed = () => {
    if (!returnDate) {
      setError("تاريخ العودة مطلوب");
      return;
    }
    setError("");
    setForm({
      ...form,
      seniorityNumber: seniorityInput.trim(),
      militaryId: seniorityInput.trim(),
      fullName: existingOfficer?.fullName || form.fullName,
      rank: existingOfficer?.rank || form.rank,
      employmentStatus: "active",
      joinDate: returnDate,
    });
    setStep("form");
  };

  const handleFile121Upload = async (): Promise<string | null> => {
    if (!file121) return form.file121Url || null;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file121);
      const res = await fetch(`/api/officers/${initial?.id ?? "new"}/file121`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.data?.fileUrl) {
        return data.data.fileUrl;
      }
      setError(data.error || "فشل رفع ملف 121");
      return null;
    } catch {
      setError("حدث خطأ في رفع الملف");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile121 = async () => {
    if (!initial?.id) return;
    try {
      const res = await fetch(`/api/officers/${initial.id}/file121`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setForm({ ...form, file121Url: "" });
        setFile121(null);
      } else {
        setError(data.error || "فشل حذف الملف");
      }
    } catch {
      setError("حدث خطأ في الاتصال");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let fileUrl = form.file121Url;
      if (file121) {
        const uploaded = await handleFile121Upload();
        if (uploaded === null && !isEdit) {
          setLoading(false);
          return;
        }
        fileUrl = uploaded ?? "";
      }

      let url = "/api/officers";
      let method = "POST";

      if (isEdit) {
        url = `/api/officers/${initial!.id}`;
        method = "PATCH";
      } else if (existingOfficer) {
        url = `/api/officers/${existingOfficer.existingId}`;
        method = "PATCH";
      }

      const body: Record<string, string> = {
        fullName: form.fullName,
        rank: form.rank,
      };

      if (form.unit) body.unit = form.unit;
      if (form.position) body.position = form.position;
      if (form.batch) body.batch = form.batch;
      if (form.type) body.type = form.type;
      if (form.weapon) body.weapon = form.weapon;
      if (form.phone) body.phone = form.phone;
      if (form.nationalId) body.nationalId = form.nationalId;
      if (form.birthDate) body.birthDate = form.birthDate;
      if (fileUrl) body.file121Url = fileUrl;

      if (!isEdit && !existingOfficer) {
        body.militaryId = form.militaryId;
        body.seniorityNumber = form.seniorityNumber;
        body.joinDate = form.joinDate;
        body.employmentStatus = form.employmentStatus;
      } else if (existingOfficer) {
        body.employmentStatus = "active";
        body.joinDate = form.joinDate;
      } else {
        body.employmentStatus = form.employmentStatus;
        if (form.joinDate) body.joinDate = form.joinDate;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const msgs = data.details.map((d: any) => d.message).join("، ");
          setError(msgs || data.error || `فشل في ${isEdit ? "تحديث" : "إنشاء"} الضابط`);
        } else {
          setError(data.error || `فشل في ${isEdit ? "تحديث" : "إنشاء"} الضابط`);
        }
        return;
      }

      setOpen(false);
      setStep("seniority");
      setSeniorityInput("");
      setExistingOfficer(null);
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("seniority");
    setSeniorityInput("");
    setExistingOfficer(null);
    setError("");
    setReturnDate("");
    setReturnReason("rejoining");
    setFile121(null);
    setForm({
      militaryId: initial?.militaryId ?? "",
      seniorityNumber: initial?.seniorityNumber ?? "",
      fullName: initial?.fullName ?? "",
      rank: initial?.rank ?? "second_lieutenant",
      unit: initial?.unit ?? "",
      position: initial?.position ?? "",
      batch: initial?.batch ?? "",
      type: initial?.type ?? "",
      weapon: initial?.weapon ?? "",
      phone: initial?.phone ?? "",
      nationalId: initial?.nationalId ?? "",
      joinDate: initial?.joinDate ? initial.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
      birthDate: initial?.birthDate ? (typeof initial.birthDate === "string" ? initial.birthDate.split("T")[0] : "") : "",
      employmentStatus: initial?.employmentStatus ?? "active",
      file121Url: initial?.file121Url ?? "",
    });
  };

  if (!open) {
    if (trigger) {
      return <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">{trigger}</div>;
    }
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-primary"
      >
        <>
          {isEdit ? <Edit className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {isEdit ? "تعديل البيانات" : "إضافة ضابط"}
        </>
      </button>
    );
  }

  const modalTitle = isEdit
    ? "تحديث ملف الضابط"
    : step === "seniority"
      ? "إضافة ضابط — رقم الأقدمية"
      : step === "returning"
        ? "ضابط عائد"
        : `إضافة ضابط — أقدمية #${seniorityInput}`;
  const officerFormId = isEdit ? "edit-officer-form" : "create-officer-form";
  const modalFooter =
    !isEdit && step === "seniority" ? (
      <ModalActions className="sm:items-stretch">
        <button
          type="button"
          onClick={handleSeniorityCheck}
          disabled={loading || !seniorityInput.trim()}
          className="btn-primary flex-1 justify-center"
        >
          {loading ? "جاري التحقق..." : <><Search className="w-4 h-4" /> تحقق ومتابعة</>}
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary flex-1 justify-center">
          إلغاء
        </button>
      </ModalActions>
    ) : !isEdit && step === "returning" && existingOfficer ? (
      <ModalActions className="sm:items-stretch">
        <button type="button" onClick={handleReturningProceed} disabled={!returnDate} className="btn-primary flex-1 justify-center">
          <ArrowRight className="w-4 h-4" /> تحميل البيانات والمتابعة
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary flex-1 justify-center">
          إلغاء
        </button>
      </ModalActions>
    ) : (
      <ModalActions className="sm:items-stretch">
        <button type="submit" form={officerFormId} disabled={loading || uploadingFile} className="btn-primary flex-1 justify-center">
          {loading || uploadingFile ? "جاري الحفظ..." : <><Save className="w-4 h-4" /> حفظ</>}
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary flex-1 justify-center">
          إلغاء
        </button>
      </ModalActions>
    );

  return (
    <ModalShell
      title={<span className="text-base font-semibold text-(--color-primary)">{modalTitle}</span>}
      onClose={resetAndClose}
      overlayClassName="bg-black/40 backdrop-blur-sm"
      panelClassName="max-h-[85vh] max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={modalFooter}
    >
      {error && (
        <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-3 text-(--app-error) flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Step 1: Seniority check */}
      {!isEdit && step === "seniority" && (
        <div className="space-y-4">
          <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="space-y-1.5">
              <label htmlFor="seniority-input" className="text-xs font-bold text-slate-600 block mr-1">رقم الأقدمية <span className="text-red-500">*</span></label>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <UserPlus className="w-4 h-4 text-(--color-primary)" />
                </div>
                <input
                  id="seniority-input"
                  type="text"
                  value={seniorityInput}
                  onChange={(e) => setSeniorityInput(e.target.value)}
                  placeholder="أدخل رقم الأقدمية"
                  className="w-full pr-9 pl-3 py-2.5 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                  onKeyDown={(e) => e.key === "Enter" && handleSeniorityCheck()}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Returning officer */}
      {!isEdit && step === "returning" && existingOfficer && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-right">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>تم العثور على ضابط سابق</span>
            </div>
            <p className="text-xs text-amber-700 font-bold">
              {RANK_OPTIONS.find((r) => r.value === existingOfficer.rank)?.label ?? existingOfficer.rank} / {existingOfficer.fullName}
            </p>
            <p className="text-[10px] text-amber-600 mt-1">
              قد سبق وخدم هذا الضابط في الوحدة. أدخل بيانات العودة للمتابعة.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <DateField
              id="return-date"
              label="تاريخ العودة *"
              value={returnDate}
              onChange={setReturnDate}
              required
            />
            <div className="space-y-1.5">
              <label htmlFor="return-reason" className="text-xs font-bold text-slate-600 block mr-1">سبب العودة *</label>
              <div className="relative">
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  {RETURN_REASON_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Form (create or edit) — CodeGeeX-style compact grid */}
      {(isEdit || step === "form") && (
        <form id={officerFormId} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-right">
            {/* الرتبة */}
            <div className="space-y-1.5">
              <label htmlFor="officer-rank" className="text-xs font-bold text-slate-600 block mr-1">الرتبة <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  id="officer-rank"
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  {RANK_OPTIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* الاسم */}
            <div className="space-y-1.5">
              <label htmlFor="officer-fullName" className="text-xs font-bold text-slate-600 block mr-1">الاسم <span className="text-red-500">*</span></label>
              <input
                id="officer-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>

            {/* أقدمية (readonly) */}
            <div className="space-y-1.5">
              <label htmlFor="officer-seniority" className="text-xs font-bold text-slate-600 block mr-1">أقدمية</label>
              <input
                id="officer-seniority"
                type="text"
                value={form.seniorityNumber}
                readOnly
                disabled
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 opacity-70 cursor-not-allowed transition-all text-right"
              />
            </div>

            {/* الرقم العسكري */}
            <div className="space-y-1.5">
              <label htmlFor="officer-militaryId" className="text-xs font-bold text-slate-600 block mr-1">الرقم العسكري</label>
              <input
                id="officer-militaryId"
                type="text"
                value={form.militaryId}
                onChange={(e) => setForm({ ...form, militaryId: e.target.value.replace(/\D/g, '') })}
                disabled={isEdit}
                inputMode="numeric"
                dir="ltr"
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-right"
              />
            </div>

            {/* الدفعة */}
            <div className="space-y-1.5">
              <label htmlFor="officer-batch" className="text-xs font-bold text-slate-600 block mr-1">الدفعة</label>
              <input
                id="officer-batch"
                type="text"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                dir="ltr"
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>

            {/* الهاتف */}
            <div className="space-y-1.5">
              <label htmlFor="officer-phone" className="text-xs font-bold text-slate-600 block mr-1">الهاتف</label>
              <input
                id="officer-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                dir="ltr"
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>

            {/* النوع */}
            <div className="space-y-1.5">
              <label htmlFor="officer-type" className="text-xs font-bold text-slate-600 block mr-1">النوع</label>
              <div className="relative">
                <select
                  id="officer-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">اختر النوع</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* السلاح */}
            <div className="space-y-1.5">
              <label htmlFor="officer-weapon" className="text-xs font-bold text-slate-600 block mr-1">السلاح</label>
              <div className="relative">
                <select
                  id="officer-weapon"
                  value={form.weapon}
                  onChange={(e) => setForm({ ...form, weapon: e.target.value })}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                >
                  <option value="">اختر السلاح</option>
                  {WEAPON_OPTIONS.map((w) => (
                    <option key={w.value} value={w.value}>{w.label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* تاريخ الميلاد — custom-date with DD-MM-YYYY auto-format */}
            <DateField
              id="officer-birthDate"
              label="تاريخ الميلاد"
              value={form.birthDate}
              onChange={(v) => setForm({ ...form, birthDate: v })}
            />

            {/* تاريخ الانضمام */}
            {(!isEdit || form.joinDate) && (
              <DateField
                id="officer-joinDate"
                label={isEdit ? "تاريخ الالتحاق" : "تاريخ الالتحاق"}
                value={form.joinDate}
                onChange={(v) => setForm({ ...form, joinDate: v })}
                disabled={isEdit}
              />
            )}

            {/* الرقم القومي */}
            <div className="space-y-1.5">
              <label htmlFor="officer-nationalId" className="text-xs font-bold text-slate-600 block mr-1">الرقم القومي</label>
              <input
                id="officer-nationalId"
                type="text"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                inputMode="numeric"
                dir="ltr"
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>

            {/* حالة الضابط — edit only */}
            {isEdit && (
              <div className="col-span-2 space-y-1.5">
                <label className="text-xs font-bold text-slate-600 block mr-1">حالة الضابط</label>
                <div className="grid grid-cols-3 gap-2">
                  {["active", "inactive", "retired"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setForm({ ...form, employmentStatus: s })}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all ${form.employmentStatus === s
                        ? "bg-(--color-primary) text-(--app-white) border-(--color-primary)"
                        : "bg-(--app-surface) border-(--app-border) text-(--app-muted-foreground) hover:bg-(--app-surface-container)"
                        }`}
                    >
                      {s === "active" ? "نشط" : s === "inactive" ? "غير نشط" : "متقاعد"}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ملف 121 */}
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 block mr-1">ملف 121 (PDF)</label>
              {form.file121Url && !file121 ? (
                <div className="flex items-center gap-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) p-3">
                  <FileText className="w-4 h-4 text-(--color-primary) shrink-0" />
                  <span className="text-sm font-bold text-slate-500 flex-1 truncate">تم رفع ملف 121</span>
                  {isEdit && (
                    <button
                      type="button"
                      onClick={handleDeleteFile121}
                      className="p-1.5 rounded-md bg-(--app-error)/10 text-(--app-error) hover:bg-(--app-error)/20 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="relative w-fit">
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={(e) => setFile121(e.target.files?.[0] ?? null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <div className="px-4 py-1.5 bg-(--app-surface-container) border border-(--app-border) rounded-lg text-xs font-black text-(--color-primary) hover:bg-white/10 transition-all flex items-center gap-2">
                      Browse
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-600">ملف 121 (PDF)</span>
                  {file121 && (
                    <span className="text-[10px] font-bold text-slate-400 truncate max-w-[200px]" title={file121.name}>
                      {file121.name}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
