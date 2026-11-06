"use client";

import { useState, useCallback } from "react";
import {
  HardDriveDownload,
  Calendar,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Loader2,
  Layers,
} from "lucide-react";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { StorageMeter } from "./StorageMeter";
import { BackupTable } from "./BackupTable";
import { RestoreModal } from "./RestoreModal";
import { ModalShell, ModalHeaderCard } from "@/components/ui/modal-shell";
import { ModalActions } from "@/components/ui/modal-actions";
import { useToast } from "@/components/ui/toast";
import type { IBackupRecordItem, IStorageStats } from "@/types/backup";

interface BackupManagementClientProps {
  initialBackups: IBackupRecordItem[];
  initialStorage: IStorageStats;
  retentionCap?: number;
}

export function BackupManagementClient({
  initialBackups,
  initialStorage,
  retentionCap = 4,
}: BackupManagementClientProps) {
  const { showToast } = useToast();
  const [backups, setBackups] = useState<IBackupRecordItem[]>(initialBackups);
  const [storage, setStorage] = useState<IStorageStats>(initialStorage);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingIncremental, setIsExportingIncremental] = useState(false);
  const [isQuarterlyLoading, setIsQuarterlyLoading] = useState(false);

  // Modals state
  const [selectedBackupForRestore, setSelectedBackupForRestore] =
    useState<IBackupRecordItem | null>(null);
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);

  const [backupToDelete, setBackupToDelete] = useState<IBackupRecordItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh list and storage stats from server
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/backup");
      const json = await res.json();
      if (json.success && json.data) {
        setBackups(json.data.backups);
        setStorage(json.data.storage);
      }
    } catch (err) {
      console.error("Failed to fetch backups:", err);
      showToast("فشل تحديث قائمة النسخ الاحتياطية", "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  // Handle immediate On-Demand Export
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      showToast("جاري إنشاء النسخة الاحتياطية وتجميع الملفات...", "info");
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل إنشاء النسخة الاحتياطية");
      }

      showToast("تم إنشاء النسخة الاحتياطية بنجاح، جاري بدء التنزيل...", "success");

      // Auto-trigger browser download
      if (json.data?.downloadUrl) {
        const link = document.createElement("a");
        link.href = json.data.downloadUrl;
        link.download = json.data.filename || "backup.tar.gz";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع أثناء التصدير";
      showToast(msg, "error");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Incremental Export (modified files and records only)
  const handleExportIncremental = async () => {
    if (isExportingIncremental || isExporting) return;
    setIsExportingIncremental(true);

    try {
      showToast("جاري فحص التغييرات وتجهيز النسخة التزايدية...", "info");
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isIncremental: true }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل إنشاء النسخة التزايدية");
      }

      showToast("تم إنشاء النسخة التزايدية بنجاح، جاري بدء التنزيل...", "success");

      // Auto-trigger browser download
      if (json.data?.downloadUrl) {
        const link = document.createElement("a");
        link.href = json.data.downloadUrl;
        link.download = json.data.filename || "backup-incremental.tar.gz";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء التصدير التزايدي";
      showToast(msg, "error");
    } finally {
      setIsExportingIncremental(false);
    }
  };

  // Handle triggering quarterly backup
  const handleQuarterlyTrigger = async () => {
    if (isQuarterlyLoading) return;
    setIsQuarterlyLoading(true);

    try {
      showToast("جاري معالجة وتوليد النسخة الربع سنوية...", "info");
      const res = await fetch("/api/admin/backup/quarterly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force: true }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل توليد النسخة الربع سنوية");
      }

      showToast(json.message || "تم إنشاء النسخة الربع سنوية بنجاح", "success");
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء معالجة النسخة الربع سنوية";
      showToast(msg, "error");
    } finally {
      setIsQuarterlyLoading(false);
    }
  };

  // Handle direct download
  const handleDownload = (backup: IBackupRecordItem) => {
    const link = document.createElement("a");
    link.href = `/api/admin/backup/download/${backup.id}`;
    link.download = backup.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle open restore modal
  const handleOpenRestore = (backup: IBackupRecordItem) => {
    setSelectedBackupForRestore(backup);
    setIsRestoreModalOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = async () => {
    if (!backupToDelete || isDeleting) return;
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/admin/backup/${backupToDelete.id}`, {
        method: "DELETE",
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "فشل حذف النسخة الاحتياطية");
      }

      showToast("تم حذف النسخة الاحتياطية بنجاح", "success");
      setBackupToDelete(null);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الحذف";
      showToast(msg, "error");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <PageContainer className="max-w-[1600px] mx-auto pb-12 space-y-6">
      {/* Modern Header with Action Buttons */}
      <PageHeader
        title="إدارة وتدوير النسخ الاحتياطية"
        icon={<HardDriveDownload className="w-6 h-6" />}
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={isLoading}
              className="btn-secondary"
              title="تحديث القائمة"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">تحديث</span>
            </button>

            <button
              type="button"
              onClick={handleQuarterlyTrigger}
              disabled={isQuarterlyLoading || isExporting || isExportingIncremental}
              className="btn-secondary"
              title="توليد نسخة ربع سنوية الآن وتطبيق سقف الـ 4 نسخ"
            >
              {isQuarterlyLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-(--color-primary)" />
              ) : (
                <Calendar className="w-4 h-4 text-(--color-primary)" />
              )}
              <span>نسخة ربع سنوية</span>
            </button>

            <button
              type="button"
              onClick={handleExportIncremental}
              disabled={isExporting || isExportingIncremental || isQuarterlyLoading}
              className="btn-secondary"
              title="تصدير تزايدي سريع: يشمل فقط الملفات والسجلات المعدلة منذ آخر نسخة"
            >
              {isExportingIncremental ? (
                <Loader2 className="w-4 h-4 animate-spin text-(--color-primary)" />
              ) : (
                <Layers className="w-4 h-4 text-(--color-primary)" />
              )}
              <span>تصدير تزايدي</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isExportingIncremental || isQuarterlyLoading}
              className="btn-primary"
              title="تصدير وتحميل نسخة فورية شاملة لكافة البيانات والمرفقات"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <HardDriveDownload className="w-4 h-4" />
              )}
              <span>تصدير نسخة فورية</span>
            </button>
          </div>
        }
      />

      {/* Storage and Retention Meter Card */}
      <StorageMeter
        storage={storage}
        retentionCap={retentionCap}
        activeCount={backups.length}
      />

      {/* Backups MainTable Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-(--color-primary)">
            النسخ الاحتياطية المتوفرة على الخادم
          </h2>
          <span className="text-xs font-bold text-(--app-muted-foreground)">
            إجمالي النسخ المسجلة:{" "}
            <span className="font-black text-(--color-primary) tabular-nums">
              {backups.length}
            </span>
          </span>
        </div>

        <BackupTable
          backups={backups}
          isLoading={isLoading}
          onDownload={handleDownload}
          onRestore={handleOpenRestore}
          onDelete={(backup) => setBackupToDelete(backup)}
        />
      </div>

      {/* Restore Confirmation Modal */}
      <RestoreModal
        isOpen={isRestoreModalOpen}
        backup={selectedBackupForRestore}
        onClose={() => {
          setIsRestoreModalOpen(false);
          setSelectedBackupForRestore(null);
        }}
        onSuccess={fetchData}
      />

      {/* Manual Delete Confirmation Modal */}
      {backupToDelete && (
        <ModalShell
          title="تأكيد حذف النسخة الاحتياطية"
          icon={<Trash2 className="w-4 h-4 text-red-500" />}
          titleVariant="danger"
          overlayClassName="bg-black/40"
          panelClassName="max-w-md border-(--app-border) shadow-depth-xl"
          bodyClassName="p-5 space-y-4 text-right no-scrollbar"
          onClose={() => !isDeleting && setBackupToDelete(null)}
          footer={
            <ModalActions
              mode="action"
              destructiveText="تأكيد الحذف النهائي"
              onDestructive={handleConfirmDelete}
              destructiveLoading={isDeleting}
              onCancel={() => setBackupToDelete(null)}
              cancelText="إلغاء"
            />
          }
        >
          <div className="space-y-3 text-right">
            <ModalHeaderCard
              icon={<Trash2 className="w-6 h-6 text-red-500" />}
              title={backupToDelete.filename}
              subtitle={`تاريخ الإنشاء: ${new Date(backupToDelete.createdAt).toLocaleString("ar-EG")}`}
            />

            <div className="p-3 bg-(--color-primary)/5 border border-(--color-primary)/20 rounded-xl text-xs font-bold text-(--color-primary) flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
              <span>
                هل أنت متأكد من رغبتك في حذف ملف هذه النسخة نهائياً من وسيط التخزين على الخادم؟ لا يمكن التراجع عن هذا الإجراء.
              </span>
            </div>
          </div>
        </ModalShell>
      )}
    </PageContainer>
  );
}
