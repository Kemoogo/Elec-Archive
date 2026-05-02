"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Save, AlertCircle, Search, ArrowRight, FileText, Trash2, ChevronDown, Edit } from "lucide-react";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";

import { 
  checkSeniorityAction, 
  uploadOfficerFile121Action, 
  deleteOfficerFile121Action,
  saveOfficerAction
} from "@/app/actions/officers";


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
  batch: string;
  type: string;
  weapon: string;
  phone: string;
  nationalId: string;
  isInUnit: boolean;
  joinDate: string;
  birthDate: string;
  file121Url: string;
  isArkanHarb: boolean;
}

interface ExistingOfficer {
  existingId: string;
  fullName: string;
  rank: string;
  militaryId: string;
  isInUnit: boolean;
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

type OfficerFormProps = (OfficerFormCreateProps | OfficerFormEditProps) & {
  highlightIncomplete?: boolean;
};

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
    batch: initial?.batch ?? "",
    type: initial?.type ?? "",
    weapon: initial?.weapon ?? "",
    phone: initial?.phone ?? "",
    nationalId: initial?.nationalId ?? "",
    joinDate: initial?.joinDate ? initial.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
    birthDate: initial?.birthDate ? (typeof initial.birthDate === "string" ? initial.birthDate.split("T")[0] : "") : "",
    isInUnit: initial?.isInUnit ?? true,
    file121Url: initial?.file121Url ?? "",
    isArkanHarb: initial?.isArkanHarb ?? false,
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
      const data = await checkSeniorityAction(seniorityInput.trim());

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
      militaryId: existingOfficer?.militaryId || seniorityInput.trim(),
      fullName: existingOfficer?.fullName || form.fullName,
      rank: existingOfficer?.rank || form.rank,
      isInUnit: true,
      joinDate: returnDate,
    });
    setStep("form");
  };

  const handleFile121Upload = async (): Promise<string | null> => {
    console.log("DEBUG: handleFile121Upload started. file121:", file121?.name, file121?.size, file121?.type);
    if (!file121) return form.file121Url || null;
    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file121);
      if (!initial?.id) {
        formData.append("militaryId", form.militaryId);
      } else {
        formData.append("id", initial.id);
      }
      console.log("DEBUG: Calling uploadOfficerFile121Action...");
      const data = await uploadOfficerFile121Action(formData);
      console.log("DEBUG: uploadOfficerFile121Action returned:", data);
      
      if (data.success && data.data?.fileUrl) {
        return data.data.fileUrl;
      }
      setError(data.error || "فشل رفع ملف 121");
      return null;
    } catch (error) {
      console.error("DEBUG: Exception in handleFile121Upload:", error);
      setError("حدث خطأ في رفع الملف");
      return null;
    } finally {
      setUploadingFile(false);
    }
  };

  const handleDeleteFile121 = async () => {
    if (!initial?.id) return;
    try {
      const data = await deleteOfficerFile121Action(initial.id);
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
        if (uploaded === null) {
          setLoading(false);
          return;
        }
        fileUrl = uploaded ?? "";
      }

      let targetId: string | null = null;
      if (isEdit) {
        targetId = initial!.id;
      } else if (existingOfficer) {
        targetId = existingOfficer.existingId;
      }

       const body: Record<string, unknown> = {
        fullName: form.fullName,
        rank: form.rank,
      };

      if (form.batch) body.batch = form.batch;
      if (form.type) body.type = form.type;
      if (form.weapon) body.weapon = form.weapon;
      if (form.phone) body.phone = form.phone;
      if (form.nationalId) body.nationalId = form.nationalId;
      if (form.birthDate) body.birthDate = form.birthDate;
      if (fileUrl) body.file121Url = fileUrl;
      body.isArkanHarb = form.isArkanHarb;

      if (!isEdit && !existingOfficer) {
        body.militaryId = form.militaryId;
        body.seniorityNumber = form.seniorityNumber;
        body.joinDate = form.joinDate;
        body.isInUnit = true;
      } else if (existingOfficer) {
        body.isInUnit = true;
        body.joinDate = form.joinDate;
      } else {
        body.isInUnit = form.isInUnit;
        if (form.joinDate) body.joinDate = form.joinDate;
      }

      const data = await saveOfficerAction(targetId, body);

       if (!data.success) {
          const details = (data as any).details;
          if (details && Array.isArray(details)) {
            const msgs = details.map((d: { message: string }) => d.message).join("، ");
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
      batch: initial?.batch ?? "",
      type: initial?.type ?? "",
      weapon: initial?.weapon ?? "",
      phone: initial?.phone ?? "",
      nationalId: initial?.nationalId ?? "",
      joinDate: initial?.joinDate ? initial.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
      birthDate: initial?.birthDate ? (typeof initial.birthDate === "string" ? initial.birthDate.split("T")[0] : "") : "",
      isInUnit: initial?.isInUnit ?? true,
      file121Url: initial?.file121Url ?? "",
      isArkanHarb: initial?.isArkanHarb ?? false,
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
      overlayClassName="bg-black/40"
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
              <label htmlFor="seniority-input" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">رقم الأقدمية <span className="text-red-500">*</span></label>
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
                  className="w-full pr-9 pl-3 py-2.5 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 placeholder:text-slate-400 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
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
              <label htmlFor="return-reason" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">سبب العودة *</label>
              <div className="relative">
                <select
                  id="return-reason"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
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
            {/* الرتبة وأركان حرب */}
            <div className="space-y-1.5">
              <label htmlFor="officer-rank" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الرتبة <span className="text-red-500">*</span></label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <select
                    id="officer-rank"
                    value={form.rank}
                    onChange={(e) => setForm({ ...form, rank: e.target.value })}
                    className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none"
                  >
                    {RANK_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                </div>
                
                <div className="flex items-center gap-2 bg-(--app-surface) border border-(--app-border) rounded-xl px-3 py-2 shrink-0 h-[38px]">
                  <label htmlFor="officer-isArkanHarb" className="text-xs font-bold text-slate-500 cursor-pointer whitespace-nowrap">أ ح</label>
                  <input
                    id="officer-isArkanHarb"
                    type="checkbox"
                    checked={form.isArkanHarb}
                    onChange={(e) => setForm({ ...form, isArkanHarb: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* الاسم */}
            <div className="space-y-1.5">
              <label htmlFor="officer-fullName" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الاسم <span className="text-red-500">*</span></label>
              <input
                id="officer-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>



            {/* أقدمية (readonly) */}
            <div className="space-y-1.5">
              <label htmlFor="officer-seniority" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">أقدمية</label>
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
              <label htmlFor="officer-militaryId" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الرقم العسكري</label>
              <input
                id="officer-militaryId"
                type="text"
                value={form.militaryId}
                onChange={(e) => setForm({ ...form, militaryId: e.target.value.replace(/\D/g, '') })}
                disabled={isEdit}
                inputMode="numeric"
                dir="ltr"
                className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all text-right ${
                  props.highlightIncomplete && !form.militaryId ? 'border-amber-400 bg-amber-50' : ''
                }`}
              />
            </div>



            {/* الدفعة */}
            <div className="space-y-1.5">
              <label htmlFor="officer-batch" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الدفعة</label>
              <input
                id="officer-batch"
                type="text"
                value={form.batch}
                onChange={(e) => setForm({ ...form, batch: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                dir="ltr"
                className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right ${
                  props.highlightIncomplete && !form.batch ? 'border-amber-400 bg-amber-50' : ''
                }`}
              />
            </div>

            {/* الهاتف */}
            <div className="space-y-1.5">
              <label htmlFor="officer-phone" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الهاتف</label>
              <input
                id="officer-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })}
                inputMode="numeric"
                dir="ltr"
                className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right ${
                  props.highlightIncomplete && !form.phone ? 'border-amber-400 bg-amber-50' : ''
                }`}
              />
            </div>

            {/* النوع */}
            <div className="space-y-1.5">
              <label htmlFor="officer-type" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">النوع</label>
              <div className="relative">
                <select
                  id="officer-type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none ${
                    props.highlightIncomplete && !form.type ? 'border-amber-400 bg-amber-50' : ''
                  }`}
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
              <label htmlFor="officer-weapon" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">السلاح</label>
              <div className="relative">
                <select
                  id="officer-weapon"
                  value={form.weapon}
                  onChange={(e) => setForm({ ...form, weapon: e.target.value })}
                  className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none ${
                    props.highlightIncomplete && !form.weapon ? 'border-amber-400 bg-amber-50' : ''
                  }`}
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
              <label htmlFor="officer-nationalId" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الرقم القومي</label>
              <input
                id="officer-nationalId"
                type="text"
                value={form.nationalId}
                onChange={(e) => setForm({ ...form, nationalId: e.target.value.replace(/\D/g, '') })}
                maxLength={14}
                inputMode="numeric"
                dir="ltr"
                className={`w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right ${
                  props.highlightIncomplete && !form.nationalId ? 'border-amber-400 bg-amber-50' : ''
                }`}
              />
            </div>



            {/* ملف 121 */}
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">ملف 121 (PDF)</label>
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
                    <div className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-2 border ${
                      props.highlightIncomplete && !form.file121Url && !file121
                        ? 'border-amber-400 bg-amber-50 text-amber-700'
                        : 'bg-(--app-surface-container) border-(--app-border) text-(--color-primary) hover:bg-white/10'
                    }`}>
                      Browse
                    </div>
                  </div>
                  <span className="text-xs font-bold text-(--app-muted-foreground)">ملف 121 (PDF)</span>
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
