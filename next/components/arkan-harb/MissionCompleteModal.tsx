"use client";

import { useState, useEffect } from "react";
import { ModalShell, ModalHeaderCard, ModalBadge } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { FormLabel, FormInput, FormTextarea } from "@/components/ui/form-fields";
import { FileCheck, FileText, Compass, MapPin, AlertCircle, Upload, X } from "lucide-react";
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
  const [clearanceFile, setClearanceFile] = useState<File | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && mission) {
      setResultSummary(mission.resultSummary || "");
      setLinkedFaxId(mission.linkedFaxId || "");
      setClearanceFile(null);
      setError("");
    }
  }, [isOpen, mission]);

  if (!isOpen || !mission) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png)$/i)) {
      setError("نوع الملف غير مدعوم. الصيغ المدعومة: PDF أو صور (JPG/PNG)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الملف يتجاوز الحد الأقصى المسموح به (10 ميجابايت)");
      return;
    }

    setError("");
    setClearanceFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let res: Response;

      if (clearanceFile) {
        const formData = new FormData();
        formData.append("status", "completed");
        if (resultSummary.trim()) formData.append("resultSummary", resultSummary.trim());
        if (linkedFaxId.trim()) formData.append("linkedFaxId", linkedFaxId.trim());
        formData.append("clearanceFile", clearanceFile);

        res = await fetch(`/api/arkan-harb/missions/${mission.id}`, {
          method: "PATCH",
          body: formData,
        });
      } else {
        res = await fetch(`/api/arkan-harb/missions/${mission.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "completed",
            resultSummary: resultSummary.trim() || undefined,
            linkedFaxId: linkedFaxId.trim() || undefined,
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(extractApiError(data, "فشل في إغلاق المأمورية"));
      }

      showToast("تم إغلاق المأمورية وتوثيق النتائج والمستندات بنجاح", "success");
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
      cancelText="إلغاء"
      onCancel={onClose}
    />
  );

  const displayOfficer = mission.officerLabel || (mission.officerRankLabel ? `${mission.officerRankLabel} / ${mission.officerName}` : mission.officerName || "---");

  return (
    <ModalShell
      title="إغلاق المأمورية وتوثيق التقرير"
      icon={<FileCheck className="w-4 h-4" />}
      overlayClassName="bg-black/40"
      panelClassName="max-w-lg border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 sm:p-6 space-y-4 text-right no-scrollbar"
      onClose={onClose}
      footer={footer}
    >
      <form id="mission-complete-form" onSubmit={handleSubmit} className="space-y-4 text-right">
        {error && (
          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-(--color-primary) text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-(--color-primary)" />
            <span>{error}</span>
          </div>
        )}

        {/* Standard Top Summary Header Card */}
        <ModalHeaderCard
          icon={<Compass className="w-6 h-6" />}
          title={mission.title}
          subtitle={
            <div className="space-y-0.5 mt-1">
              <p className="text-xs font-bold text-(--app-muted-foreground)">
                الضابط المكلف: <span className="text-(--color-primary) font-extrabold">{displayOfficer}</span>
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
            <FileText className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-(--app-muted-foreground) pointer-events-none" />
          </div>
        </div>

        {/* Clearance / Completion Document Upload */}
        <div className="space-y-1.5">
          <FormLabel htmlFor="clearanceFile">مستند إخلاء الطرف / إفادة إنجاز المأمورية (اختياري)</FormLabel>
          <div className="border border-dashed border-(--app-border) rounded-xl p-3 bg-(--app-surface-container)/40 text-center space-y-2">
            {clearanceFile ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-(--app-surface) border border-(--app-border) text-xs font-bold">
                <div className="flex items-center gap-2 truncate">
                  <FileCheck className="w-4 h-4 text-(--app-success) shrink-0" />
                  <span className="truncate text-(--color-primary)">{clearanceFile.name}</span>
                  <span className="text-[10px] text-(--app-muted-foreground) shrink-0">
                    ({(clearanceFile.size / 1024).toFixed(1)} ك.ب)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setClearanceFile(null)}
                  className="p-1 text-(--app-muted-foreground) hover:text-(--color-primary) cursor-pointer transition-colors"
                  title="إلغاء الملف"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                htmlFor="clearanceFile"
                className="flex flex-col items-center justify-center gap-1 cursor-pointer py-2 hover:bg-(--app-surface)/50 rounded-lg transition-colors"
              >
                <Upload className="w-5 h-5 text-(--color-primary)" />
                <span className="text-xs font-bold text-(--color-primary)">انقر لاختيار ملف إخلاء الطرف أو التقرير المعتمد</span>
                <span className="text-[10px] font-medium text-(--app-muted-foreground)">الصيغ المدعومة: PDF, JPG, PNG (حد أقصى 10 ميجابايت)</span>
                <input
                  id="clearanceFile"
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>
      </form>
    </ModalShell>
  );
}
