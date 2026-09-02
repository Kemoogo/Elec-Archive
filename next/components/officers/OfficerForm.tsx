"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  User,
  Save,
  AlertCircle,
  Search,
  ArrowRight,
  FileText,
  Trash2,
  Edit,
  UploadCloud,
  FileUp,
  Edit3,
  Loader2,
  Sparkles,
} from "lucide-react";
import { FormLabel, FormInput, FormSelect } from "@/components/ui/form-fields";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { ModalActions } from "@/components/ui/modal-actions";
import { ModalShell } from "@/components/ui/modal-shell";
import { DateField } from "@/components/ui/date-field";

import {
  checkSeniorityAction,
  uploadOfficerFile121Action,
  deleteOfficerFile121Action,
  saveOfficerAction,
  parseOfficer121PdfAction,
} from "@/app/actions/officers";
import { createOfficerSchema, patchOfficerSchema } from "@/lib/validations/officers";


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
  graduationDate?: string;
  bloodType?: string;
  religion?: string;
  maritalStatus?: string;
  faculty?: string;
  file121Url: string;
  file121IssueDate?: string;
  isArkanHarb: boolean;
}

interface ExistingOfficer {
  existingId: string;
  fullName: string;
  rank: string;
  militaryId: string;
  isInUnit: boolean;
  employmentStatus?: string;
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

type CreateStep = "mode_select" | "seniority_input" | "returning" | "form";

interface OfficerActionResponse {
  success: boolean;
  error?: string;
  details?: { message: string }[];
  data?: unknown;
}

export function OfficerForm(props: OfficerFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEdit = props.mode === "edit";
  const initial = isEdit ? props.initialValues : null;
  const trigger = props.trigger;

  const [step, setStep] = useState<CreateStep>("mode_select");
  const [seniorityInput, setSeniorityInput] = useState("");
  const [existingOfficer, setExistingOfficer] = useState<ExistingOfficer | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const returnReasonState = useState("rejoining");
  const returnReason = returnReasonState[0];
  const setReturnReason = returnReasonState[1];

  const getCleanEmptyForm = () => ({
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
    graduationDate: initial?.graduationDate ? (typeof initial.graduationDate === "string" ? initial.graduationDate.split("T")[0] : "") : "",
    bloodType: initial?.bloodType ?? "",
    religion: initial?.religion ?? "",
    maritalStatus: initial?.maritalStatus ?? "",
    faculty: initial?.faculty ?? "",
    isInUnit: initial?.isInUnit ?? true,
    file121Url: initial?.file121Url ?? "",
    file121IssueDate: initial?.file121IssueDate ?? "",
    isArkanHarb: initial?.isArkanHarb ?? false,
  });

  const [form, setForm] = useState(getCleanEmptyForm());

  const [file121, setFile121] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [parsingPdf, setParsingPdf] = useState(false);
  const [extractedFieldsCount, setExtractedFieldsCount] = useState<number>(0);
  const [parsedFileName, setParsedFileName] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSeniorityCheck = async () => {
    setFieldErrors({});
    if (!seniorityInput.trim()) {
      setFieldErrors({ seniorityNumber: "رقم الأقدمية مطلوب" });
      setError("رقم الأقدمية مطلوب");
      return;
    }

    if (!/^\d+(?:[A-Za-z\u0600-\u06FF]+\d*)?$/.test(seniorityInput.trim())) {
      setFieldErrors({ seniorityNumber: "رقم الأقدمية غير صالح. يجب أن يبدأ برقم." });
      setError("رقم الأقدمية غير صالح. يجب أن يبدأ برقم.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await checkSeniorityAction(seniorityInput.trim());

      if (data.success) {
        setError("");
        setFile121(null);
        setParsedFileName("");
        setExtractedFieldsCount(0);
        setForm({
          ...getCleanEmptyForm(),
          seniorityNumber: seniorityInput.trim(),
          militaryId: "",
        });
        setStep("form");
      } else if (data.data?.existingId) {
        setExistingOfficer(data.data);
        setStep("returning");
      } else {
        const errorMsg = extractApiError(data as OfficerActionResponse, "حدث خطأ أثناء التحقق");
        setError(errorMsg);
      }
    } catch {
      setError("حدث خطأ في الاتصال بالسيرفر");
    } finally {
      setLoading(false);
    }
  };

  const handlePdfFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("يرجى اختيار ملف PDF فقط بصيغة 121 ش ض");
      return;
    }

    setFile121(file);
    setParsingPdf(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await parseOfficer121PdfAction(formData);

      if (res.success && res.extracted) {
        const ext = res.extracted;
        let count = 0;

        const targetSeniority = ext.seniorityNumber || seniorityInput.trim();
        if (!targetSeniority) {
          setError("تعذر تحديد رقم الأقدمية من الملف. يرجى إدخال رقم الأقدمية يدوياً.");
          setFile121(null);
          return;
        }

        setSeniorityInput(targetSeniority);

        // Check if officer exists or returning
        const senCheck = await checkSeniorityAction(targetSeniority);

        setForm((prev) => {
          const next = { ...prev };
          if (ext.seniorityNumber) { next.seniorityNumber = ext.seniorityNumber; count++; }
          if (ext.militaryId) { next.militaryId = ext.militaryId; count++; }
          if (ext.fullName) { next.fullName = ext.fullName; count++; }
          if (ext.rank) { next.rank = ext.rank; count++; }
          if (ext.batch) { next.batch = ext.batch; count++; }
          if (ext.weapon) { next.weapon = ext.weapon; count++; }
          if (ext.type) { next.type = ext.type; count++; }
          if (ext.nationalId) { next.nationalId = ext.nationalId; count++; }
          if (ext.phone) { next.phone = ext.phone; count++; }
          if (ext.birthDate) { next.birthDate = ext.birthDate; count++; }
          if (ext.graduationDate) { next.graduationDate = ext.graduationDate; count++; }
          if (ext.bloodType) { next.bloodType = ext.bloodType; count++; }
          if (ext.religion) { next.religion = ext.religion; count++; }
          if (ext.maritalStatus) { next.maritalStatus = ext.maritalStatus; count++; }
          if (ext.faculty) { next.faculty = ext.faculty; count++; }
          if (ext.file121IssueDate) { next.file121IssueDate = ext.file121IssueDate; }
          if (ext.isArkanHarb !== undefined) { next.isArkanHarb = ext.isArkanHarb; count++; }
          return next;
        });

        setExtractedFieldsCount(count);
        setParsedFileName(file.name);

        if (!senCheck.success && senCheck.data?.existingId) {
          setExistingOfficer(senCheck.data);
          showToast(`تم التعرف على وثيقة ضابط سابق بالوحدة (أقدمية #${targetSeniority}). يرجى تحديد تاريخ العودة.`, "info");
          setStep("returning");
        } else {
          showToast(`تم قراءة الملف وتعبئة ${count} حقول آلياً للأقدمية #${targetSeniority}.`, "success");
          setStep("form");
        }
      } else {
        setFile121(null);
        setError(res.error || "عفواً، الملف المرفوع غير مطابق للنموذج المعتمد (121 ش ض). يرجى التأكد من رفع الملف الأصلي.");
      }
    } catch {
      setFile121(null);
      setError("حدث خطأ أثناء معالجة ملف الـ PDF");
    } finally {
      setParsingPdf(false);
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
      const errMsg = extractApiError(data as OfficerActionResponse, "فشل رفع ملف 121");
      setError(errMsg);
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
        const errMsg = extractApiError(data as OfficerActionResponse, "فشل حذف الملف");
        setError(errMsg);
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
      if (form.graduationDate) body.graduationDate = form.graduationDate;
      if (form.bloodType) body.bloodType = form.bloodType;
      if (form.religion) body.religion = form.religion;
      if (form.maritalStatus) body.maritalStatus = form.maritalStatus;
      if (form.faculty) body.faculty = form.faculty;
      if (fileUrl) body.file121Url = fileUrl;
      if (form.file121IssueDate) body.file121IssueDate = form.file121IssueDate;
      body.isArkanHarb = form.isArkanHarb;

      if (!isEdit && !existingOfficer) {
        body.militaryId = form.militaryId;
        body.seniorityNumber = form.seniorityNumber;
        body.joinDate = form.joinDate;
        body.isInUnit = true;
      } else if (existingOfficer) {
        body.isInUnit = true;
        body.joinDate = form.joinDate;
        const movementActionMap: Record<string, string> = {
          joined: "join",
          rejoining: "join",
          return: "return",
          transfer: "transfer",
        };
        const returnReasonLabel: Record<string, string> = {
          joined: "انضم",
          rejoining: "انضمام",
          return: "عودة",
          transfer: "نقل",
        };
        body.movement = {
          action: movementActionMap[returnReason] || "return",
          date: returnDate || form.joinDate,
          notes: returnReasonLabel[returnReason] || "عودة",
        };
      } else {
        body.isInUnit = form.isInUnit;
        if (form.joinDate) body.joinDate = form.joinDate;
      }

      setFieldErrors({});

      // Client-side Zod validation for instant visual error feedback
      const valSchema = isEdit || existingOfficer ? patchOfficerSchema : createOfficerSchema;
      const valResult = valSchema.safeParse(body);
      if (!valResult.success) {
        const errs: Record<string, string> = {};
        const msgs: string[] = [];
        valResult.error.issues.forEach((iss) => {
          if (iss.path && iss.path.length > 0) {
            errs[String(iss.path[0])] = iss.message;
          }
          msgs.push(iss.message);
        });
        setFieldErrors(errs);
        setError(msgs.join("، ") || "يرجى تصحيح البيانات المدخلة والمظللة باللون الأحمر");
        setLoading(false);
        return;
      }

      const data = (await saveOfficerAction(targetId, body)) as OfficerActionResponse;

      if (!data.success) {
        const details = data.details;
        const errs: Record<string, string> = {};
        if (details && Array.isArray(details)) {
          const msgs: string[] = [];
          details.forEach((d: { path?: (string | number)[]; message: string }) => {
            if (d.path && d.path.length > 0) {
              errs[String(d.path[0])] = d.message;
            }
            msgs.push(d.message);
          });
          setFieldErrors(errs);
          setError(msgs.join("، ") || data.error || `فشل في ${isEdit ? "تحديث" : "إنشاء"} الضابط`);
        } else {
          setError(data.error || `فشل في ${isEdit ? "تحديث" : "إنشاء"} الضابط`);
        }
        return;
      }

      showToast(isEdit ? "تم تحديث بيانات الضابط بنجاح" : "تم إضافة الضابط بنجاح", "success");
      setOpen(false);
      setStep("mode_select");
      setSeniorityInput("");
      setExistingOfficer(null);
      setFieldErrors({});
      setError("");
      setReturnDate("");
      setReturnReason("rejoining");
      setFile121(null);
      setParsedFileName("");
      setExtractedFieldsCount(0);
      setForm(getCleanEmptyForm());
      router.refresh();
    } catch {
      setError("حدث خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setOpen(false);
    setStep("mode_select");
    setSeniorityInput("");
    setExistingOfficer(null);
    setError("");
    setFieldErrors({});
    setReturnDate("");
    setReturnReason("rejoining");
    setFile121(null);
    setParsedFileName("");
    setExtractedFieldsCount(0);
    setForm(getCleanEmptyForm());
  };

  const handleOpenModal = () => {
    if (!isEdit) {
      setStep("mode_select");
      setSeniorityInput("");
      setExistingOfficer(null);
      setError("");
      setFieldErrors({});
      setReturnDate("");
      setReturnReason("rejoining");
      setFile121(null);
      setParsedFileName("");
      setExtractedFieldsCount(0);
      setForm(getCleanEmptyForm());
    }
    setOpen(true);
  };

  if (!open) {
    if (trigger) {
      return <div onClick={handleOpenModal} className="inline-block cursor-pointer">{trigger}</div>;
    }
    return (
      <button
        onClick={handleOpenModal}
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
    : step === "mode_select"
      ? "إضافة ضابط — طريقة الإدخال"
      : step === "seniority_input"
        ? "إضافة ضابط — كتابة رقم الأقدمية"
        : step === "returning"
          ? "ضابط عائد"
          : `إضافة ضابط — أقدمية #${seniorityInput}`;
  const officerFormId = isEdit ? "edit-officer-form" : "create-officer-form";
  const modalFooter =
    !isEdit && step === "mode_select" ? (
      <ModalActions className="sm:items-stretch">
        <button type="button" onClick={resetAndClose} className="btn-secondary">
          إلغاء
        </button>
      </ModalActions>
    ) : !isEdit && step === "seniority_input" ? (
      <ModalActions className="sm:items-stretch">
        <button
          type="button"
          onClick={handleSeniorityCheck}
          disabled={loading || !seniorityInput.trim()}
          className="btn-primary"
        >
          {loading ? "جاري التحقق..." : <><Search className="w-4 h-4" /> تحقق ومتابعة</>}
        </button>
        <button
          type="button"
          onClick={() => setStep("mode_select")}
          className="btn-secondary"
        >
          <ArrowRight className="w-4 h-4" /> رجوع
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary">
          إلغاء
        </button>
      </ModalActions>
    ) : !isEdit && step === "returning" && existingOfficer ? (
      <ModalActions className="sm:items-stretch">
        <button type="button" onClick={handleReturningProceed} disabled={!returnDate} className="btn-primary">
          <ArrowRight className="w-4 h-4" /> تحميل البيانات والمتابعة
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary">
          إلغاء
        </button>
      </ModalActions>
    ) : (
      <ModalActions className="sm:items-stretch">
        <button type="submit" form={officerFormId} disabled={loading || uploadingFile} className="btn-primary">
          {loading || uploadingFile ? "جاري الحفظ..." : <><Save className="w-4 h-4" /> حفظ</>}
        </button>
        <button type="button" onClick={resetAndClose} className="btn-secondary">
          إلغاء
        </button>
      </ModalActions>
    );

  return (
    <ModalShell
      title={modalTitle}
      icon={<User className="w-4 h-4" />}
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

      {/* Step 1: Mode Select (Option A: 121 PDF Upload vs Option B: Manual Seniority Input) */}
      {!isEdit && step === "mode_select" && (
        <div className="space-y-6 text-right">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/15 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-extrabold text-(--app-foreground)">
                بدء إضافة ضابط جديد بالوحدة
              </p>
              <p className="text-xs font-bold text-(--app-muted-foreground) mt-0.5">
                اختر طريقة لبدء تعبئة السجل واستخراج البيانات:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option A: PDF Extraction */}
            <div className="group relative border-2 border-dashed border-blue-500/30 hover:border-blue-500 rounded-2xl p-5 bg-(--app-surface) hover:bg-blue-500/5 transition-all duration-200 text-center flex flex-col items-center justify-between space-y-4 shadow-xs hover:shadow-md">
              <div className="p-3.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-110 transition-transform">
                <FileUp className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-(--app-foreground) mb-1">
                  رفع وثيقة 121 ش ض (آلي)
                </h4>
                <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
                  رفع ملف PDF المعتمد من شئون الضباط لفحص الأقدمية واستخراج البيانات آلياً.
                </p>
              </div>

              <label className="w-full cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={handlePdfFileSelect}
                  disabled={parsingPdf}
                />
                <span className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-(--color-primary) text-white font-extrabold text-xs shadow-md hover:bg-(--color-primary-hover) transition-all active:scale-95">
                  {parsingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري القراءة والفحص...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4" />
                      <span>اختيار ملف PDF (121 ش ض)</span>
                    </>
                  )}
                </span>
              </label>
            </div>

            {/* Option B: Manual Entry */}
            <div
              onClick={() => setStep("seniority_input")}
              className="group cursor-pointer border-2 border-(--app-border) hover:border-blue-500 rounded-2xl p-5 bg-(--app-surface) hover:bg-blue-500/5 transition-all duration-200 text-center flex flex-col items-center justify-between space-y-4 shadow-xs hover:shadow-md"
            >
              <div className="p-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Edit3 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-base font-black text-(--app-foreground) mb-1">
                  إدخال رقم الأقدمية يدوياً
                </h4>
                <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
                  كتابة رقم الأقدمية يدوياً وفحصه بالمنظومة للانتقال لنموذج التعبئة.
                </p>
              </div>
              <button
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-(--app-surface-container) hover:bg-(--app-border) text-(--app-foreground) font-extrabold text-xs border border-(--app-border) transition-all active:scale-95 cursor-pointer"
              >
                <span>متابعة بالإدخال اليدوي</span>
                <ArrowRight className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 1.5: Seniority input */}
      {!isEdit && step === "seniority_input" && (
        <div className="space-y-4 text-right">
          <div className="bg-(--app-info)/5 p-4 rounded-2xl border border-(--app-info)/20">
            <div className="space-y-1.5">
              <FormLabel htmlFor="seniority-input" required>رقم الأقدمية</FormLabel>
              <div className="relative">
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <UserPlus className="w-4 h-4 text-(--color-primary)" />
                </div>
                <input
                  id="seniority-input"
                  type="text"
                  value={seniorityInput}
                  onChange={(e) => {
                    setSeniorityInput(e.target.value);
                    if (fieldErrors.seniorityNumber) setFieldErrors((prev) => { const n = { ...prev }; delete n.seniorityNumber; return n; });
                  }}
                  placeholder="أدخل رقم الأقدمية للمتابعة"
                  className={`w-full pl-3 pr-10 py-2.5 bg-(--app-surface) border rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right ${
                    fieldErrors.seniorityNumber
                      ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5'
                      : 'border-(--app-border)'
                  }`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSeniorityCheck();
                    }
                  }}
                />
              </div>
              {fieldErrors.seniorityNumber && (
                <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.seniorityNumber}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Returning officer */}
      {!isEdit && step === "returning" && existingOfficer && (
        <div className="space-y-4">
          <div className="bg-(--app-warning)/10 border border-(--app-warning)/30 p-4 rounded-2xl text-right">
            <div className="flex items-center gap-2 text-(--app-warning) font-bold text-sm mb-2">
              <AlertCircle className="w-5 h-5" />
              <span>تم العثور على ضابط سابق</span>
            </div>
            <p className="text-xs text-(--app-warning) font-bold">
              {RANK_OPTIONS.find((r) => r.value === existingOfficer.rank)?.label ?? existingOfficer.rank} / {existingOfficer.fullName}
            </p>
            <p className="text-[10px] text-(--app-warning) mt-1">
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
              <FormLabel htmlFor="return-reason" required>سبب العودة</FormLabel>
              <FormSelect
                id="return-reason"
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              >
                {RETURN_REASON_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </FormSelect>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Form (create or edit) — CodeGeeX-style compact grid */}
      {(isEdit || step === "form") && (
        <form id={officerFormId} onSubmit={handleSubmit} className="space-y-4">
          {file121 && parsedFileName && (
            <div className="mb-4 rounded-xl bg-blue-500/10 border border-blue-500/20 p-3.5 flex items-center justify-between text-right">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <div>
                  <p className="text-xs font-black text-(--app-foreground)">
                    تم إرفاق وثيقة 121 ش ض: <span className="text-blue-600 dark:text-blue-400" dir="ltr">{parsedFileName}</span>
                  </p>
                  <p className="text-[11px] font-bold text-(--app-muted-foreground) mt-0.5">
                    {extractedFieldsCount > 0
                      ? `تم استخراج وتعبئة ${extractedFieldsCount} حقول تلقائياً. يرجى مراجعة واستكمال بقية البيانات.`
                      : "الملف مرفق ومحفوظ لربطه بالضابط. يرجى استكمال الحقول المطلوبة يدوياً."}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/25 shrink-0">
                {extractedFieldsCount > 0 ? "استخراج آلي" : "مرفق جاهز"}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-right">
            {/* الرتبة وأركان حرب */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-rank" required>الرتبة</FormLabel>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <FormSelect
                    id="officer-rank"
                    value={form.rank}
                    onChange={(e) => updateField("rank", e.target.value)}
                    className={fieldErrors.rank ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
                  >
                    {RANK_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </FormSelect>
                </div>
                
                <div className="flex items-center gap-2 bg-(--app-surface) border border-(--app-border) rounded-xl px-3 py-2 shrink-0 h-[38px]">
                  <label htmlFor="officer-isArkanHarb" className="text-xs font-bold text-(--app-foreground) cursor-pointer whitespace-nowrap">أ ح</label>
                  <input
                    id="officer-isArkanHarb"
                    type="checkbox"
                    checked={form.isArkanHarb}
                    onChange={(e) => updateField("isArkanHarb", e.target.checked)}
                    className="w-4 h-4 rounded border-(--app-border) text-(--app-info) focus:ring-(--app-info) cursor-pointer"
                  />
                </div>
              </div>
              {fieldErrors.rank && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.rank}</p>}
            </div>

            {/* الاسم */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-fullName" required>الاسم</FormLabel>
              <FormInput
                id="officer-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => updateField("fullName", e.target.value)}
                required
                className={fieldErrors.fullName ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.fullName && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.fullName}</p>}
            </div>



            {/* أقدمية (readonly) */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-seniority">أقدمية</FormLabel>
              <FormInput
                id="officer-seniority"
                type="text"
                value={form.seniorityNumber}
                readOnly
                disabled
                className={fieldErrors.seniorityNumber ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.seniorityNumber && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.seniorityNumber}</p>}
            </div>

            {/* الرقم العسكري */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-militaryId">الرقم العسكري</FormLabel>
              <FormInput
                id="officer-militaryId"
                type="text"
                value={form.militaryId}
                onChange={(e) => updateField("militaryId", e.target.value.replace(/\D/g, ''))}
                disabled={isEdit}
                inputMode="numeric"
                dir="ltr"
                className={`${fieldErrors.militaryId ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.militaryId ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              />
              {fieldErrors.militaryId && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.militaryId}</p>}
            </div>



            {/* الدفعة */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-batch">الدفعة</FormLabel>
              <FormInput
                id="officer-batch"
                type="text"
                value={form.batch}
                onChange={(e) => updateField("batch", e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                dir="ltr"
                className={`${fieldErrors.batch ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.batch ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              />
              {fieldErrors.batch && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.batch}</p>}
            </div>

            {/* الهاتف */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-phone">الهاتف</FormLabel>
              <FormInput
                id="officer-phone"
                type="text"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value.replace(/\D/g, ''))}
                inputMode="numeric"
                dir="ltr"
                className={`${fieldErrors.phone ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.phone ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              />
              {fieldErrors.phone && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.phone}</p>}
            </div>

            {/* النوع */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-type">النوع</FormLabel>
              <FormSelect
                id="officer-type"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className={`${fieldErrors.type ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.type ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              >
                <option value="">اختر النوع</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </FormSelect>
              {fieldErrors.type && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.type}</p>}
            </div>

            {/* السلاح */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-weapon">السلاح</FormLabel>
              <FormSelect
                id="officer-weapon"
                value={form.weapon}
                onChange={(e) => updateField("weapon", e.target.value)}
                className={`${fieldErrors.weapon ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.weapon ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              >
                <option value="">اختر السلاح</option>
                {WEAPON_OPTIONS.map((w) => (
                  <option key={w.value} value={w.value}>{w.label}</option>
                ))}
              </FormSelect>
              {fieldErrors.weapon && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.weapon}</p>}
            </div>

            {/* تاريخ الميلاد — custom-date with DD-MM-YYYY auto-format */}
            <DateField
              id="officer-birthDate"
              label="تاريخ الميلاد"
              value={form.birthDate}
              onChange={(v) => updateField("birthDate", v)}
              error={fieldErrors.birthDate}
            />

            {/* تاريخ الانضمام */}
            {(!isEdit || form.joinDate) && (
              <DateField
                id="officer-joinDate"
                label={isEdit ? "تاريخ الالتحاق" : "تاريخ الالتحاق"}
                value={form.joinDate}
                onChange={(v) => updateField("joinDate", v)}
                disabled={isEdit}
                error={fieldErrors.joinDate}
              />
            )}

            {/* الرقم القومي */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-nationalId">الرقم القومي</FormLabel>
              <FormInput
                id="officer-nationalId"
                type="text"
                value={form.nationalId}
                onChange={(e) => updateField("nationalId", e.target.value.replace(/\D/g, ''))}
                maxLength={14}
                inputMode="numeric"
                dir="ltr"
                className={`${fieldErrors.nationalId ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : props.highlightIncomplete && !form.nationalId ? 'border-(--app-warning)/60 bg-(--app-warning)/10' : ''}`}
              />
              {fieldErrors.nationalId && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.nationalId}</p>}
            </div>

            {/* الكلية / المعهد */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-faculty">الكلية / المعهد</FormLabel>
              <FormInput
                id="officer-faculty"
                type="text"
                value={form.faculty}
                onChange={(e) => updateField("faculty", e.target.value)}
                placeholder="مثال: كلية حربية / الفنية العسكرية"
                className={fieldErrors.faculty ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.faculty && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.faculty}</p>}
            </div>

            {/* تاريخ التخرج */}
            <DateField
              id="officer-graduationDate"
              label="تاريخ التخرج"
              value={form.graduationDate}
              onChange={(v) => updateField("graduationDate", v)}
              error={fieldErrors.graduationDate}
            />

            {/* فصيلة الدم */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-bloodType">فصيلة الدم</FormLabel>
              <FormInput
                id="officer-bloodType"
                type="text"
                value={form.bloodType}
                onChange={(e) => updateField("bloodType", e.target.value)}
                placeholder="مثال: O+ / A+"
                dir="ltr"
                className={fieldErrors.bloodType ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.bloodType && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.bloodType}</p>}
            </div>

            {/* الديانة */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-religion">الديانة</FormLabel>
              <FormInput
                id="officer-religion"
                type="text"
                value={form.religion}
                onChange={(e) => updateField("religion", e.target.value)}
                placeholder="مسلم / مسيحي"
                className={fieldErrors.religion ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.religion && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.religion}</p>}
            </div>

            {/* الحالة الاجتماعية */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officer-maritalStatus">الحالة الاجتماعية</FormLabel>
              <FormInput
                id="officer-maritalStatus"
                type="text"
                value={form.maritalStatus}
                onChange={(e) => updateField("maritalStatus", e.target.value)}
                placeholder="أعزب / متزوج"
                className={fieldErrors.maritalStatus ? 'border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5' : ''}
              />
              {fieldErrors.maritalStatus && <p className="text-[11px] font-bold text-(--app-error) mt-1">{fieldErrors.maritalStatus}</p>}
            </div>



            {/* ملف 121 */}
            <div className="col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">ملف 121 (PDF)</label>
              {form.file121Url && !file121 ? (
                <div className="flex items-center gap-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) p-3">
                  <FileText className="w-4 h-4 text-(--color-primary) shrink-0" />
                  <span className="text-sm font-bold text-(--app-foreground) flex-1 truncate">تم رفع ملف 121</span>
                  {isEdit && (
                    <button
                      type="button"
                      onClick={handleDeleteFile121}
                      className="btn-action-danger"
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
                      ? 'border-(--app-warning)/60 bg-(--app-warning)/10 text-(--app-warning)'
                      : 'bg-(--app-surface-container) border-(--app-border) text-(--color-primary) hover:bg-white/10'
                    }`}>
                      Browse
                    </div>
                  </div>
                  <span className="text-xs font-bold text-(--app-muted-foreground)">ملف 121 (PDF)</span>
                  {file121 && (
                    <span className="text-[10px] font-bold text-(--app-muted-foreground) truncate max-w-[200px]" title={file121.name}>
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
