"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown, Palette, History, Settings, ShieldCheck, Building2 } from "lucide-react";
import type { ModulePermissions } from "@/lib/auth/types";

const roleLabels: Record<string, string> = {
  admin: "مسؤول النظام",
  commander: "قائد الوحدة",
  employee: "موظف",
  viewer: "مشاهد",
};

interface UserMenuProps {
  fullName: string;
  role: string;
  permissions?: ModulePermissions;
}

export function UserMenu({ fullName, role, permissions: _permissions }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const canManageDepartments = role === "admin";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-2.5 px-3.5 h-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/35 text-white font-extrabold text-xs sm:text-sm transition-all duration-200 shadow-sm active:scale-95 cursor-pointer"
        aria-label="الحساب"
      >
        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 group-hover:scale-105 transition-transform">
          <User className="w-3.5 h-3.5" />
        </div>
        <span className="truncate max-w-[120px]">{fullName}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-blue-200 transition-transform duration-300 ${
            open ? "rotate-180 text-white" : ""
          }`}
        />
      </button>

      <div
        className={`absolute left-0 top-full mt-2.5 w-60 rounded-2xl bg-(--app-surface)/98 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-(--app-border) overflow-hidden text-(--app-muted-foreground) z-50 origin-top-left transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
        }`}
        dir="rtl"
      >
        <div className="p-4 bg-(--app-surface-container-low)/80 border-b border-(--app-border) flex items-center gap-3">
          <div className="p-2.5 bg-(--color-primary) rounded-xl text-white shadow-md shadow-blue-900/20">
            <User className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-sm font-extrabold text-(--app-foreground) truncate">{fullName}</span>
            <span className="inline-flex items-center gap-1 w-fit mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <ShieldCheck className="w-3 h-3" />
              <span>{roleLabels[role] ?? role}</span>
            </span>
          </div>
        </div>

        <div className="p-2 space-y-0.5">
          <button
            onClick={() => {
              setOpen(false);
              router.push("/profile");
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--app-foreground) transition-colors hover:bg-(--app-surface-container) cursor-pointer text-right"
          >
            <User className="w-4 h-4 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors" />
            <span>الملف الشخصي وكلمة المرور</span>
          </button>
          {role === "admin" && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/admin/users");
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--app-foreground) transition-colors hover:bg-(--app-surface-container) cursor-pointer text-right"
            >
              <Settings className="w-4 h-4 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors" />
              <span>إدارة المستخدمين والصلاحيات</span>
            </button>
          )}
          {canManageDepartments && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/admin/departments");
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--app-foreground) transition-colors hover:bg-(--app-surface-container) cursor-pointer text-right"
            >
              <Building2 className="w-4 h-4 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors" />
              <span>إدارة الفروع والأقسام</span>
            </button>
          )}
          {role === "admin" && (
            <button
              onClick={() => {
                setOpen(false);
                router.push("/audit-log");
              }}
              className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--app-foreground) transition-colors hover:bg-(--app-surface-container) cursor-pointer text-right"
            >
              <History className="w-4 h-4 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors" />
              <span>سجل الحركات والتغييرات</span>
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              router.push("/theme-playground");
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-(--app-foreground) transition-colors hover:bg-(--app-surface-container) cursor-pointer text-right"
          >
            <Palette className="w-4 h-4 text-(--app-muted-foreground) group-hover:text-(--color-primary) transition-colors" />
            <span>لوحة التصميم المتقدمة</span>
          </button>
          <button
            onClick={handleLogout}
            disabled={loading}
            className="group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-500/10 disabled:opacity-50 cursor-pointer text-right mt-1 border-t border-(--app-border)/40 pt-2"
          >
            <LogOut className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
            <span>{loading ? "جاري الخروج..." : "تسجيل الخروج"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
