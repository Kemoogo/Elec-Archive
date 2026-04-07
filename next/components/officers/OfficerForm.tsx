"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Save, X, AlertCircle, Search, ArrowRight, FileText, Trash2 } from "lucide-react";

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
}

interface OfficerFormEditProps {
  mode: "edit";
  initialValues: OfficerInitialValues;
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
    joinDate: initial?.joinDate ? initial.joinDate.split("T")[0] : "",
    birthDate: initial?.birthDate ? initial.birthDate.split("T")[0] : "",
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
      // استخراج الرقم الأساسي لاستخدامه كرقم عسكري مقترح في حال كان الأقدمية مجرد رقم
      const baseMatch = seniorityInput.trim().match(/^(\d+)/);
      const suggestedMilId = baseMatch ? baseMatch[1] : "";

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

      const url = isEdit ? `/api/officers/${initial!.id}` : "/api/officers";
      const method = isEdit ? "PATCH" : "POST";

      const body: Record<string, string> = {
        fullName: form.fullName,
        rank: form.rank,
        unit: form.unit,
        position: form.position,
        batch: form.batch,
        type: form.type,
        weapon: form.weapon,
        phone: form.phone,
        nationalId: form.nationalId,
        birthDate: form.birthDate,
        file121Url: fileUrl,
      };

