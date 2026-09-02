"use client";

import { useEffect } from "react";
import { isDatabaseError } from "@/lib/db/is-db-error";
import { Database, AlertTriangle, RefreshCcw, RotateCcw } from "lucide-react";
import "@/app/globals.css";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDb = isDatabaseError(error);

  useEffect(() => {
    console.error("Global caught error:", error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-2xl p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 mb-2">
            {isDb ? (
              <Database className="w-8 h-8" />
            ) : (
              <AlertTriangle className="w-8 h-8" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-black text-[#1E3C72]">
              {isDb ? "قاعدة البيانات غير جاهزة (فقد الاتصال)" : "حدث خطأ غير متوقع في النظام"}
            </h2>
            <p className="text-xs font-bold text-slate-600 leading-relaxed">
              {isDb
                ? "تعذر الاتصال بقاعدة البيانات الخاصة بالنظام. يرجى التأكد من تشغيل خادم قاعدة البيانات (MongoDB) والمحاولة مرة أخرى."
                : "عذراً، حدث خطأ عام في النظام."}
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={reset}
              className="w-full py-2.5 text-xs font-bold bg-[#1E3C72] hover:bg-[#2a5298] text-white rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>إعادة المحاولة</span>
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full py-2.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-200 flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تحديث الصفحة بالكامل</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
