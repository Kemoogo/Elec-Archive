import { Database, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DatabaseErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--app-background) p-4" dir="rtl">
      <div className="max-w-md w-full bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-depth-xl overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-2">
            <Database className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-(--color-primary) tracking-tight">قاعدة البيانات غير جاهزة</h1>
            <p className="text-xs font-bold text-(--app-muted-foreground) leading-relaxed">
              انقطع الاتصال بقاعدة البيانات الخاصة بالنظام. يرجى التأكد من تشغيل خادم MongoDB أو المحاولة مرة أخرى.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Link 
              href="/"
              className="btn-primary flex items-center justify-center gap-2 w-full py-3 px-6 text-xs font-bold shadow-lg shadow-(--color-primary)/20"
            >
              <RefreshCcw className="w-4 h-4" />
              <span>إعادة المحاولة والتحقق</span>
            </Link>
            
            <Link 
              href="/login"
              className="btn-secondary flex items-center justify-center gap-2 w-full py-3 px-6 text-xs font-bold"
            >
              <Home className="w-4 h-4" />
              <span>العودة لصفحة الدخول</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-(--app-surface-container) px-8 py-3 border-t border-(--app-border)">
          <p className="text-[11px] text-center text-(--app-muted-foreground) font-mono font-bold">
            STATUS: <span className="text-rose-600 dark:text-rose-400">DATABASE_UNAVAILABLE_503</span>
          </p>
        </div>
      </div>
    </div>
  );
}
