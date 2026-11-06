"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { ModalShell, ModalHeaderCard, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { CustomSelect } from "@/components/ui/custom-select";
import { MapPin, ClipboardList, FileText, Compass, Clock, AlertCircle, Car, Shield } from "lucide-react";

import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import type { OfficerOption } from "@/types";
import { format } from "date-fns";

interface BaseMission {
  id: string;
  officerId: string;
  officerName?: string;
  officerRankLabel?: string;
  officerLabel?: string;
  missionType?: "internal_daily" | "external_multiday";
  title: string;
  description?: string;
  destination?: string;
  linkedFaxId?: string;
  linkedFax?: { _id: string; faxNumber?: string; subject?: string } | string;
  startDate: string | Date;
  endDate?: string | Date | null;
  status: "scheduled" | "active" | "completed" | "cancelled" | "postponed";
  travelOrderNumber?: string;
  transportationMean?: string;
  authorizedWeapons?: string;
}

interface MissionFormProps {
  mission: BaseMission | null;
  officers?: OfficerOption[];
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

function getInitialMissionForm(mission: BaseMission | null) {
  if (mission) {
    const faxId = typeof mission.linkedFax === "object" ? mission.linkedFax?._id : mission.linkedFax;
    const faxNum = typeof mission.linkedFax === "object" ? mission.linkedFax?.faxNumber : undefined;
    return {
      officerId: mission.officerId,
      missionType: mission.missionType || "external_multiday",
      title: mission.title,
      description: mission.description || "",
      destination: mission.destination || "",
      linkedFaxId: mission.linkedFaxId || faxNum || "",
      linkedFax: faxId || "",
      startDate: format(new Date(mission.startDate), "yyyy-MM-dd"),
      endDate: mission.endDate ? format(new Date(mission.endDate), "yyyy-MM-dd") : "",
      status: mission.status,
      travelOrderNumber: mission.travelOrderNumber || "",
      transportationMean: mission.transportationMean || "سيارة تابعة للوحدة",
      authorizedWeapons: mission.authorizedWeapons || "بدون سلاح",
    };
  }

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  return {
    officerId: "",
    missionType: "internal_daily" as "internal_daily" | "external_multiday",
    title: "",
    description: "",
    destination: "",
    linkedFaxId: "",
    linkedFax: "",
    startDate: tomorrowStr,
    endDate: "",
    status: "scheduled" as BaseMission["status"],
    travelOrderNumber: "",
    transportationMean: "سيارة تابعة للوحدة",
    authorizedWeapons: "بدون سلاح",
  };
}

export function MissionForm({ mission, officers, isOpen, onClose, onSave }: MissionFormProps) {
  if (!isOpen) return null;

  return (
    <MissionFormContent
      key={mission?.id ?? "new"}
      mission={mission}
      officers={officers}
      onClose={onClose}
      onSave={onSave}
    />
  );
}

function MissionFormContent({ mission, officers, onClose, onSave }: Omit<MissionFormProps, "isOpen">) {
  const router = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const isEditing = !!mission;

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = format(tomorrow, "yyyy-MM-dd");

  const initialStartDate = mission?.startDate
    ? format(new Date(mission.startDate), "yyyy-MM-dd")
    : tomorrowStr;
  const initialEndDate = mission?.endDate
    ? format(new Date(mission.endDate), "yyyy-MM-dd")
    : "";

  const [form, setForm] = useState(() => getInitialMissionForm(mission));
  const [isExtended, setIsExtended] = useState<boolean>(
    Boolean(
      mission &&
        (mission.missionType === "external_multiday" ||
          (initialEndDate && initialEndDate !== initialStartDate))
    )
  );

  // Read URL query params when adding new mission from a fax
  useEffect(() => {
    if (!isEditing && router) {
      const faxId = router.get("faxId");
      const faxNumber = router.get("faxNumber");
      const subject = router.get("subject");
      const destination = router.get("destination");
      const officerId = router.get("officerId");

      if (faxId || faxNumber || subject || destination || officerId) {
        setForm((prev) => ({
          ...prev,
          linkedFax: faxId || prev.linkedFax,
          linkedFaxId: faxNumber || prev.linkedFaxId,
          title: subject || prev.title,
          destination: destination || prev.destination,
          officerId: officerId || prev.officerId,
        }));
      }
    }
  }, [isEditing, router]);

  // Conflict Checking Engine
  const [conflicts, setConflicts] = useState<Array<{ type: string; severity: "blocking" | "warning"; message: string }>>([]);
  const [hasBlockingConflict, setHasBlockingConflict] = useState(false);

  useEffect(() => {
    if (!form.officerId || !form.startDate) {
      setConflicts([]);
      setHasBlockingConflict(false);
      return;
    }

    const abortController = new AbortController();
    const checkConflict = async () => {
      try {
        const res = await fetch("/api/arkan-harb/missions/check-conflict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: abortController.signal,
          body: JSON.stringify({
            officerId: form.officerId,
            startDate: form.startDate,
            endDate: isExtended ? form.endDate || form.startDate : form.startDate,
            excludeMissionId: mission?.id,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setConflicts(data.conflicts || []);
          setHasBlockingConflict(Boolean(data.hasBlockingConflict));
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.error("Conflict check error:", e);
        }
      }
    };

    const timer = setTimeout(checkConflict, 300);
    return () => {
      clearTimeout(timer);
      abortController.abort();
    };
  }, [form.officerId, form.startDate, form.endDate, isExtended, mission?.id]);

  const currentOfficerDisplay =
    mission?.officerLabel ||
    (mission?.officerRankLabel && mission?.officerName
      ? `${mission.officerRankLabel} / ${mission.officerName}`
      : mission?.officerName);

  const selectedOfficer = officers?.find((o) => (o.id || o._id) === form.officerId);

  const updateField = (key: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setFieldErrors({});

    if (hasBlockingConflict) {
      setError("لا يمكن تسجيل المأمورية لوجود تعارض مانع مع إجازة رسمية للضابط.");
      setLoading(false);
      return;
    }

    if (!form.officerId.trim()) {
      setFieldErrors({ officerId: "يرجى تحديد الضابط المعني" });
      setLoading(false);
      return;
    }
    if (!form.title.trim()) {
      setFieldErrors({ title: "عنوان المأمورية مطلوب" });
      setLoading(false);
      return;
    }

    if (isExtended && form.endDate && form.startDate && new Date(form.endDate) < new Date(form.startDate)) {
      setFieldErrors({ endDate: "تاريخ الانتهاء يجب أن يكون بعد أو يساوي تاريخ البداية" });
      setLoading(false);
      return;
    }

    try {
      const url = isEditing 
        ? `/api/arkan-harb/missions/${mission.id}` 
        : "/api/arkan-harb/missions";
      
      const method = isEditing ? "PATCH" : "POST";

      const payload = {
        ...form,
        missionType: isExtended ? "external_multiday" : form.missionType,
        endDate: isExtended ? form.endDate : "",
      };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data.details && Array.isArray(data.details)) {
          const errs: Record<string, string> = {};
          data.details.forEach((d: { field?: string; message?: string }) => {
            if (d.field) errs[d.field] = d.message || "بيان غير صالح";
          });
          setFieldErrors(errs);
        }
        const errorMsg = extractApiError(data, "فشل حفظ المأمورية");
        throw new Error(errorMsg);
      }

      showToast(isEditing ? "تم تحديث المأمورية بنجاح" : "تم تسجيل المأمورية بنجاح", "success");
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions 
      form="mission-form"
      submitText={isEditing ? "تحديث المهمة" : "تسجيل المهمة / المأمورية"}
      submitLoading={loading}
      submitDisabled={hasBlockingConflict}
      cancelText="إلغاء"
      onCancel={onClose}
    />
  );

  return (
    <ModalShell
      title={isEditing ? "تعديل المأمورية / الدورة / السفرية" : "تسجيل مأمورية أو فرقة أو دورة أو سفرية"}
      icon={<ClipboardList className="w-4 h-4" />}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 sm:p-6 space-y-4 text-right no-scrollbar"
      onClose={onClose}
      footer={footer}
    >
      <form id="mission-form" onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Top Header Card when Editing */}
        {isEditing && (
          <ModalHeaderCard
            icon={<Compass className="w-6 h-6" />}
            title={mission.title}
            subtitle={
              <div className="space-y-0.5 mt-1">
                <p className="text-xs font-bold text-(--app-muted-foreground)">
                  الضابط المكلف: <span className="text-(--color-primary) font-extrabold">{currentOfficerDisplay}</span>
                </p>
              </div>
            }
            badge={
              mission.destination ? (
                <ModalBadge icon={<MapPin className="w-3.5 h-3.5" />}>
                  {mission.destination}
                </ModalBadge>
              ) : undefined
            }
          />
        )}

        <div className="space-y-4">
          {/* Officer ID Selection (only when creating new mission) */}
          {!isEditing && (
            <div className="space-y-1.5">
              <FormLabel htmlFor="officerId" required>الضابط المعني الرئيسي</FormLabel>
              {officers && officers.length > 0 ? (
                <CustomSelect
                  id="officerId"
                  value={form.officerId}
                  onChange={(val) => updateField("officerId", val)}
                  required
                  placeholder="اختر ضابط من القائمة..."
                  options={officers.map((o) => ({
                    value: o.id,
                    label: o.officerLabel || (o.rank ? `${o.rank} / ${o.fullName}` : o.fullName),
                    badge: o.operationalStatus,
                  }))}
                  error={fieldErrors.officerId}
                />
              ) : (
                <FormInput
                  id="officerId"
                  type="text"
                  required
                  placeholder="أدخل معرف الضابط..."
                  value={form.officerId}
                  onChange={(e) => updateField("officerId", e.target.value)}
                  className={fieldErrors.officerId ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
                />
              )}
              {fieldErrors.officerId && (
                <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.officerId}</p>
              )}

              {/* Operational Status Warning Banner for Selected Officer */}
              {selectedOfficer?.operationalStatus && (
                <div className="p-3 mt-2 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center justify-between gap-2.5 transition-all">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-(--color-primary) shrink-0" />
                    <p className="text-xs font-bold text-(--color-primary)">
                      تنبيه: السيد الضابط مسجل حالياً بالتمام والعمليات اليومية.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-xs font-black shrink-0">
                    {selectedOfficer.operationalStatus}
                  </span>
                </div>
              )}

              {/* Conflict Alerts Card */}
              {conflicts.length > 0 && (
                <div className="space-y-2 mt-2">
                  {conflicts.map((c, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-bold transition-all ${
                        c.severity === "blocking"
                          ? "bg-red-500/10 border-red-500/20 text-red-600"
                          : "bg-(--color-primary)/5 border-(--color-primary)/20 text-(--color-primary)"
                      }`}
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div className="space-y-0.5 text-right">
                        <p className="font-black">
                          {c.severity === "blocking" ? "تعارض يمنع التسجيل:" : "تنبيه عملياتي:"}
                        </p>
                        <p className="font-semibold leading-relaxed">{c.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mission Category Type Selector */}
          <div className="space-y-1.5">
            <FormLabel>تصنيف نوع التكليف / المأمورية</FormLabel>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-(--app-surface-container) rounded-xl border border-(--app-border)">
              <button
                type="button"
                onClick={() => {
                  setIsExtended(false);
                  updateField("missionType", "internal_daily");
                  updateField("endDate", "");
                }}
                className={`py-2 px-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  !isExtended && form.missionType === "internal_daily"
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm border border-(--app-border) font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary) border border-transparent"
                }`}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">مأمورية يومية</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExtended(true);
                  updateField("missionType", "external_multiday");
                  if (!form.endDate) updateField("endDate", form.startDate);
                }}
                className={`py-2 px-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isExtended && !form.title.includes("فرقة") && !form.title.includes("دورة") && !form.title.includes("سفر")
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm border border-(--app-border) font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary) border border-transparent"
                }`}
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">مأمورية خارجية</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExtended(true);
                  updateField("missionType", "external_multiday");
                  if (!form.title || (!form.title.includes("فرقة") && !form.title.includes("دورة"))) {
                    updateField("title", "فرقة ");
                  }
                  if (!form.endDate) updateField("endDate", form.startDate);
                }}
                className={`py-2 px-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isExtended && (form.title.includes("فرقة") || form.title.includes("دورة"))
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm border border-(--app-border) font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary) border border-transparent"
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">فرقة / دورة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExtended(true);
                  updateField("missionType", "external_multiday");
                  if (!form.title || !form.title.includes("سفر")) {
                    updateField("title", "سفرية للخارج - ");
                  }
                  if (!form.endDate) updateField("endDate", form.startDate);
                }}
                className={`py-2 px-2.5 text-xs font-extrabold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isExtended && form.title.includes("سفر")
                    ? "bg-(--app-surface) text-(--color-primary) shadow-sm border border-(--app-border) font-black"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary) border border-transparent"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">سفر للخارج</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="title" required>
              {form.title.includes("سفر")
                ? "موضوع وجهة السفرية للخارج"
                : form.title.includes("فرقة") || form.title.includes("دورة")
                ? "اسم الفرقة التعليمية / التدريبية أو الدورة"
                : "عنوان وموضوع المأمورية"}
            </FormLabel>
            <FormInput
              id="title"
              type="text"
              required
              placeholder={
                form.title.includes("سفر")
                  ? "مثال: سفرية للخارج - مأمورية تدريب مشترك / تمثيل رسمي..."
                  : form.title.includes("فرقة") || form.title.includes("دورة")
                  ? "مثال: فرقة قادة سرايا، دورة لغات تخصصية..."
                  : "مثال: مأمورية تفتيش، مأمورية تدريب خارجية..."
              }
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              className={fieldErrors.title ? "border-(--app-error) ring-1 ring-(--app-error)/30 bg-red-500/5" : ""}
            />
            {fieldErrors.title && (
              <p className="text-xs font-bold text-(--app-error) mt-1">{fieldErrors.title}</p>
            )}
          </div>

          {/* Date Fields */}
          {!isExtended ? (
            <DateField
              id="startDate"
              label="تاريخ المأمورية"
              value={form.startDate}
              onChange={(v) => {
                updateField("startDate", v);
                updateField("endDate", "");
              }}
              error={fieldErrors.startDate}
              required
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <DateField
                id="startDate"
                label={form.title.includes("سفر") ? "تاريخ السفر" : "تاريخ البداية"}
                value={form.startDate}
                onChange={(v) => updateField("startDate", v)}
                error={fieldErrors.startDate}
                required
              />
              <DateField
                id="endDate"
                label={form.title.includes("سفر") ? "تاريخ العودة المتوقع" : "تاريخ الانتهاء المتوقع"}
                value={form.endDate}
                onChange={(v) => updateField("endDate", v)}
                error={fieldErrors.endDate}
                required
              />
            </div>
          )}

          {/* Destination */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="destination">
              {form.title.includes("سفر")
                ? "الدولة / وجهة السفر للخارج"
                : form.title.includes("فرقة") || form.title.includes("دورة")
                ? "معهد / مركز التدريب أو الجهة المنعقد بها"
                : "الجهة / الوجهة"}
            </FormLabel>
            <div className="relative">
              <FormInput
                id="destination"
                type="text"
                placeholder={
                  form.title.includes("سفر")
                    ? "مثال: الإمارات العربية المتحدة، ألمانيا..."
                    : form.title.includes("فرقة") || form.title.includes("دورة")
                    ? "مثال: معهد ضباط الصيانة، معهد اللغات للقوات المسلحة..."
                    : "مثال: قيادة المنطقة، التجنيد، المحكمة العسكرية..."
                }
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="pr-10"
              />
              <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--app-muted-foreground) pointer-events-none" />
            </div>
          </div>

          {/* Transportation & Authorized Weapons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
            <div className="space-y-1.5">
              <FormLabel htmlFor="transportationMean">وسيلة الانتقال</FormLabel>
              <div className="relative">
                <FormInput
                  id="transportationMean"
                  type="text"
                  placeholder="مثال: سيارة تابعة للوحدة، قطار..."
                  value={form.transportationMean}
                  onChange={(e) => updateField("transportationMean", e.target.value)}
                  className="pr-10"
                />
                <Car className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--app-muted-foreground) pointer-events-none" />
              </div>
            </div>

            <div className="space-y-1.5">
              <FormLabel htmlFor="authorizedWeapons">السلاح المصرح بحمله</FormLabel>
              <div className="relative">
                <FormInput
                  id="authorizedWeapons"
                  type="text"
                  placeholder="مثال: بدون سلاح، طبنجة حلوان عهدة..."
                  value={form.authorizedWeapons}
                  onChange={(e) => updateField("authorizedWeapons", e.target.value)}
                  className="pr-10"
                />
                <Shield className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--app-muted-foreground) pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Travel Order Number */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="travelOrderNumber">رقم أمر التحرك العسكري (اختياري)</FormLabel>
            <FormInput
              id="travelOrderNumber"
              type="text"
              placeholder="يُترك فارغاً للتوليد التلقائي (مثال: ت ح / 2026 / 142)"
              value={form.travelOrderNumber}
              onChange={(e) => updateField("travelOrderNumber", e.target.value)}
            />
          </div>

          {/* Linked Fax */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="linkedFaxId">الفاكس أو الخطاب المرجعي (اختياري)</FormLabel>
            <div className="relative">
              <FormInput
                id="linkedFaxId"
                type="text"
                placeholder="رقم الفاكس الإداري أو المكاتبة المرجعية..."
                value={form.linkedFaxId}
                onChange={(e) => updateField("linkedFaxId", e.target.value)}
                className="pr-10"
              />
              <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--app-muted-foreground) pointer-events-none" />
            </div>
            {form.linkedFax && (
              <div className="p-2.5 mt-1.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center justify-between text-xs font-bold text-(--color-primary)">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>مرتبط بفاكس رسمي وارد في المنظومة</span>
                </div>
                <span className="font-mono text-xs font-black">{form.linkedFaxId || "معتمد"}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <FormLabel htmlFor="description">ملاحظات والتفاصيل</FormLabel>
            <FormTextarea
              id="description"
              placeholder="أي تفاصيل أو مهام خاصة بالمأمورية أو الفرقة أو السفرية..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

