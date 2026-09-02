"use client";

import { useEffect } from "react";
import { isDatabaseError } from "@/lib/db/is-db-error";
import { Database, AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDb = isDatabaseError(error);

  useEffect(() => {
    console.error("Root caught error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-depth-lg p-8 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2">
          {isDb ? (
            <Database className="w-8 h-8" />
          ) : (
            <AlertTriangle className="w-8 h-8" />
          )}
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-(--color-primary)">
            {isDb ? "قاعدة البيانات غير جاهزة (فقد الاتصال)" : "حدث خطأ غير متوقع"}
          </h2>
          <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
            {isDb
              ? "تعذر الاتصال بقاعدة البيانات الخاصة بالنظام. يرجى التأكد من تشغيل خادم قاعدة البيانات (MongoDB) والمحاولة مرة أخرى."
              : "عذراً، حدث خطأ غير متوقع أثناء معالجة الطلب."}
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-2">
          <button
            type="button"
            onClick={reset}
            className="btn-primary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>إعادة المحاولة</span>
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-secondary w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>تحديث الصفحة بالكامل</span>
          </button>
        </div>
      </div>
    </div>
  );
}