      if (!isEdit) {
        body.militaryId = form.militaryId;
        body.seniorityNumber = form.seniorityNumber;
        body.joinDate = form.joinDate;
        body.employmentStatus = form.employmentStatus;
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
        setError(data.error || `فشل في ${isEdit ? "تحديث" : "إنشاء"} الضابط`);
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
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={isEdit ? "btn-secondary" : "btn-primary"}
      >
        {isEdit ? (
          <>تعديل البيانات</>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            إضافة ضابط
          </>
        )}
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="max-h-[85vh] w-full max-w-xl overflow-hidden rounded-xl bg-(--app-surface) border border-(--app-border) shadow-depth-xl flex flex-col" dir="rtl">
        <div className="px-6 py-4 border-b border-(--app-border) flex items-center justify-between">
          <h2 className="text-base font-semibold text-(--color-primary)">
            {modalTitle}
          </h2>
          <button onClick={resetAndClose} className="p-1 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-(--app-error)/10 border border-(--app-error)/20 p-3 text-(--app-error) flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Step 1: Seniority check */}
          {!isEdit && step === "seniority" && (
            <div className="space-y-4">
              <div>
                <label htmlFor="seniority-input" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">رقم الأقدمية *</label>
                <input
                  id="seniority-input"
                  type="text"
                  value={seniorityInput}
                  onChange={(e) => setSeniorityInput(e.target.value)}
                  placeholder="أدخل رقم الأقدمية"
                  className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2.5 text-sm text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:placeholder-transparent transition"
                  onKeyDown={(e) => e.key === "Enter" && handleSeniorityCheck()}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSeniorityCheck}
                  disabled={loading || !seniorityInput.trim()}
                  className="btn-primary flex-1 justify-center"
                >
                  {loading ? "جاري التحقق..." : <><Search className="w-4 h-4" /> تحقق ومتابعة</>}
                </button>
                <button onClick={resetAndClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
              </div>
            </div>
          )}

          {/* Step 2: Returning officer */}
          {!isEdit && step === "returning" && existingOfficer && (
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-4">
                <p className="text-sm text-amber-800 dark:text-amber-200 font-medium mb-2">
                  تم العثور على ضابط سابق
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    {existingOfficer.fullName}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
                    {RANK_OPTIONS.find((r) => r.value === existingOfficer.rank)?.label ?? existingOfficer.rank}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="return-date" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">تاريخ العودة *</label>
                  <input
                    id="return-date"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    required
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  />
                </div>
                <div>
                  <label htmlFor="return-reason" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">سبب العودة *</label>
                  <select
                    id="return-reason"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  >
                    {RETURN_REASON_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleReturningProceed} disabled={!returnDate} className="btn-primary flex-1 justify-center">
                  <ArrowRight className="w-4 h-4" /> تحميل البيانات والمتابعة
                </button>
                <button onClick={resetAndClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
              </div>
            </div>
          )}

          {/* Step 3: Form (create or edit) */}
          {(isEdit || step === "form") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="officer-militaryId" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الرقم العسكري *</label>
                  <input
                    id="officer-militaryId"
                    type="text"
                    placeholder="أدخل الرقم العسكري"
                    value={form.militaryId}
                    onChange={(e) => setForm({ ...form, militaryId: e.target.value })}
                    required
                    disabled={isEdit}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary) focus:placeholder-transparent disabled:opacity-50 transition text-right tracking-widest"
                  />
                </div>
                <div>
                  <label htmlFor="officer-seniority" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">رقم الأقدمية *</label>
                  <input
                    id="officer-seniority"
                    type="text"
                    value={form.seniorityNumber}
                    disabled
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface-container) px-3 py-2 text-sm text-(--color-primary) opacity-60 transition font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="officer-fullName" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الاسم الكامل *</label>
                  <input
                    id="officer-fullName"
                    type="text"
                    value={form.fullName}
                    onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    required
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  />
                </div>
                <div>
                  <label htmlFor="officer-rank" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الرتبة *</label>
                  <select
                    id="officer-rank"
                    value={form.rank}
                    onChange={(e) => setForm({ ...form, rank: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  >
                    {RANK_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="officer-batch" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الدفعة</label>
                  <input
                    id="officer-batch"
                    type="text"
                    value={form.batch}
                    onChange={(e) => setForm({ ...form, batch: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="officer-type" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">النوع</label>
                  <select
                    id="officer-type"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  >
                    <option value="">—</option>
                    {TYPE_OPTIONS.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="officer-weapon" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">السلاح</label>
                  <select
                    id="officer-weapon"
                    value={form.weapon}
                    onChange={(e) => setForm({ ...form, weapon: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  >
                    <option value="">—</option>
                    {WEAPON_OPTIONS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="officer-unit" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الوحدة *</label>
                  <input
                    id="officer-unit"
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    required
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="officer-position" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">المنصب الوظيفي *</label>
                <input
                  id="officer-position"
                  type="text"
                  value={form.position}
                  onChange={(e) => setForm({ ...form, position: e.target.value })}
                  required
                  className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="officer-phone" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">رقم الهاتف</label>
                  <input
                    id="officer-phone"
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="officer-nationalId" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">الرقم القومي</label>
                  <input
                    id="officer-nationalId"
                    type="text"
                    value={form.nationalId}
                    onChange={(e) => setForm({ ...form, nationalId: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition font-mono"
                  />
                </div>
              </div>

              {isEdit && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">حالة الضابط</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["active", "inactive", "retired"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setForm({ ...form, employmentStatus: s })}
                        className={`py-2 rounded-lg text-xs font-bold border transition-all ${form.employmentStatus === s
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

              <div className="grid grid-cols-2 gap-4">
                {(!isEdit || form.joinDate) && (
                  <div>
                    <label htmlFor="officer-joinDate" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">{isEdit ? "تاريخ الالتحاق" : "تاريخ الالتحاق *"}</label>
                    <input
                      id="officer-joinDate"
                      type="date"
                      value={form.joinDate}
                      onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                      required={!isEdit}
                      disabled={isEdit}
                      className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) disabled:opacity-50 transition"
                    />
                  </div>
                )}
                <div>
                  <label htmlFor="officer-birthDate" className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">تاريخ الميلاد</label>
                  <input
                    id="officer-birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
                  />
                </div>
              </div>

              {/* File 121 */}
              <div>
                <label className="mb-1 block text-xs font-medium text-(--app-muted-foreground)">ملف 121 (PDF)</label>
                {form.file121Url && !file121 ? (
                  <div className="flex items-center gap-3 rounded-lg bg-(--app-surface-container) border border-(--app-border) p-3">
                    <FileText className="w-4 h-4 text-(--color-primary) shrink-0" />
                    <span className="text-sm text-(--color-primary) flex-1 truncate">تم رفع ملف 121</span>
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
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setFile121(e.target.files?.[0] ?? null)}
                    className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-(--color-primary) file:text-(--app-white) transition"
                  />
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-(--app-border)">
                <button type="submit" disabled={loading || uploadingFile} className="btn-primary flex-1 justify-center">
                  {loading || uploadingFile ? "جاري الحفظ..." : <><Save className="w-4 h-4" /> حفظ</>}
                </button>
                <button type="button" onClick={resetAndClose} className="btn-secondary flex-1 justify-center">إلغاء</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
