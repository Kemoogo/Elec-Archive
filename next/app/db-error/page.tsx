import { ShieldAlert, RefreshCcw, Home } from "lucide-react";
import Link from "next/link";

export default function DatabaseErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-(--app-background) p-4" dir="rtl">
      <div className="max-w-md w-full bg-(--app-surface) border border-(--app-border) rounded-2xl shadow-xl overflow-hidden">
        <div className="p-8 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-(--app-error)/10 text-(--app-error) mb-2">
            <ShieldAlert className="w-10 h-10" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-(--color-primary) tracking-tight">عذراً، لا يمكن الوصول لقاعدة البيانات</h1>
            <p className="text-(--app-muted-foreground) leading-relaxed">
              نواجه حالياً مشكلة في الاتصال بقاعدة البيانات الخاصة بالنظام. يرجى التأكد من تشغيل خادم MongoDB أو المحاولة مرة أخرى لاحقاً.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <Link 
              href="/"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-(--color-primary) hover:bg-(--color-primary-hover) text-white font-bold rounded-xl transition-all shadow-lg shadow-(--color-primary)/20"
            >
              <RefreshCcw className="w-5 h-5" />
              إعادة المحاولة
            </Link>
            
            <Link 
              href="/login"
              className="flex items-center justify-center gap-2 w-full py-3.5 px-6 bg-(--app-surface-container) hover:bg-(--app-border) text-(--app-foreground) font-bold rounded-xl transition-all border border-(--app-border)"
            >
              <Home className="w-5 h-5" />
              العودة للرئيسية
            </Link>
          </div>
        </div>
        
        <div className="bg-(--app-surface-container) px-8 py-4 border-t border-(--app-border)">
          <p className="text-xs text-center text-(--app-muted-foreground) font-medium">
            Error Code: <span className="font-mono text-(--app-error)">DATABASE_CONNECTION_ERROR_503</span>
          </p>
        </div>
      </div>
    </div>
  );
}
