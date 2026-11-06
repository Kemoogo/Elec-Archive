"use client";

import React, { useState } from "react";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { Layers } from "lucide-react";
import type { IStageInfo } from "@/types/student";

interface StageSelectorProps {
  activeStage: string;
  stages: IStageInfo[];
  canEdit: boolean;
  onStageChange?: (newMrhla: string) => void;
  disabled?: boolean;
}

export function StageSelector({
  activeStage,
  stages,
  canEdit,
  onStageChange,
  disabled = false,
}: StageSelectorProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  const options: CustomSelectOption[] = stages.map((s) => ({
    value: s.mrhla,
    label: s.name,
    badge: `${s.count} طالب`,
    description: s.activeCount !== undefined ? `النشط: ${s.activeCount}` : undefined,
  }));

  const handleSelect = async (newMrhla: string) => {
    if (!newMrhla || newMrhla === activeStage || !canEdit || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/students/active-stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mrhla: newMrhla }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || "فشل تغيير المرحلة الحالية", "error");
        return;
      }

      showToast(data.message || "تم اعتماد المرحلة بنجاح", "success");
      onStageChange?.(newMrhla);
    } catch {
      showToast("حدث خطأ أثناء الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-(--app-muted-foreground) shrink-0">
        <Layers className="w-4 h-4 text-(--color-primary)" />
        <span>المرحلة المعتمدة:</span>
      </div>
      <div className="w-56">
        <CustomSelect
          value={activeStage}
          onChange={handleSelect}
          options={options}
          placeholder="اختر المرحلة..."
          disabled={disabled || !canEdit || loading}
          className="!py-1.5 !text-xs font-bold"
        />
      </div>
    </div>
  );
}
