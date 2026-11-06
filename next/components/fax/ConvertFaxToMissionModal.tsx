"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { CustomSelect } from "@/components/ui/custom-select";
import { DateField } from "@/components/ui/date-field";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { Compass, AlertCircle } from "lucide-react";
import type { OfficerOption } from "@/types";
import { format } from "date-fns";

interface ConvertFaxToMissionModalProps {
  faxId: string;
  faxNumber: string;
  faxSubject: string;
  faxFromEntity: string;
  officers: OfficerOption[];
}

export function ConvertFaxToMissionModal({
  faxId,
  faxNumber,
  faxSubject,
  faxFromEntity,
  officers = [],
}: ConvertFaxToMissionModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getInitialForm = () => {
    const tomorrowStr = format(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    );
    return {
      officerId: "",
      missionType: "external_multiday" as "internal_daily" | "external_multiday",
      title: faxSubject || "مأمورية متابعة مكاتبة",
      destination: faxFromEntity || "",
      description: `بناءً على الفاكس الوارد رقم ${faxNumber} بتاريخ رسمي`,
      startDate: tomorrowStr,
      endDate: tomorrowStr,
      transportationMean: "سيارة تابعة للوحدة",
      authorizedWeapons: "بدون سلاح",
      travelOrderNumber: "",
    };
  };

  const [form, setForm] = useState(getInitialForm);

  const handleOpen = () => {
    setForm(getInitialForm());
    setError("");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.officerId) {
      setError("يجب اختيار الضابط المكلف بالمأمورية");
      return;
    }
    if (!form.title.trim()) {
      setError("عنوان المأمورية مطلوب");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/fax/${faxId}/convert-to-mission`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(extractApiError(data) || "فشل تحويل الفاكس إلى مأمورية");
      }

      showToast("تم تحويل الفاكس وإنشاء المأمورية العسكرية بنجاح", "success");
      setIsOpen(false);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions
      form="convert-to-mission-form"
      submitText="تأكيد وتسجيل المأمورية"
      submitLoading={loading}
      cancelText="إلغاء"
      onCancel={handleClose}
    />
  );

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--color-primary)/10 text-(--color-primary) hover:bg-(--color-primary) hover:text-white text-xs font-black transition-all cursor-pointer border border-(--color-primary)/20"
      >
        <Compass className="w-3.5 h-3.5" />
        <span>تحويل لمأمورية في أركان حرب</span>
      </button>

      {isOpen && (
        <ModalShell
          title={`تحويل الفاكس رقم (${faxNumber}) إلى مأمورية عمل`}
          icon={<Compass className="w-4 h-4 text-(--color-primary)" />}
          overlayClassName="bg-black/40"
          panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 sm:p-6 space-y-4 text-right no-scrollbar"
          onClose={handleClose}
          footer={footer}
        >
          <form
            id="convert-to-mission-form"
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {error && (
              <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-(--color-primary) text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-(--color-primary)" />
                <span>{error}</span>
              </div>
            )}

            {/* Officer Selection */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="officerId" required>
                الضابط المكلف بالمأمورية
              </FormLabel>
              <CustomSelect
                id="officerId"
                value={form.officerId}
                onChange={(val) => setForm({ ...form, officerId: val })}
                required
                placeholder="اختر الضابط المعني..."
                options={officers.map((o) => ({
                  value: o.id,
                  label: o.officerLabel || o.fullName || o.name || "ضابط",
                  description: o.seniorityNumber
                    ? `أقدمية: ${o.seniorityNumber}`
                    : undefined,
                }))}
              />
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="title" required>
                عنوان وموضوع المأمورية
              </FormLabel>
              <FormInput
                id="title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="destination">الجهة / الوجهة</FormLabel>
              <FormInput
                id="destination"
                type="text"
                placeholder="الجهة المستقبلة أو المنعقد بها التكليف..."
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
              />
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <DateField
                id="startDate"
                label="تاريخ البداية"
                value={form.startDate}
                onChange={(v) => setForm({ ...form, startDate: v })}
                required
              />
              <DateField
                id="endDate"
                label="تاريخ العودة المتوقع"
                value={form.endDate}
                onChange={(v) => setForm({ ...form, endDate: v })}
                required
              />
            </div>

            {/* Transportation & Weapons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
              <div className="space-y-1.5">
                <FormLabel htmlFor="transportationMean">وسيلة الانتقال</FormLabel>
                <FormInput
                  id="transportationMean"
                  type="text"
                  placeholder="مثال: سيارة تابعة للوحدة، قطار..."
                  value={form.transportationMean}
                  onChange={(e) =>
                    setForm({ ...form, transportationMean: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <FormLabel htmlFor="authorizedWeapons">السلاح المصرح بحمله</FormLabel>
                <FormInput
                  id="authorizedWeapons"
                  type="text"
                  placeholder="مثال: بدون سلاح، طبنجة حلوان..."
                  value={form.authorizedWeapons}
                  onChange={(e) =>
                    setForm({ ...form, authorizedWeapons: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="description">ملاحظات إدارية وتفاصيل</FormLabel>
              <FormTextarea
                id="description"
                placeholder="أي تعليمات أو ملاحظات إضافية..."
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
          </form>
        </ModalShell>
      )}
    </>
  );
}
