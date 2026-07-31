"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Lock, User, Loader2, Eye, EyeOff } from 'lucide-react';
import { BrandIcon } from '@/components/ui/brand-icon';
import { extractApiError } from "@/lib/utils";
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
        const errorMsg = extractApiError(data, "حدث خطأ أثناء تسجيل الدخول");
        showToast(errorMsg, "error");
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
    <div className="bg-(--app-surface) w-full rounded-3xl shadow-2xl relative overflow-hidden text-(--app-muted-foreground) border border-(--app-border)" dir="rtl">
      <div className="p-7">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <BrandIcon size="xl" showGlow />
          </div>
          <h2 className="text-xl font-bold text-(--color-primary)">تسجيل الدخول</h2>
          <p className="text-(--app-foreground) mt-1 text-sm font-medium">مرحباً بك في الأرشيف الإلكتروني</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-right">
            <label htmlFor='username-login' className="text-sm font-bold text-(--app-muted-foreground) block mr-1">اسم المستخدم</label>
            <div className="relative">
              <User className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--app-muted-foreground)" />
              <input
                id='username-login'
                type="text"
                required
                className="w-full pl-4 pr-12 py-3.5 bg-(--app-surface-container) border border-(--app-border) rounded-2xl focus:outline-none  focus:ring-(--app-info)/20 focus:border-(--app-info) focus:placeholder-transparent transition-all text-right text-(--app-foreground)"
                placeholder="اسم المستخدم"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor='password-login' className="text-sm font-bold text-(--app-muted-foreground) block mr-1">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-(--app-muted-foreground)" />
              <input
                id='password-login'
                type={showPassword ? "text" : "password"}
                required
                className="w-full pl-12 pr-12 py-3.5 bg-(--app-surface-container) border border-(--app-border) rounded-2xl focus:outline-none  focus:ring-(--app-info)/20 focus:border-(--app-info) focus:placeholder-transparent transition-all text-right text-(--app-foreground)"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-(--app-muted-foreground) hover:text-(--color-primary) transition-colors p-1"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-(--color-primary) hover:bg-(--color-primary-hover) text-white font-bold py-4 rounded-2xl shadow-lg shadow-(--color-primary)/20 hover:shadow-xl hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 mt-4 cursor-pointer"
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
              className="text-sm font-semibold text-(--app-foreground) hover:text-(--color-primary) transition-colors border-none bg-none cursor-pointer"
            >
              نسيت كلمة المرور؟
            </button>
          </div>
        </form>
      </div>

      <div className="bg-(--app-surface-container) p-4 text-center border-t border-(--app-border)">
        <p className="text-xs text-(--app-muted-foreground) font-medium">نظام الأرشيف الإلكتروني &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
