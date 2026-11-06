"use client";

import React, { useState, useEffect } from "react";
import {
  Plane,
  UserCheck,
  Shield,
  Activity,
} from "lucide-react";
import { ModalShell, ModalBadge, ModalHeaderCard, ModalSection } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { DateField } from "@/components/ui/date-field";
import {
  type RollcallStatus,
  ROLLCALL_STATUS_LABELS,
} from "@/lib/db/models/DailyRollcall.shared";
import type { RollcallOfficerData } from "./RollcallView";

export interface QuickStatusResult {
  officerId: string;
  status: RollcallStatus;
  note?: string;
  customReason?: string;
  hospitalName?: string;
  hospitalAdmissionDate?: string;
  disciplinaryType?: "prison" | "unit_arrest" | "court";
  disciplinaryAuthority?: string;
  travelDestination?: string;
  travelPurpose?: string;
  statusStartDate?: string;
  statusEndDate?: string;
}

interface QuickStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: RollcallOfficerData | null;
  onSave: (result: QuickStatusResult) => void;
}

const STATUS_OPTIONS: CustomSelectOption[] = [
  {
    value: "present",
    label: "داخل الوحدة (موجود)",
    description: "تواجد طبيعي للضابط داخل الوحدة بمقر عمله",
    badge: "موجود",
  },
  {
    value: "clinic",
    label: "عيادة (موجود)",
    description: "توقيع كشف طبي بالعيادة (يحتسب ضمن قوة الموجودين)",
    badge: "موجود",
  },
  {
    value: "custom_present",
    label: "سبب آخر (موجود داخل الوحدة)",
    description: "تواجد بسبب أو مهمة خاصة داخلية",
    badge: "موجود",
  },
  {
    value: "hospital",
    label: "حجز بمستشفى",
    description: "محجوز بمستشفى عسكري أو مدني لتلقي العلاج",
    badge: "خارج",
  },
  {
    value: "disciplinary_prison",
    label: "سجن حربي (حالة انضباطية)",
    description: "تنفيذ عقوبة بالسجن الحربي",
    badge: "انضباطي",
  },
  {
    value: "disciplinary_arrest",
    label: "حجز بالوحدة (حالة انضباطية)",
    description: "حجز انضباطي داخل الوحدة",
    badge: "انضباطي",
  },
  {
    value: "disciplinary_court",
    label: "محكمة أو نيابة عسكرية",
    description: "حضور جلسة تحقيق أو محاكمة عسكرية",
    badge: "انضباطي",
  },
  {
    value: "travel_abroad",
    label: "سفر للخارج",
    description: "مأمورية أو مهمة أو تدريب خارج البلاد",
    badge: "خارج",
  },
  {
    value: "rest",
    label: "بدل راحة",
    description: "راحة مستحقة نظير نوبتجية أو خدمة سابقة",
    badge: "خارج",
  },
  {
    value: "absent",
    label: "غياب بدون إذن",
    description: "عدم التواجد دون تصريح رسمي أو عذر",
    badge: "خارج",
  },
  {
    value: "custom_out",
    label: "سبب آخر (خارج الوحدة)",
    description: "أي حالة تواجد أخرى خارج مقر الوحدة",
    badge: "خارج",
  },
];

