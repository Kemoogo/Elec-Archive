"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

const FITNESS_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "الكل" },
  { value: "fit", label: "لائق طبياً" },
  { value: "class_a", label: "لياقة فئة أ" },
  { value: "class_b", label: "لياقة فئة ب" },
  { value: "class_c", label: "لياقة فئة ج" },
  { value: "temporary_unfit", label: "غير لائق مؤقتاً" },
];

const REST_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "الكل" },
  { value: "none", label: "لا يوجد" },
  { value: "ward", label: "راحة بالعنبر" },
  { value: "home", label: "راحة منزلية" },
  { value: "exemption", label: "إعفاء مجهود" },
];

const PERIOD_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "الكل" },
  { value: "today", label: "زيارات اليوم" },
  { value: "week", label: "خلال هذا الأسبوع" },
  { value: "month", label: "خلال هذا الشهر" },
];

const MED_STATUS_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "الكل" },
  { value: "valid", label: "متوفر وصالح" },
  { value: "low_stock", label: "تحت الحد الأدنى (مخزون حرج)" },
  { value: "expired", label: "منتهي الصلاحية" },
];

const FREQUENCY_FILTER_OPTIONS: CustomSelectOption[] = [
  { value: "all", label: "الكل" },
  { value: "frequent", label: "حالات متكررة التردد (أكثر من 3 زيارات)" },
];

interface FilterModalProps {
  tab: string;
  onClose: () => void;
}

export function FilterModal({ tab, onClose }: FilterModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load initial states from URL params
  const [fitness, setFitness] = useState(searchParams.get("fitness") || "all");
  const [rest, setRest] = useState(searchParams.get("rest") || "all");
  const [period, setPeriod] = useState(searchParams.get("period") || "all");
  const [medStatus, setMedStatus] = useState(searchParams.get("medStatus") || "all");
  const [frequency, setFrequency] = useState(searchParams.get("frequency") || "all");

  const handleApply = () => {
    const params = new URLSearchParams(searchParams.toString());

    // Update params based on active tab
    if (tab === "visits") {
      if (fitness && fitness !== "all") params.set("fitness", fitness);
      else params.delete("fitness");

      if (rest && rest !== "all") params.set("rest", rest);
      else params.delete("rest");

      if (period && period !== "all") params.set("period", period);
      else params.delete("period");
    } else if (tab === "medicines") {
      if (medStatus && medStatus !== "all") params.set("medStatus", medStatus);
      else params.delete("medStatus");
    } else if (tab === "patients") {
      if (frequency && frequency !== "all") params.set("frequency", frequency);
      else params.delete("frequency");
    }

    router.replace(`${window.location.pathname}?${params.toString()}`);
    onClose();
  };

  const handleReset = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (tab === "visits") {
      params.delete("fitness");
      params.delete("rest");
      params.delete("period");
    } else if (tab === "medicines") {
      params.delete("medStatus");
    } else if (tab === "patients") {
      params.delete("frequency");
    }

    router.replace(`${window.location.pathname}?${params.toString()}`);
    onClose();
  };

  return (
    <ModalShell
      title="خيارات الفلترة المتقدمة"
      icon={<SlidersHorizontal className="w-4 h-4" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-h-[85vh] max-w-md border-(--app-border) shadow-depth-xl"
      bodyClassName="p-6 no-scrollbar"
      footer={
        <ModalActions
          startSlot={
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>إعادة ضبط</span>
            </button>
          }
          submitText="تطبيق الفلترة"
          onConfirm={handleApply}
          cancelText="إلغاء"
          onCancel={onClose}
        />
      }
    >
      <div className="space-y-4 text-right" dir="rtl">
        {tab === "visits" && (
          <>
            {/* اللياقة الطبية */}
            <CustomSelect
              id="filter-fitness"
              label="اللياقة الطبية"
              value={fitness}
              onChange={setFitness}
              options={FITNESS_FILTER_OPTIONS}
            />

            {/* نوع الراحة الطبية */}
            <CustomSelect
              id="filter-rest"
              label="نوع الراحة الطبية"
              value={rest}
              onChange={setRest}
              options={REST_FILTER_OPTIONS}
            />

            {/* الفترة الزمنية */}
            <CustomSelect
              id="filter-period"
              label="الفترة الزمنية للزيارة"
              value={period}
              onChange={setPeriod}
              options={PERIOD_FILTER_OPTIONS}
            />
          </>
        )}

        {tab === "medicines" && (
          <CustomSelect
            id="filter-medstatus"
            label="حالة توفر الدواء والمخزون"
            value={medStatus}
            onChange={setMedStatus}
            options={MED_STATUS_FILTER_OPTIONS}
          />
        )}

        {tab === "patients" && (
          <CustomSelect
            id="filter-frequency"
            label="معدل التردد المرجعي"
            value={frequency}
            onChange={setFrequency}
            options={FREQUENCY_FILTER_OPTIONS}
          />
        )}
      </div>
    </ModalShell>
  );
}
