"use client";

import React, { useState, useRef } from "react";
import { ModalShell, ModalSection } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { UploadCloud, FileSpreadsheet, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatGovernorateDisplay, formatBloodTypeDisplay } from "@/lib/students/mappings";
import type { IMdbPreviewData } from "@/types/student";

interface MdbImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MdbImportModal({ isOpen, onClose, onSuccess }: MdbImportModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [previewData, setPreviewData] = useState<IMdbPreviewData | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.toLowerCase().endsWith(".mdb")) {
        showToast("يجب اختيار ملف بصيغة .mdb الخاصة بقواعد بيانات Microsoft Access", "error");
        return;
      }
      setSelectedFile(file);
      setPreviewData(null);
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/students/upload-mdb", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل تحليل الملف");
      }

      setPreviewData(json.data);
      showToast("تم استخراج بيانات الملف بنجاح، يرجى مراجعة ملخص المعاينة.", "success");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء رفع وتحليل الملف", "error");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewData) return;

    setConfirming(true);
    try {
      const res = await fetch("/api/students/import-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: previewData.fileId }),
      });

      const json = await res.json();
      if (!json.success) {
        throw new Error(json.error || "فشل تأكيد الاستيراد");
      }

      showToast(json.message || "تم استيراد وحفظ البيانات بنجاح", "success");
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ النهائي", "error");
    } finally {
      setConfirming(false);
    }
  };

  const resetAll = () => {
    setSelectedFile(null);
    setPreviewData(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <ModalShell
      title="استيراد وتحديث بيانات الطلاب من ملف Access (.mdb)"
      icon={<FileSpreadsheet className="w-5 h-5 text-(--color-primary)" />}
      onClose={resetAll}
      overlayClassName="bg-black/40"
      panelClassName="max-w-3xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 space-y-4 no-scrollbar"
      footer={
        <ModalActions
          mode="action"
          submitText={
            confirming
              ? "جاري الحفظ والتحديث..."
              : previewData
              ? "تأكيد الاستيراد والتحديث الذري"
              : "تحليل ومعاينة الملف"
          }
          submitLoading={uploading || confirming}
          submitDisabled={uploading || confirming || (!selectedFile && !previewData)}
          cancelText="إلغاء"
          onCancel={resetAll}
          onConfirm={previewData ? handleConfirmImport : handleUploadAndAnalyze}
        />
      }
    >
      {!previewData ? (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-(--color-primary)/30 hover:border-(--color-primary) rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-(--app-surface-container)/40 hover:bg-(--app-surface-container)/70 transition-all text-center"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".mdb"
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center mb-3 shadow-inner">
              <UploadCloud className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-(--app-foreground)">
              {selectedFile ? selectedFile.name : "انقر هنا لاختيار ملف قاعدة بيانات أكسس (.mdb)"}
            </p>
            <p className="text-xs text-(--app-muted-foreground) mt-1">
              يتم استخراج جدول بيانات الجنود (src_soldiers) وجدول الغياب والحبس (gyabhabs) تلقائياً
            </p>
            {selectedFile && (
              <span className="mt-3 px-3 py-1 bg-(--color-primary)/10 text-(--color-primary) text-xs font-bold rounded-lg">
                الحجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت
              </span>
            )}
          </div>

          {uploading && (
            <div className="flex items-center justify-center gap-3 p-4 bg-(--color-primary)/5 rounded-xl text-xs font-bold text-(--color-primary)">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جاري استخراج وتحليل بيانات الجداول بالترميز العربي...</span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-center">
              <span className="text-xs text-(--app-muted-foreground) block font-bold">إجمالي السجلات</span>
              <span className="text-lg font-black text-(--color-primary) tabular-nums">
                {previewData.totalRecords.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-center">
              <span className="text-xs text-(--app-muted-foreground) block font-bold">طلاب جدد</span>
              <span className="text-lg font-black text-(--color-primary) tabular-nums">
                {previewData.newCount.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-center">
              <span className="text-xs text-(--app-muted-foreground) block font-bold">تحديث بيانات</span>
              <span className="text-lg font-black text-(--color-primary-hover) tabular-nums">
                {previewData.updateCount.toLocaleString("ar-EG")}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-(--app-surface-container) border border-(--app-border) text-center">
              <span className="text-xs text-(--app-muted-foreground) block font-bold">سجلات الانضباط</span>
              <span className="text-lg font-black text-(--app-foreground) tabular-nums">
                {previewData.disciplinaryCount.toLocaleString("ar-EG")}
              </span>
            </div>
          </div>

          {/* Stages Breakdown */}
          <ModalSection title="توزيع السجلات حسب الدفعات المكتشفة">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {previewData.stages.map((stg) => (
                <div
                  key={stg.mrhla}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-(--app-surface) border border-(--app-border)"
                >
                  <span className="text-xs font-extrabold text-(--color-primary)">{stg.name}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-(--color-primary)/10 text-(--color-primary) tabular-nums">
                    {stg.count} طالب
                  </span>
                </div>
              ))}
            </div>
          </ModalSection>

          {/* Sample Table */}
          <ModalSection title="عينة من السجلات المستخرجة (أول 25 سجلاً)">
            <div className="overflow-x-auto max-h-56 rounded-xl border border-(--app-border)">
              <table className="w-full text-right text-xs">
                <thead className="bg-(--app-surface-container) text-(--app-muted-foreground) border-b border-(--app-border) font-bold">
                  <tr>
                    <th className="px-3 py-2">الرقم العسكري</th>
                    <th className="px-3 py-2">الاسم</th>
                    <th className="px-3 py-2">المرحلة</th>
                    <th className="px-3 py-2">المؤهل</th>
                    <th className="px-3 py-2">المحافظة</th>
                    <th className="px-3 py-2 text-center">فصيلة الدم</th>
                    <th className="px-3 py-2">العملية</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--app-border)/40 font-bold">
                  {previewData.previewRows.map((r, idx) => (
                    <tr key={idx} className="hover:bg-(--app-surface-container)/40">
                      <td className="px-3 py-1.5 tabular-nums text-(--app-muted-foreground)">{r.militaryNo}</td>
                      <td className="px-3 py-1.5 text-(--color-primary) font-black">{r.fullName}</td>
                      <td className="px-3 py-1.5 text-(--app-muted-foreground)">{r.mrhla}</td>
                      <td className="px-3 py-1.5 text-(--app-muted-foreground)">{r.qualificationName || "-"}</td>
                      <td className="px-3 py-1.5 text-(--app-muted-foreground)">
                        <span>{formatGovernorateDisplay(r.governorate)}</span>
                        {r.recruitmentArea && (
                          <span className="text-[10px] text-(--app-muted-foreground)/80 block font-normal">
                            ({r.recruitmentArea})
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-1.5 font-mono text-center text-(--color-primary) font-black">
                        {formatBloodTypeDisplay(r.bloodType)}
                      </td>
                      <td className="px-3 py-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                            r.isNew
                              ? "bg-(--color-primary)/10 text-(--color-primary)"
                              : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                          }`}
                        >
                          {r.isNew ? "إضافة جديد" : "تحديث"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ModalSection>

          {previewData.warningsCount > 0 && (
            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl flex items-center gap-2 text-xs font-bold text-(--color-primary)">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                توجد {previewData.warningsCount} ملاحظات غير مؤثرة تم التعامل معها وتخطي السجلات المعيبة آلياً.
              </span>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