export function QuickStatusModal({
  isOpen,
  onClose,
  officer,
  onSave,
}: QuickStatusModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("present");
  const [note, setNote] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [clinicType, setClinicType] = useState<string>("عيادة الوحدة");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalAdmissionDate, setHospitalAdmissionDate] = useState("");
  const [disciplinaryAuthority, setDisciplinaryAuthority] = useState("");
  const [travelDestination, setTravelDestination] = useState("");
  const [travelPurpose, setTravelPurpose] = useState("");
  const [statusStartDate, setStatusStartDate] = useState("");
  const [statusEndDate, setStatusEndDate] = useState("");

  useEffect(() => {
    if (!officer || !isOpen) return;

    // Map officer's current status into category key
    let cat = officer.status as string;
    if (officer.status === "prison") cat = "disciplinary_prison";
    else if (officer.status === "unit_arrest") cat = "disciplinary_arrest";
    else if (officer.status === "court") cat = "disciplinary_court";
    else if (officer.status === "daily_mission") cat = "present";

    setSelectedCategory(cat || "present");
    setClinicType(
      officer.note?.includes("عيادة تخصصية خارجية")
        ? "عيادة تخصصية خارجية"
        : "عيادة الوحدة",
    );
    setNote(officer.note || "");
    setCustomReason(officer.customReason || "");
    setHospitalName(officer.hospitalName || "");
    setHospitalAdmissionDate(officer.hospitalAdmissionDate || "");
    setDisciplinaryAuthority(officer.disciplinaryAuthority || "");
    setTravelDestination(officer.travelDestination || "");
    setTravelPurpose(officer.travelPurpose || "");
    setStatusStartDate(officer.statusStartDate || "");
    setStatusEndDate(officer.statusEndDate || "");
  }, [officer, isOpen]);

  if (!isOpen || !officer) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalStatus: RollcallStatus = "present";
    let finalDisciplinaryType: "prison" | "unit_arrest" | "court" | undefined = undefined;

    if (selectedCategory === "disciplinary_prison") {
      finalStatus = "prison";
      finalDisciplinaryType = "prison";
    } else if (selectedCategory === "disciplinary_arrest") {
      finalStatus = "unit_arrest";
      finalDisciplinaryType = "unit_arrest";
    } else if (selectedCategory === "disciplinary_court") {
      finalStatus = "court";
      finalDisciplinaryType = "court";
    } else {
      finalStatus = selectedCategory as RollcallStatus;
    }

    // Build synthesized note if applicable
    let finalNote = note.trim();
    if (selectedCategory === "clinic" && clinicType) {
      if (finalNote && !finalNote.includes(clinicType)) {
        finalNote = `${clinicType} - ${finalNote}`;
      } else if (!finalNote) {
        finalNote = clinicType;
      }
    } else if (selectedCategory === "hospital" && hospitalName) {
      if (!finalNote) {
        finalNote = `مستشفى ${hospitalName}`;
      }
    } else if (selectedCategory === "travel_abroad" && travelDestination) {
      if (!finalNote) {
        finalNote = `سفر إلى ${travelDestination}`;
      }
    }

    onSave({
      officerId: officer.id,
      status: finalStatus,
      note: finalNote || undefined,
      customReason: customReason.trim() || undefined,
      hospitalName: hospitalName.trim() || undefined,
      hospitalAdmissionDate: hospitalAdmissionDate || undefined,
      disciplinaryType: finalDisciplinaryType,
      disciplinaryAuthority: disciplinaryAuthority.trim() || undefined,
      travelDestination: travelDestination.trim() || undefined,
      travelPurpose: travelPurpose.trim() || undefined,
      statusStartDate: statusStartDate || undefined,
      statusEndDate: statusEndDate || undefined,
    });

    onClose();
  };

  const isPresentCategory =
    selectedCategory === "present" ||
    selectedCategory === "clinic" ||
    selectedCategory === "custom_present";

  return (
    <ModalShell
      title="تعديل التمام"
      icon={<Activity className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Officer Summary Header Card */}
        <ModalHeaderCard
          icon={<UserCheck className="w-6 h-6 text-(--color-primary)" />}
          title={officer.fullName}
          subtitle={`${officer.rankLabel} • الرقم العسكري: ${officer.militaryId || "ـ"} • الأقدمية: ${officer.seniorityNumber || "ـ"}`}
          badge={
            <ModalBadge
              icon={<Shield className="w-3.5 h-3.5 text-(--color-primary)" />}
            >
              {ROLLCALL_STATUS_LABELS[officer.status] || "موجود"}
            </ModalBadge>
          }
        />

        {/* Status Selection Section */}
        <ModalSection
          title="تحديد تمام الضابط"
          badge={
            <ModalBadge>
              {isPresentCategory ? "يُحتسب ضمن الموجودين" : "يُحتسب خارج الوحدة"}
            </ModalBadge>
          }
        >
          <div className="space-y-3">
            <CustomSelect
              id="status-select"
              label="الحالة العسكرية للتمام"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={STATUS_OPTIONS}
              placeholder="اختر تمام الضابط..."
              required
            />
          </div>
        </ModalSection>

        {/* Conditional Fields: CLINIC */}
        {selectedCategory === "clinic" && (
          <ModalSection title="بيانات وتفاصيل العيادة">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-(--app-muted-foreground) block mr-1">
                  مكان توقيع الكشف الطبي
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {["عيادة الوحدة", "عيادة تخصصية خارجية"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setClinicType(t)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        clinicType === t
                          ? "bg-(--color-primary)/10 border-(--color-primary) text-(--color-primary)"
                          : "bg-(--app-surface) border-(--app-border) text-(--app-muted-foreground) hover:border-(--color-primary)/30"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: HOSPITAL */}
        {selectedCategory === "hospital" && (
          <ModalSection title="بيانات حجز المستشفى">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="hospital-name"
                  className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
                >
                  اسم المستشفى المحجوز به
                </label>
                <input
                  id="hospital-name"
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="مثال: مستشفى المعادي العسكري / كوبري القبة..."
                  required
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  id="hospital-admission-date"
                  label="تاريخ الدخول"
                  value={hospitalAdmissionDate}
                  onChange={setHospitalAdmissionDate}
                />
                <DateField
                  id="hospital-end-date"
                  label="تاريخ الخروج المتوقع"
                  value={statusEndDate}
                  onChange={setStatusEndDate}
                />
              </div>
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: DISCIPLINARY */}
        {(selectedCategory === "disciplinary_prison" ||
          selectedCategory === "disciplinary_arrest" ||
          selectedCategory === "disciplinary_court") && (
          <ModalSection title="بيانات وتفاصيل الإجراء الانضباطي">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label
                  htmlFor="disc-authority"
                  className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
                >
                  الجهة / رقم الأمر أو القرار الانضباطي
                </label>
                <input
                  id="disc-authority"
                  type="text"
                  value={disciplinaryAuthority}
                  onChange={(e) => setDisciplinaryAuthority(e.target.value)}
                  placeholder="مثال: النيابة العسكرية بالسويس / قرار حبس رقم..."
                  className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  id="disc-start-date"
                  label="تاريخ البدء"
                  value={statusStartDate}
                  onChange={setStatusStartDate}
                />
                <DateField
                  id="disc-end-date"
                  label="تاريخ الانتهاء المتوقع"
                  value={statusEndDate}
                  onChange={setStatusEndDate}
                />
              </div>
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: TRAVEL ABROAD */}
        {selectedCategory === "travel_abroad" && (
          <ModalSection title="بيانات السفر للخارج">
            <div className="space-y-3">
              <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <Plane className="w-4 h-4 text-(--color-primary) shrink-0" />
                  <p className="text-xs font-bold text-(--color-primary)">
                    تنبيه: يمكنك أيضاً تسجيل وإدارة وتوثيق السفريات الرسمية للخارج تفصيلياً عبر تبويب &quot;المأموريات&quot;.
                  </p>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20 text-[10px] font-black shrink-0">
                  سفر للخارج
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label
                    htmlFor="travel-dest"
                    className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
                  >
                    الدولة / وجهة السفر
                  </label>
                  <input
                    id="travel-dest"
                    type="text"
                    value={travelDestination}
                    onChange={(e) => setTravelDestination(e.target.value)}
                    placeholder="مثال: الإمارات / ألمانيا..."
                    required
                    className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                  />
                </div>
                <div className="space-y-1.5">
                  <label
                    htmlFor="travel-purpose"
                    className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
                  >
                    الغرض من السفر
                  </label>
                  <input
                    id="travel-purpose"
                    type="text"
                    value={travelPurpose}
                    onChange={(e) => setTravelPurpose(e.target.value)}
                    placeholder="مثال: تدريب مشترك / مأمورية رسمية..."
                    className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  id="travel-start-date"
                  label="تاريخ السفر"
                  value={statusStartDate}
                  onChange={setStatusStartDate}
                />
                <DateField
                  id="travel-end-date"
                  label="تاريخ العودة المتوقع"
                  value={statusEndDate}
                  onChange={setStatusEndDate}
                />
              </div>
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: REST */}
        {selectedCategory === "rest" && (
          <ModalSection title="بيانات بدل الراحة">
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DateField
                  id="rest-start-date"
                  label="تاريخ الراحة"
                  value={statusStartDate}
                  onChange={setStatusStartDate}
                />
                <DateField
                  id="rest-end-date"
                  label="تاريخ العودة المتوقع"
                  value={statusEndDate}
                  onChange={setStatusEndDate}
                />
              </div>
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: ABSENT */}
        {selectedCategory === "absent" && (
          <ModalSection title="بيانات الغياب">
            <div className="space-y-3">
              <DateField
                id="absent-start-date"
                label="تاريخ بدء الغياب"
                value={statusStartDate}
                onChange={setStatusStartDate}
              />
            </div>
          </ModalSection>
        )}

        {/* Conditional Fields: CUSTOM REASON */}
        {(selectedCategory === "custom_present" || selectedCategory === "custom_out") && (
          <ModalSection title="تفاصيل السبب المخصص">
            <div className="space-y-1.5">
              <label
                htmlFor="custom-reason"
                className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
              >
                السبب بالتفصيل
              </label>
              <input
                id="custom-reason"
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="اكتب سبب التواجد / عدم التواجد..."
                required
                className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
              />
            </div>
          </ModalSection>
        )}

        {/* General Note */}
        <div className="space-y-1.5">
          <label
            htmlFor="status-note"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            ملاحظات إضافية على التمام (تظهر في عمود الملاحظات)
          </label>
          <input
            id="status-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="ملاحظات توضيحية إضافية..."
            className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
          />
        </div>

        {/* Actions Footer */}
        <ModalActions
          submitText="تأكيد وتسجيل التمام"
          onCancel={onClose}
          submitVariant="primary"
        />
      </form>
    </ModalShell>
  );
}
