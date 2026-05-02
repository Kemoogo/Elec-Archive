"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { getSafeRedirectUrl } from "@/lib/utils/redirect";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const rawRedirect = searchParams.get("redirect");
  const redirectTo = getSafeRedirectUrl(rawRedirect);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error ?? "حدث خطأ أثناء تسجيل الدخول", "error");
        return;
      }

      showToast("تم تسجيل الدخول بنجاح", "success");
      router.push(redirectTo);
      router.refresh();
    } catch {
      showToast("حدث خطأ في الاتصال بالخادم", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleForgotPassword = () => {
    showToast('برجاء الاتصال بمدير النظام لإستعادة كلمة المرور', 'info');
  };

  return (
    <div className="bg-white w-full rounded-3xl shadow-2xl relative overflow-hidden text-(--app-muted-foreground) border border-slate-100" dir="rtl">
      <div className="p-7">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-[#1e3c72]">تسجيل الدخول</h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">مرحباً بك في الأرشيف الإلكتروني</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-right">
            <label htmlFor='username-login' className="text-sm font-bold text-(--app-muted-foreground) block mr-1">اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id='username-login'
                type="text"
                required
                className="w-full pl-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 focus:placeholder-transparent transition-all text-right text-(--app-foreground)"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor='password-login' className="text-sm font-bold text-(--app-muted-foreground) block mr-1">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                id='password-login'
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none  focus:ring-blue-500/20 focus:border-blue-500 focus:placeholder-transparent transition-all text-right text-(--app-foreground)"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#1e3c72] transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1e3c72] hover:bg-[#2a5298] text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-4 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>جاري التحقق...</span>
              </>
            ) : (
              <span>تسجيل الدخول</span>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm font-semibold text-slate-500 hover:text-[#1e3c72] transition-colors border-none bg-none cursor-pointer"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </form>
      </div>

      <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
        <p className="text-xs text-slate-400 font-medium">نظام الأرشيف الإلكتروني &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
