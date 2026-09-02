"use client";

import { useState } from "react";
import { ModalShell } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { FileCheck, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import { type Mission } from "./MissionsTable";

interface MissionCompleteModalProps {
  mission: Mission | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MissionCompleteModal({ mission, isOpen, onClose, onSuccess }: MissionCompleteModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resultSummary, setResultSummary] = useState(mission?.resultSummary || "");
  const [linkedFaxId, setLinkedFaxId] = useState(mission?.linkedFaxId || "");
  const { showToast } = useToast();

  if (!isOpen || !mission) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/arkan-harb/missions/${mission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "completed",
          resultSummary: resultSummary.trim() || undefined,
          linkedFaxId: linkedFaxId.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(extractApiError(data, "فشل في إغلاق المأمورية"));
      }

      showToast("تم إغلاق المأمورية وتوثيق النتائج بنجاح", "success");
      onSuccess();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <ModalActions
      form="mission-complete-form"
      submitText="تأكيد إكمال المأمورية"
      submitLoading={loading}
      onCancel={onClose}
    />
  );

  const displayOfficer = mission.officerLabel || (mission.officerRankLabel ? `${mission.officerRankLabel} / ${mission.officerName}` : mission.officerName || "---");

  return (
    <ModalShell
      title="إغلاق المأمورية وتوثيق التقرير"
      icon={<FileCheck className="w-4 h-4" />}
      onClose={onClose}
      footer={footer}
      panelClassName="max-w-[520px]"
    >
      <form id="mission-complete-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {error && (
          <div className="p-3 bg-(--app-error)/10 border border-(--app-error)/20 rounded-xl text-(--app-error) text-xs font-bold">
            {error}
          </div>
        )}

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <p className="text-xs font-bold text-slate-400">المأمورية المراد إكمالها:</p>
          <p className="text-sm font-black text-(--color-primary)">{mission.title}</p>
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">الضابط: {displayOfficer}</p>
        </div>

        <div className="space-y-1.5">
          <FormLabel htmlFor="resultSummary">نتائج وملخص المأمورية (التقرير النهائي)</FormLabel>
          <FormTextarea
            id="resultSummary"
            placeholder="اكتب ملخص النتائج والتوصيات أو التقرير العائد من المأمورية..."
            rows={4}
            value={resultSummary}
            onChange={(e) => setResultSummary(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <FormLabel htmlFor="linkedFaxId">رقم الفاكس / المستند المرتبط (اختياري)</FormLabel>
          <div className="relative">
            <FormInput
              id="linkedFaxId"
              type="text"
              placeholder="مثال: FAX-2026-0891"
              value={linkedFaxId}
              onChange={(e) => setLinkedFaxId(e.target.value)}
              className="pr-10"
            />
            <FileText className="absolute right-3 top-3.5 h-4 w-4 text-(--app-muted-foreground)" />
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
