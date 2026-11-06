"use client";

import { useState } from "react";
import { RotateCcw, AlertTriangle, Lock, KeyRound } from "lucide-react";
import { ModalShell, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import { RESTORE_CONFIRMATION_PHRASE } from "@/lib/validations/backup";
import type { IBackupRecordItem } from "@/types/backup";

interface RestoreModalProps {
  isOpen: boolean;
  backup: IBackupRecordItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function RestoreModal({
  isOpen,
  backup,
  onClose,
  onSuccess,
}: RestoreModalProps) {
  const { showToast } = useToast();
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !backup) return null;

  const isPhraseMatching = confirmationPhrase.trim() === RESTORE_CONFIRMATION_PHRASE;
  const isSubmitDisabled = !isPhraseMatching || !password.trim() || loading;

  const handleClose = () => {
    if (loading) return;
    setConfirmationPhrase("");
    setPassword("");
    setError(null);
    onClose();
  };

  const handleRestore = async () => {
    if (isSubmitDisabled) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/backup/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: backup.id,
          adminPassword: password,
          confirmationPhrase: confirmationPhrase.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشلت عملية استعادة النسخة الاحتياطية");
      }

      showToast("تمت استعادة المنظومة وقاعدة البيانات بنجاح", "success");
      handleClose();
      onSuccess();
    } catch (err) {
      const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء الاستعادة";
      setError(message);
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      title="استعادة المنظومة من نسخة احتياطية"
      icon={<RotateCcw className="w-4 h-4 text-red-500" />}
      titleVariant="danger"
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 sm:p-6 space-y-4 text-right no-scrollbar"
      onClose={handleClose}
      footer={
        <ModalActions
          mode="action"
          submitText="تأكيد واستعادة المنظومة"
          submitVariant="destructive"
          submitDisabled={isSubmitDisabled}
          submitLoading={loading}
          onConfirm={handleRestore}
          onCancel={handleClose}
          cancelText="إلغاء"
        />
      }
    >
      <div className="space-y-4">
        {/* Header Summary Card */}
        <ModalHeaderCard
          icon={<RotateCcw className="w-6 h-6 text-red-500" />}
          title={`استعادة ملف: ${backup.filename}`}
          subtitle={`تاريخ إنشاء النسخة: ${new Date(backup.createdAt).toLocaleString("ar-EG")}`}
        />

        {/* Warning Alert Banner */}
        <div className="p-3.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-2xl text-xs font-bold text-(--color-primary) flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
          <div className="space-y-1">
            <p className="font-black text-(--color-primary)">تحذير أمني عالي الحساسية:</p>
            <p className="text-(--app-muted-foreground) leading-relaxed">
              عملية الاستعادة ستقوم بمسح واستبدال كافة بيانات المنظومة الحالية والمرفقات وإرجاعها للحالة المسجلة داخل هذه النسخة. لا يمكن التراجع عن هذه العملية بمجرد بدئها.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Confirmation Phrase Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="confirmationPhrase"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            لتأكيد العملية، يرجى كتابة العبارة التالية:{" "}
            <span className="text-(--color-primary) font-black select-all">
              {RESTORE_CONFIRMATION_PHRASE}
            </span>
          </label>
          <div className="relative">
            <input
              id="confirmationPhrase"
              type="text"
              value={confirmationPhrase}
              onChange={(e) => setConfirmationPhrase(e.target.value)}
              placeholder={RESTORE_CONFIRMATION_PHRASE}
              disabled={loading}
              className="w-full px-3 py-2 pr-9 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
            <KeyRound className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-2.5" />
          </div>
        </div>

        {/* Admin Password Input */}
        <div className="space-y-1.5">
          <label
            htmlFor="adminPassword"
            className="text-xs font-bold text-(--app-muted-foreground) block mr-1"
          >
            كلمة مرور مدير النظام الحالية
          </label>
          <div className="relative">
            <input
              id="adminPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور لتأكيد الصلاحية..."
              disabled={loading}
              className="w-full px-3 py-2 pr-9 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
            <Lock className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-2.5" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
