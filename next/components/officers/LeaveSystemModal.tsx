"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Award, CheckCircle2, Info, Clock } from "lucide-react";
import {
  ModalShell,
  ModalHeaderCard,
  ModalBadge,
  ModalSection,
} from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import {
  OFFICER_LEAVE_SYSTEMS,
  OFFICER_LEAVE_SYSTEM_LABELS,
  type OfficerLeaveSystem,
} from "@/lib/db/models/Leave.shared";

interface OfficerSystemInfo {
  officerId: string;
  officerName: string;
  officerLabel?: string;
  officerRank?: string;
  militaryId?: string;
  seniorityNumber?: string;
  currentSystem?: string;
}

interface LeaveSystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  officer: OfficerSystemInfo | null;
  onSuccess?: () => void;
}

interface SystemDetail {
  presenceDays: number;
  leaveDays: number;
  description: string;
  cycleNote: string;
}

const SYSTEM_DETAILS: Record<OfficerLeaveSystem, SystemDetail> = {
  field: {
    presenceDays: 14,
    leaveDays: 7,
    description: "نظام الخدمة الميدانية للقوات المقاتلة والوحدات الميدانية.",
    cycleNote: "دورة منتظمة: 14 يوماً تواجد بالوحدة مقابل 7 أيام إجازة ميدانية معتمدة.",
  },
  daily_sleep: {
    presenceDays: 1,
    leaveDays: 1,
    description: "نظام المبيت اليومي للضباط المقيمين والمكلفين بنوبتجيات دورية.",
    cycleNote: "تواجد يومي خلال ساعات الخدمة الرسمية مع مبيت ومغادرة دورية مصدق عليها.",
  },
  weekly_rest: {
    presenceDays: 4,
    leaveDays: 3,
    description: "نظام الراحة الأسبوعية للقيادات والإدارات التخصصية.",
    cycleNote: "دورة أسبوعية: تواجد من الأحد إلى الأربعاء، وراحة أسبوعية من الخميس إلى السبت.",
  },
};

export function LeaveSystemModal({
  isOpen,
  onClose,
  officer,
  onSuccess,
}: LeaveSystemModalProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [selectedSystem, setSelectedSystem] = useState<string>("field");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const systemOptions: CustomSelectOption[] = useMemo(
    () =>
      OFFICER_LEAVE_SYSTEMS.map((type) => ({
        value: type,
        label: OFFICER_LEAVE_SYSTEM_LABELS[type],
        description: SYSTEM_DETAILS[type].cycleNote,
      })),
    []
  );

  useEffect(() => {
    if (
      officer?.currentSystem &&
      OFFICER_LEAVE_SYSTEMS.includes(officer.currentSystem as OfficerLeaveSystem)
    ) {
      setSelectedSystem(officer.currentSystem);
    } else {
      setSelectedSystem("field");
    }
  }, [officer]);

  if (!isOpen || !officer) return null;

  const currentSystemKey =
    officer.currentSystem &&
    OFFICER_LEAVE_SYSTEMS.includes(officer.currentSystem as OfficerLeaveSystem)
      ? (officer.currentSystem as OfficerLeaveSystem)
      : null;

  const isEdit = Boolean(currentSystemKey);
  const activeDetail = SYSTEM_DETAILS[selectedSystem as OfficerLeaveSystem] || SYSTEM_DETAILS.field;

  const subtitleText = [
    officer.militaryId ? `الرقم العسكري: ${officer.militaryId}` : null,
    officer.seniorityNumber ? `الأقدمية: ${officer.seniorityNumber}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!officer.officerId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/officers/${officer.officerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultLeaveSystem: selectedSystem }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل في تحديث نظام الإجازة"));
      }

      showToast("تم تحديث نظام الإجازة بنجاح", "success");
      onSuccess?.();
      router.refresh();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء التحديث", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalShell
      title={isEdit ? "تعديل نظام الإجازة للضابط" : "تحديد نظام الإجازة للضابط"}
      icon={<Award className="w-4 h-4 text-(--color-primary)" />}
      onClose={onClose}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          submitText="حفظ التعديل"
          submitLoading={isSubmitting}
          onCancel={onClose}
          onSubmit={handleSubmit}
        />
      }
    >
      {/* Officer Summary Card */}
      <ModalHeaderCard
        icon={<Calendar className="w-5 h-5" />}
        title={officer.officerLabel || `${officer.officerRank ? `${officer.officerRank} / ` : ""}${officer.officerName}`}
        subtitle={subtitleText || (officer.officerRank ? `الرتبة: ${officer.officerRank}` : undefined)}
        badge={
          <ModalBadge icon={<Clock className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
            {currentSystemKey ? (
              <span className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-(--app-muted-foreground)">النظام الحالي:</span>
                <span className="font-black text-(--color-primary)">
                  {OFFICER_LEAVE_SYSTEM_LABELS[currentSystemKey]}
                </span>
              </span>
            ) : (
              <span className="text-[11px] font-bold text-(--app-muted-foreground)">غير محدد</span>
            )}
          </ModalBadge>
        }
      />

      {/* Select Field */}
      <div className="space-y-1.5 text-right">
        <CustomSelect
          id="leave-system-select"
          label="نظام الخدمة والإجازة المستحق للضابط"
          value={selectedSystem}
          onChange={setSelectedSystem}
          options={systemOptions}
          disabled={isSubmitting}
          required
        />
      </div>

      {/* Standard Section Explaining Selected System Policy */}
      <ModalSection
        title={
          <span className="flex items-center gap-1.5">
            <Info className="w-4 h-4 text-(--color-primary)" />
            <span>قواعد دورة الإجازة المعتمدة للنظام المختار</span>
          </span>
        }
        badge={
          <ModalBadge icon={<CheckCircle2 className="w-3.5 h-3.5 text-(--app-muted-foreground) shrink-0" />}>
            {OFFICER_LEAVE_SYSTEM_LABELS[selectedSystem as OfficerLeaveSystem] || selectedSystem}
          </ModalBadge>
        }
      >
        <div className="space-y-2.5 pt-1 text-right">
          <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
            {activeDetail.description}
          </p>

          <div className="p-3 bg-(--app-surface) rounded-xl border border-(--app-border) flex items-center justify-between gap-3 text-xs font-bold">
            <div className="flex items-center gap-2">
              <span className="text-(--app-muted-foreground)">الدورة الرسمية:</span>
              <span className="text-(--color-primary) font-black">
                {activeDetail.cycleNote}
              </span>
            </div>
            {selectedSystem === "field" && (
              <span className="px-2 py-0.5 rounded-lg bg-(--color-primary)/10 text-(--color-primary) text-[11px] font-black shrink-0">
                14 / 7
              </span>
            )}
          </div>
        </div>
      </ModalSection>
    </ModalShell>
  );
}
