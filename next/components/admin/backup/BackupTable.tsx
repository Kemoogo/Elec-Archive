"use client";

import { Download, RotateCcw, Trash2, Calendar, HardDriveDownload, Layers } from "lucide-react";
import MainTable, { type TableColumn } from "@/components/ui/Table";
import { ActionButton } from "@/components/officers/OfficersTable";
import type { IBackupRecordItem } from "@/types/backup";

interface BackupTableProps {
  backups: IBackupRecordItem[];
  isLoading?: boolean;
  onDownload: (backup: IBackupRecordItem) => void;
  onRestore: (backup: IBackupRecordItem) => void;
  onDelete: (backup: IBackupRecordItem) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

export function BackupTable({
  backups,
  isLoading,
  onDownload,
  onRestore,
  onDelete,
}: BackupTableProps) {
  const columns: TableColumn<IBackupRecordItem>[] = [
    {
      header: "اسم ملف النسخة الاحتياطية",
      accessor: "filename",
      cellAlign: "right",
      render: (_, row) => (
        <div className="flex flex-col text-right">
          <span
            onClick={() => onDownload(row)}
            className="text-(--color-primary) font-black hover:underline hover:text-(--app-info) cursor-pointer select-all"
            title="انقر للتحميل المباشر"
          >
            {row.filename}
          </span>
          {row.checksumSha256 && (
            <span
              className="text-[10px] text-(--app-muted-foreground) font-mono truncate max-w-xs"
              title={`بصمة SHA-256: ${row.checksumSha256}`}
            >
              SHA-256: {row.checksumSha256.slice(0, 16)}...
            </span>
          )}
        </div>
      ),
    },
    {
      header: "نوع النسخة",
      accessor: "backupType",
      cellAlign: "center",
      render: (_, row) => {
        const isQuarterly = row.backupType === "quarterly_scheduled";
        const isIncremental = row.backupType === "incremental" || Boolean(row.isIncremental);
        return (
          <div className="flex items-center justify-center gap-1.5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold ${
                isQuarterly
                  ? "bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20"
                  : isIncremental
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  : "bg-(--app-surface-container) text-(--app-muted-foreground) border border-(--app-border)"
              }`}
              title={
                isIncremental && row.baseBackupFilename
                  ? `مستندة إلى النسخة الأساسية: ${row.baseBackupFilename}`
                  : undefined
              }
            >
              {isQuarterly ? (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  <span>آلي ربع سنوي ({row.quarter || "مجدول"})</span>
                </>
              ) : isIncremental ? (
                <>
                  <Layers className="w-3.5 h-3.5" />
                  <span>تصدير تزايدي (سريع)</span>
                </>
              ) : (
                <>
                  <HardDriveDownload className="w-3.5 h-3.5" />
                  <span>تصدير يدوي شامل</span>
                </>
              )}
            </span>
          </div>
        );
      },
    },
    {
      header: "حجم الأرشيف",
      accessor: "fileSizeBytes",
      cellAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {formatBytes(row.fileSizeBytes)}
        </span>
      ),
    },
    {
      header: "حجم البيانات",
      cellAlign: "center",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground) tabular-nums">
          {row.documentsCount.toLocaleString("ar-EG")} سجل ({row.collectionsCount} مجموعة)
        </span>
      ),
    },
    {
      header: "الجهة المنشئة",
      accessor: "createdByName",
      cellAlign: "right",
      render: (_, row) => (
        <span className="text-xs font-bold text-(--app-muted-foreground)">
          {row.createdByName}
        </span>
      ),
    },
    {
      header: "تاريخ ووقت الإنشاء",
      accessor: "createdAt",
      cellAlign: "center",
      render: (_, row) => {
        const d = new Date(row.createdAt);
        return (
          <div className="flex flex-col items-center text-xs font-bold text-(--app-muted-foreground) tabular-nums">
            <span>{d.toLocaleDateString("ar-EG")}</span>
            <span className="text-[10px] text-(--app-muted-foreground)/80">
              {d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>
        );
      },
    },
    {
      header: "الإجراءات",
      cellAlign: "center",
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <ActionButton
            icon={<Download className="w-4 h-4" />}
            color="btn-action-primary text-(--color-primary) hover:text-(--app-info)"
            title="تحميل ملف النسخة الاحتياطية (.tar.gz)"
            onClick={() => onDownload(row)}
          />
          <ActionButton
            icon={<RotateCcw className="w-4 h-4" />}
            color="btn-action-primary text-(--color-primary) hover:text-(--app-info)"
            title="استعادة المنظومة من هذه النسخة"
            onClick={() => onRestore(row)}
          />
          <ActionButton
            icon={<Trash2 className="w-4 h-4" />}
            color="text-red-500 hover:text-red-700 hover:bg-red-500/10"
            title="حذف النسخة من الخادم"
            onClick={() => onDelete(row)}
          />
        </div>
      ),
    },
  ];

  return (
    <MainTable
      columns={columns}
      data={backups}
      showSerialNumber
      isLoading={isLoading}
      emptyTitle="لا توجد نسخ احتياطية مسجلة حالياً"
      emptyDescription="يمكنك الضغط على زر تصدير نسخة فورية أعلاه لأخذ نسخة احتياطية كاملة للمنظومة."
    />
  );
}
