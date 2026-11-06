"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Menu,
  X,
  FileText,
  Shield,
  Settings,
  Swords,
  GraduationCap,
  BookOpen,
  Stethoscope,
  ClipboardList,
  ScrollText,
  History,
  LogOut,
  User,
  LayoutDashboard,
  Building2,
  Palette,
  ShieldCheck,
  DatabaseBackup,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { BrandIcon } from "@/components/ui/brand-icon";

const iconMap: Record<string, typeof FileText> = {
  "/": LayoutDashboard,
  "/dashboard": LayoutDashboard,
  "/admin/users": Settings,
  "/admin/departments": Building2,
  "/fax": FileText,
  "/officers": Shield,
  "/officers/rollcall": ClipboardList,
  "/officers/leaves": ScrollText,
  "/medical": Stethoscope,
  "/students": GraduationCap,
  "/education": BookOpen,
  "/arkan-harb": Swords,
  "/arkan-harb/rollcall": ClipboardList,
  "/arkan-harb?tab=rollcall": ClipboardList,
  "/arkan-harb/leaves": ScrollText,
  "/arkan-harb/missions": FileText,
  "/arkan-harb/positions": Shield,
  "/audit-log": History,
  "/theme-playground": Palette,
};

const roleLabels: Record<string, string> = {
  admin: "مسؤول النظام",
  commander: "قائد الوحدة",
  employee: "موظف",
  viewer: "مشاهد",
};

interface MobileDrawerProps {
  navItems: { href: string; label: string }[];
  user: { fullName: string; role: string };
}

export function MobileDrawer({ navItems, user }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close only when route actually changes
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/dashboard" || href === "/") {
      return pathname === "/" || pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const isAdmin = user.role === "admin";

  const drawerContent = (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-60 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel — slides in from right side (RTL natural direction) */}
      <div
        className={`fixed top-0 right-0 h-[100dvh] w-[310px] max-w-[85vw] z-60 bg-(--app-surface) shadow-2xl border-l border-(--app-border) transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل"
      >
        {/* Drawer Header — User Info + Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-(--app-border) bg-(--app-surface-container-low)/60">
          <div className="flex items-center gap-3 min-w-0">
            <BrandIcon size="md" showGlow />
            <div className="flex flex-col min-w-0 text-right">
              <span className="text-sm font-extrabold text-(--color-primary) truncate">
                {user.fullName}
              </span>
              <span className="inline-flex items-center gap-1 w-fit mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-(--color-primary)/10 text-(--color-primary) border border-(--color-primary)/20">
                <ShieldCheck className="w-3 h-3 shrink-0" />
                <span>{roleLabels[user.role] ?? user.role}</span>
              </span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl hover:bg-(--app-surface-container) text-(--app-muted-foreground) hover:text-(--color-primary) transition-all duration-200 active:scale-90 cursor-pointer shrink-0"
            aria-label="إغلاق القائمة"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 no-scrollbar">
          {/* Main Module Nav Items */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-[11px] font-extrabold text-(--app-muted-foreground)">
              الوحدات والمنظومات
            </div>
            {navItems.map((item) => {
              const Icon = iconMap[item.href] || FileText;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                    active
                      ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                      : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                  }`}
                >
                  <div
                    className={`p-1.5 rounded-lg transition-colors ${
                      active
                        ? "bg-(--color-primary)/20 text-(--color-primary)"
                        : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>
                  <span className="truncate">{item.label}</span>
                  {active && (
                    <span className="mr-auto w-1.5 h-1.5 rounded-full bg-(--color-primary) shrink-0" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Admin & System Operations */}
          {isAdmin && (
            <div className="space-y-1 pt-2 border-t border-(--app-border)/50">
              <div className="px-3 py-1 text-[11px] font-extrabold text-(--app-muted-foreground)">
                إدارة النظام
              </div>
              <Link
                href="/admin/users"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive("/admin/users")
                    ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                    : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
                  <Settings className="w-4 h-4 shrink-0" />
                </div>
                <span>إدارة المستخدمين والصلاحيات</span>
              </Link>

              <Link
                href="/admin/departments"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive("/admin/departments")
                    ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                    : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
                  <Building2 className="w-4 h-4 shrink-0" />
                </div>
                <span>إدارة الفروع والأقسام</span>
              </Link>

              <Link
                href="/admin/backup"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive("/admin/backup")
                    ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                    : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
                  <DatabaseBackup className="w-4 h-4 shrink-0" />
                </div>
                <span>النسخ الاحتياطي وتدوير النسخ</span>
              </Link>

              <Link
                href="/audit-log"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                  isActive("/audit-log")
                    ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                    : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                }`}
              >
                <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
                  <History className="w-4 h-4 shrink-0" />
                </div>
                <span>سجل الحركات والتغييرات</span>
              </Link>
            </div>
          )}

          {/* Quick Tools */}
          <div className="space-y-1 pt-2 border-t border-(--app-border)/50">
            <div className="px-3 py-1 text-[11px] font-extrabold text-(--app-muted-foreground)">
              أدوات وتخصيص
            </div>
            <Link
              href="/theme-playground"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                isActive("/theme-playground")
                  ? "text-(--color-primary) bg-(--color-primary)/10 font-extrabold"
                  : "text-(--app-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
              }`}
            >
              <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
                <Palette className="w-4 h-4 shrink-0" />
              </div>
              <span>لوحة التصميم المتقدمة</span>
            </Link>
          </div>
        </div>

        {/* Drawer Footer — Profile + ThemeToggle + Logout */}
        <div className="p-3 border-t border-(--app-border) bg-(--app-surface-container-low)/40 space-y-2">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-(--app-foreground) hover:bg-(--app-surface-container) hover:text-(--color-primary) transition-colors"
          >
            <div className="p-1.5 rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground)">
              <User className="w-4 h-4 shrink-0" />
            </div>
            <span>الملف الشخصي وكلمة المرور</span>
          </Link>

          <div className="flex items-center justify-between px-3 py-1 rounded-xl bg-(--app-surface-container)/60 border border-(--app-border)">
            <span className="text-xs font-bold text-(--app-muted-foreground)">
              المظهر العام
            </span>
            <ThemeToggle variant="surface" />
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-(--app-foreground) hover:bg-(--app-surface-container) hover:text-(--color-primary) transition-all duration-200 active:scale-95 cursor-pointer border border-transparent hover:border-(--app-border)"
            type="button"
          >
            <LogOut className="w-4 h-4 text-(--app-muted-foreground)" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Hamburger Button — visible only on mobile/tablet */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl
          bg-white/10 hover:bg-white/20
          border border-white/20 hover:border-white/30
          text-white transition-all duration-200
          active:scale-90 cursor-pointer"
        aria-label="فتح القائمة"
        type="button"
      >
        <Menu className="w-5 h-5 text-white" />
      </button>

      {/* Portal Drawer into document.body to break out of ancestor stacking contexts & filters */}
      {mounted && createPortal(drawerContent, document.body)}
    </>
  );
}
