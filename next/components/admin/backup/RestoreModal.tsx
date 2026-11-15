"use client";

import { useState, useRef } from "react";
import {
  RotateCcw,
  AlertTriangle,
  Lock,
  KeyRound,
  Upload,
  Archive,
  HardDrive,
  FileCheck,
  X,
} from "lucide-react";
import { ModalShell, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import {
  MAX_EXTERNAL_RESTORE_BYTES,
  RESTORE_CONFIRMATION_PHRASE,
} from "@/lib/validations/backup";
import type { IBackupRecordItem } from "@/types/backup";

interface RestoreModalProps {
  isOpen: boolean;
  backup: IBackupRecordItem | null;
  initialMode?: "server_file" | "external_upload";
  onClose: () => void;
  onSuccess: () => void;
}

export function RestoreModal({
  isOpen,
  backup,
  initialMode = "server_file",
  onClose,
  onSuccess,
}: RestoreModalProps) {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedMode, setSelectedMode] = useState<"server_file" | "external_upload" | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [confirmationPhrase, setConfirmationPhrase] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeMode: "server_file" | "external_upload" =
    selectedMode ?? (backup && initialMode === "server_file" ? "server_file" : "external_upload");

  if (!isOpen) return null;

  const isPhraseMatching = confirmationPhrase.trim() === RESTORE_CONFIRMATION_PHRASE;
  const isTargetReady = activeMode === "server_file" ? Boolean(backup) : Boolean(uploadedFile);
  const isSubmitDisabled = !isTargetReady || !isPhraseMatching || !password.trim() || loading;

  const handleClose = () => {
    if (loading) return;
    setSelectedMode(null);
    setConfirmationPhrase("");
    setPassword("");
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setError(null);
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".tar.gz") && !lowerName.endsWith(".tgz")) {
      setError("صيغة الملف غير مدعومة. يجب اختيار ملف أرشيف بصيغة (.tar.gz)");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size === 0) {
      setError("ملف الأرشيف المختار فارغ أو تالف");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_EXTERNAL_RESTORE_BYTES) {
      setError("حجم ملف الأرشيف يتجاوز الحد الأقصى المسموح به (2 جيجابايت)");
      setUploadedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setError(null);
    setUploadedFile(file);
  };

  const handleRemoveUploadedFile = () => {
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRestore = async () => {
    if (isSubmitDisabled) return;

    setLoading(true);
    setError(null);

    try {
      let res: Response;

      if (activeMode === "external_upload") {
        if (!uploadedFile) {
          throw new Error("يرجى اختيار ملف الأرشيف الخارجي أولاً");
        }

        const formData = new FormData();
        formData.append("file", uploadedFile);
        formData.append("adminPassword", password);
        formData.append("confirmationPhrase", confirmationPhrase.trim());

        res = await fetch("/api/admin/backup/restore", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!backup) {
          throw new Error("لم يتم تحديد نسخة احتياطية من الخادم");
        }

        res = await fetch("/api/admin/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            backupId: backup.id,
            adminPassword: password,
            confirmationPhrase: confirmationPhrase.trim(),
          }),
        });
      }

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
      title="استعادة المنظومة والتعافي من الكوارث"
      icon={<RotateCcw className="w-4 h-4 text-(--color-primary)" />}
      overlayClassName="bg-black/40"
      panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
      bodyClassName="p-5 sm:p-6 space-y-4 text-right no-scrollbar"
      onClose={handleClose}
      footer={
        <ModalActions
          mode="action"
          submitText={
            activeMode === "external_upload"
              ? "تأكيد واستعادة من الأرشيف الخارجي"
              : "تأكيد واستعادة المنظومة"
          }
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
        {/* Source Selection Mode Tabs */}
        <div className="flex items-center gap-2 p-1 bg-(--app-surface-container) rounded-xl border border-(--app-border)">
          <button
            type="button"
            onClick={() => {
              setSelectedMode("server_file");
              setError(null);
            }}
            disabled={!backup || loading}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              activeMode === "server_file"
                ? "bg-(--app-surface) text-(--color-primary) shadow-sm"
                : "text-(--app-muted-foreground) hover:text-(--color-primary)"
            }`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span>نسخة محفوظة على الخادم</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedMode("external_upload");
              setError(null);
            }}
            disabled={loading}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeMode === "external_upload"
                ? "bg-(--app-surface) text-(--color-primary) shadow-sm"
                : "text-(--app-muted-foreground) hover:text-(--color-primary)"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>رفع أرشيف خارجي (.tar.gz)</span>
          </button>
        </div>

        {/* Selected Source Header */}
        {activeMode === "server_file" && backup && (
          <ModalHeaderCard
            icon={<Archive className="w-6 h-6 text-(--color-primary)" />}
            title={`النسخة المحددة: ${backup.filename}`}
            subtitle={`تاريخ إنشاء النسخة: ${new Date(backup.createdAt).toLocaleString("ar-EG")}`}
          />
        )}

        {/* External File Upload Zone */}
        {activeMode === "external_upload" && (
          <div className="space-y-2">
            {!uploadedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-(--color-primary)/30 hover:border-(--color-primary) rounded-2xl bg-(--color-primary)/5 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-10 h-10 rounded-full bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-(--color-primary)">
                    اضغط لاختيار ملف الأرشيف الخارجي من وسيط تخزين (Flash Drive)
                  </p>
                  <p className="text-[11px] font-bold text-(--app-muted-foreground) mt-0.5">
                    الصيغ المدعومة: أرشيف المنظومة المعتمد بصيغة .tar.gz (حد أقصى 2 جيجابايت)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".tar.gz,.tgz"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="p-3.5 bg-(--app-surface) border border-(--app-border) rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-(--color-primary)/10 text-(--color-primary) flex items-center justify-center">
                    <FileCheck className="w-5 h-5 text-(--color-primary)" />
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-(--app-foreground) truncate max-w-xs">
                      {uploadedFile.name}
                    </p>
                    <p className="text-[11px] font-bold text-(--app-muted-foreground) tabular-nums">
                      الحجم: {(uploadedFile.size / (1024 * 1024)).toFixed(2)} ميجابايت
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveUploadedFile}
                  disabled={loading}
                  title="إلغاء اختيار الملف"
                  className="p-1.5 rounded-lg text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container) transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Warning Alert Banner */}
        <div className="p-3.5 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-2xl text-xs font-bold text-(--color-primary) flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-(--color-primary) mt-0.5" />
          <div className="space-y-1">
            <p className="font-black text-(--color-primary)">تحذير أمني عالي الحساسية:</p>
            <p className="text-(--app-muted-foreground) leading-relaxed">
              عملية الاستعادة ستقوم بمسح واستبدال كافة بيانات المنظومة الحالية والمرفقات وإرجاعها
              للحالة المسجلة داخل هذا الأرشيف. لا يمكن التراجع عن هذه العملية بمجرد بدئها.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-(--color-primary) text-xs font-bold flex items-center gap-2">
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
              className="w-full px-3 py-2 pr-9 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
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
              className="w-full px-3 py-2 pr-9 bg-(--app-surface) border border-(--app-border) rounded-xl text-xs font-bold text-(--app-foreground) focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
            />
            <Lock className="w-4 h-4 text-(--app-muted-foreground) absolute right-3 top-2.5" />
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
