"use client";

import { HardDrive, AlertTriangle, ShieldCheck } from "lucide-react";
import type { IStorageStats } from "@/types/backup";

interface StorageMeterProps {
  storage: IStorageStats;
  retentionCap?: number;
  activeCount?: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 بايت";
  const k = 1024;
  const sizes = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت", "تيرابايت"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = parseFloat((bytes / Math.pow(k, i)).toFixed(1));
  return `${val} ${sizes[i]}`;
}

export function StorageMeter({
  storage,
  retentionCap = 4,
  activeCount = 0,
}: StorageMeterProps) {
  const usedPercentage = Math.min(100, Math.max(0, 100 - storage.freePercentage));
  const isCritical = storage.isWarning;

  return (
    <div className="bg-(--app-surface) border border-(--app-border) rounded-2xl p-5 shadow-sm space-y-4 text-right">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-(--color-primary)/10 border border-(--color-primary)/20 flex items-center justify-center text-(--color-primary) shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-(--color-primary)">
              سعة وحدة التخزين وسياسة التدوير
            </h3>
            <p className="text-xs font-bold text-(--app-muted-foreground)">
              المساحة المخصصة لقاعدة البيانات والمرفقات والنسخ الاحتياطية
            </p>
          </div>
        </div>

        {/* Retention Cap Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-(--color-primary)/5 border border-(--color-primary)/15 rounded-xl text-xs font-bold text-(--color-primary) self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-(--color-primary)" />
          <span>
            النسخ المحفوظة:{" "}
            <span className="font-black tabular-nums">{activeCount}</span> /{" "}
            <span className="font-black tabular-nums">{retentionCap}</span> (سقف التدوير)
          </span>
        </div>
      </div>

      {/* Warning Notice if free space is under 20% */}
      {isCritical && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            تنبيه: المساحة الحرة على الخادم أقل من 20% ({storage.freePercentage}% متبقية). قد يتم تقييد عمليات النسخ الجديدة لتفادي امتلاء القرص.
          </span>
        </div>
      )}

      {/* Storage Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-(--app-muted-foreground)">
            المساحة المستخدمة:{" "}
            <span className="text-(--color-primary) font-black tabular-nums">
              {formatBytes(storage.usedBytes)}
            </span>{" "}
            ({usedPercentage.toFixed(1)}%)
          </span>
          <span className="text-(--app-muted-foreground)">
            المساحة الحرة:{" "}
            <span
              className={
                isCritical
                  ? "text-red-500 font-black tabular-nums"
                  : "text-(--color-primary) font-black tabular-nums"
              }
            >
              {formatBytes(storage.freeBytes)}
            </span>{" "}
            ({storage.freePercentage}%)
          </span>
        </div>

        <div className="w-full h-3 bg-(--app-surface-container) rounded-full overflow-hidden border border-(--app-border)">
          <div
            className={`h-full transition-all duration-500 ${
              isCritical ? "bg-red-500" : "bg-(--color-primary)"
            }`}
            style={{ width: `${usedPercentage}%` }}
          />
        </div>

        <div className="flex justify-end text-[11px] font-bold text-(--app-muted-foreground)">
          <span>إجمالي سعة وحدة التخزين: {formatBytes(storage.totalBytes)}</span>
        </div>
      </div>
    </div>
  );
}
