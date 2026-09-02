"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { SlidersHorizontal, RotateCcw } from "lucide-react";
import { FormLabel, FormSelect } from "@/components/ui/form-fields";

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
        <ModalActions className="sm:items-stretch w-full">
          <button
            type="button"
            onClick={handleApply}
            className="btn-primary"
          >
            تطبيق الفلترة
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary"
          >
            <RotateCcw className="w-4 h-4" />
            <span>إعادة ضبط</span>
          </button>
        </ModalActions>
      }
    >
      <div className="space-y-4 text-right" dir="rtl">
        {tab === "visits" && (
          <>
            {/* اللياقة الطبية */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="filter-fitness">اللياقة الطبية</FormLabel>
              <FormSelect id="filter-fitness" value={fitness} onChange={(e) => setFitness(e.target.value)}>
                <option value="all">الكل</option>
                <option value="fit">لائق طبياً</option>
                <option value="class_a">لياقة فئة أ</option>
                <option value="class_b">لياقة فئة ب</option>
                <option value="class_c">لياقة فئة ج</option>
                <option value="temporary_unfit">غير لائق مؤقتاً</option>
              </FormSelect>
            </div>

            {/* نوع الراحة الطبية */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="filter-rest">نوع الراحة الطبية</FormLabel>
              <FormSelect id="filter-rest" value={rest} onChange={(e) => setRest(e.target.value)}>
                <option value="all">الكل</option>
                <option value="none">لا يوجد</option>
                <option value="ward">راحة بالعنبر</option>
                <option value="home">راحة منزلية</option>
                <option value="exemption">إعفاء مجهود</option>
              </FormSelect>
            </div>

            {/* الفترة الزمنية */}
            <div className="space-y-1.5">
              <FormLabel htmlFor="filter-period">الفترة الزمنية للزيارة</FormLabel>
              <FormSelect id="filter-period" value={period} onChange={(e) => setPeriod(e.target.value)}>
                <option value="all">الكل</option>
                <option value="today">زيارات اليوم</option>
                <option value="week">خلال هذا الأسبوع</option>
                <option value="month">خلال هذا الشهر</option>
              </FormSelect>
            </div>
          </>
        )}

        {tab === "medicines" && (
          <div className="space-y-1.5">
            <FormLabel htmlFor="filter-medstatus">حالة توفر الدواء والمخزون</FormLabel>
            <FormSelect id="filter-medstatus" value={medStatus} onChange={(e) => setMedStatus(e.target.value)}>
              <option value="all">الكل</option>
              <option value="valid">متوفر وصالح</option>
              <option value="low_stock">تحت الحد الأدنى (مخزون حرج)</option>
              <option value="expired">منتهي الصلاحية</option>
            </FormSelect>
          </div>
        )}

        {tab === "patients" && (
          <div className="space-y-1.5">
            <FormLabel htmlFor="filter-frequency">معدل التردد المرجعي</FormLabel>
            <FormSelect id="filter-frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="all">الكل</option>
              <option value="frequent">حالات متكررة التردد (أكثر من 3 زيارات)</option>
            </FormSelect>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
