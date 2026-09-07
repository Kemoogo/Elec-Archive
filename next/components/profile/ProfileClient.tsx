"use client";

import { useState } from "react";
import { ModernPageHeader as PageHeader } from "@/components/layout/ModernPageHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { SectionWrapper } from "@/components/ui/section-wrapper";
import { FormInput, FormLabel } from "@/components/ui/form-fields";
import { MonoBadge } from "@/components/ui/mono-badge";
import { useToast } from "@/components/ui/toast";
import { extractApiError } from "@/lib/utils";
import {
  User,
  KeyRound,
  ShieldCheck,
  Building2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Hash,
  Shield,
  Calendar,
  LucideIcon,
} from "lucide-react";
import type { UserRole, ModulePermissions } from "@/lib/auth/types";

const roleLabels: Record<string, string> = {
  admin: "مسؤول النظام",
  commander: "قائد الوحدة",
  employee: "موظف",
  viewer: "مشاهد",
};

interface InfoItemProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

function InfoItem({ icon: Icon, label, value, mono = false }: InfoItemProps) {
  return (
    <div className="group flex gap-4 p-4 rounded-xl transition-all hover:bg-(--color-primary)/5 border border-transparent hover:border-(--color-primary)/10 hover:shadow-sm">
      <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-(--app-surface-container) border border-(--app-border) group-hover:bg-(--color-primary) group-hover:border-(--color-primary) group-hover:shadow-lg group-hover:shadow-(--color-primary)/20 transition-all duration-300">
        <Icon className="h-5 w-5 text-(--app-muted-foreground) group-hover:text-white transition-all duration-300" />
      </div>
      <div className="flex flex-col justify-center gap-0.5 text-right">
        <span className="text-[11px] font-bold uppercase tracking-wide text-(--app-muted-foreground)/70 group-hover:text-(--color-primary)/80 transition-colors">
          {label}
        </span>
        <div className={`text-base font-bold text-(--color-primary) leading-tight ${mono ? 'font-mono tracking-tight' : ''}`}>
          {value}
        </div>
      </div>
    </div>
  );
}

interface ProfileClientProps {
  user: {
    id: string;
    username: string;
    fullName: string;
    role: UserRole;
    department?: string;
    permissions?: ModulePermissions;
    createdAt?: string;
  };
}

export function ProfileClient({ user }: ProfileClientProps) {
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!currentPassword) {
      setError("يرجى إدخال كلمة المرور الحالية");
      return;
    }

    if (!newPassword || newPassword.length < 8) {
      setError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    if (!/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError("كلمة المرور الجديدة يجب أن تحتوي على أحرف وأرقام معاً");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمة المرور الجديدة وتأكيدها غير متطابقين");
      return;
    }

    if (currentPassword === newPassword) {
      setError("كلمة المرور الجديدة يجب أن تكون مختلفة عن كلمة المرور الحالية");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(extractApiError(data, "فشل تغيير كلمة المرور"));
      }

      showToast("تم تحديث كلمة المرور بنجاح", "success");
      setSuccessMsg("تم تغيير كلمة المرور بنجاح وحفظها في النظام.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      const msg = (err as Error).message || "حدث خطأ غير متوقع";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer className="max-w-[1400px] mx-auto pb-12">
      <PageHeader
        title="الملف الشخصي"
        description="سجل بيانات الحساب وتحديث كلمة المرور"
        icon={<User className="w-6 h-6" />}
      />

      {/* Main Grid — 2/3 Profile Info & 1/3 Password Change Card (Exact Officer Basic Info Architecture) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Right side (in RTL) 2-Cols: Account Profile & Details */}
        <div className="lg:col-span-2 space-y-8">
          <SectionWrapper>
            <div className="space-y-8">
              {/* Header Profile Identity Block */}
              <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="relative group">
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-(--app-surface-container) border-2 border-(--app-border) flex items-center justify-center text-(--color-primary) shadow-sm overflow-hidden shrink-0">
                      <User className="w-14 h-14 sm:w-16 sm:h-16 text-(--app-muted-foreground)" />
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 pt-1 text-right">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-3.5 py-1.5 bg-(--color-primary) text-white text-xs font-bold rounded-xl shadow-md cursor-default">
                          {roleLabels[user.role] ?? user.role}
                        </span>
                      </div>
                      <h1 className="text-3xl sm:text-4xl font-extrabold text-(--color-primary) tracking-tight leading-tight">
                        {user.fullName}
                      </h1>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <MonoBadge
                        label="اسم المستخدم"
                        value={`@${user.username}`}
                        icon={<Hash className="w-4 h-4" />}
                        size="lg"
                        variant="primary"
                      />
                      <MonoBadge
                        label="حالة الحساب"
                        value="نشط ومفعل"
                        icon={<ShieldCheck className="w-4 h-4" />}
                        size="lg"
                        variant="surface"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detailed Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 items-center gap-4 pt-6 border-t border-(--app-border)">
                <InfoItem icon={User} label="الاسم بالكامل" value={user.fullName} />
                <InfoItem icon={Hash} label="اسم المستخدم" value={`@${user.username}`} mono />
                <InfoItem icon={Shield} label="نوع الحساب / الدور" value={roleLabels[user.role] ?? user.role} />
                <InfoItem icon={Building2} label="الفرع / القسم" value={user.department || "القيادة العامة"} />
                <InfoItem icon={ShieldCheck} label="حالة الحساب" value="قيد التشغيل والخدمة" />
                <InfoItem
                  icon={Calendar}
                  label="تاريخ إنشاء الحساب"
                  value={
                    user.createdAt ? (
                      <MonoBadge
                        value={new Date(user.createdAt).toLocaleDateString("ar-EG", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        variant="surface"
                        size="md"
                      />
                    ) : (
                      "غير محدد"
                    )
                  }
                />
              </div>
            </div>
          </SectionWrapper>
        </div>

        {/* Left side (in RTL) 1-Col: Password Change Card */}
        <div className="space-y-8">
          <SectionWrapper>
            <div className="space-y-5 text-right">
              {/* Header Title */}
              <div className="flex items-center gap-3 pb-3 border-b border-(--app-border)">
                <div className="p-2.5 bg-(--color-primary)/10 text-(--color-primary) rounded-xl border border-(--color-primary)/20">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-(--color-primary)">
                    تغيير كلمة المرور
                  </h3>
                  <p className="text-xs font-bold text-(--app-muted-foreground) mt-0.5">
                    تحديث كلمة المرور لحماية وتأمين الحساب
                  </p>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Password */}
                <div className="space-y-1.5">
                  <FormLabel required>كلمة المرور الحالية</FormLabel>
                  <div className="relative">
                    <FormInput
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 text-left font-mono tracking-wider"
                      dir="ltr"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-(--color-primary) transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showCurrent ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1.5">
                  <FormLabel required>كلمة المرور الجديدة</FormLabel>
                  <div className="relative">
                    <FormInput
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 text-left font-mono tracking-wider"
                      dir="ltr"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-(--color-primary) transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showNew ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-(--app-muted-foreground)">
                    8 أحرف على الأقل، تتضمن حروفاً وأرقاماً.
                  </p>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1.5">
                  <FormLabel required>تأكيد كلمة المرور</FormLabel>
                  <div className="relative">
                    <FormInput
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 text-left font-mono tracking-wider"
                      dir="ltr"
                      autoComplete="new-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-(--color-primary) transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                      aria-label={showConfirm ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-2.5 text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        <span>جاري حفظ كلمة المرور...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>حفظ كلمة المرور الجديدة</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </SectionWrapper>
        </div>
      </div>
    </PageContainer>
  );
}
