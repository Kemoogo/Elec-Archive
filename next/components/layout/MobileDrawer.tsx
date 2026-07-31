"use client";

import { useState, useEffect } from "react";
import { Menu, X, FileText, Shield, Settings, Swords, GraduationCap, BookOpen, Stethoscope, ClipboardList, ScrollText, History, User, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { BrandIcon } from "@/components/ui/brand-icon";

const iconMap: Record<string, typeof FileText> = {
  "/": FileText,
  "/admin/users": Settings,
  "/fax": FileText,
  "/officers": Shield,
  "/officers/rollcall": ClipboardList,
  "/officers/leaves": ScrollText,
  "/medical": Stethoscope,
  "/students": GraduationCap,
  "/education": BookOpen,
  "/arkan-harb": Swords,
  "/arkan-harb/rollcall": ClipboardList,
  "/arkan-harb/leaves": ScrollText,
  "/arkan-harb/missions": FileText,
  "/arkan-harb/positions": Shield,
  "/audit-log": History,
};

const roleLabels: Record<string, string> = {
  admin: "مسؤول",
  commander: "قائد",
  employee: "موظف",
  viewer: "مشاهد",
};

interface MobileDrawerProps {
  navItems: { href: string; label: string }[];
  user: { fullName: string; role: string };
}

export function MobileDrawer({ navItems, user }: MobileDrawerProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Close when route changes
  useEffect(() => {
    let active = true;
    if (open) {
      const frame = requestAnimationFrame(() => {
        if (active) setOpen(false);
      });
      return () => {
        active = false;
        cancelAnimationFrame(frame);
      };
    }
  }, [pathname, open]);

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

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  const handleLogout = async () => {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Hamburger Button — visible only on mobile */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center p-2 rounded-xl
          bg-(--app-white)/8 hover:bg-(--app-white)/20
          border border-(--app-white)/12 hover:border-(--app-white)/30
          text-(--app-white)/90 transition-all duration-300 ease-out
          active:scale-90 cursor-pointer"
        aria-label="فتح القائمة"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm transition-all duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer Panel — slides in from right side (RTL natural direction) */}
      <div
        className={`fixed top-0 right-0 h-full w-[300px] max-w-[85vw] z-[90] bg-(--app-surface) shadow-2xl border-l border-(--app-border) transition-all duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="قائمة التنقل"
      >
        {/* Drawer Header — User Info + Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-(--app-border)">
          <div className="flex items-center gap-3">
            <BrandIcon size="md" showGlow />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-(--color-primary)">{user.fullName}</span>
              <span className="text-[10px] text-(--app-muted-foreground) font-bold">
                {roleLabels[user.role] ?? user.role}
              </span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-xl hover:bg-(--app-surface-container) text-(--app-muted-foreground) transition-all duration-200 active:scale-90 cursor-pointer"
            aria-label="إغلاق القائمة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.href];
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  active
                    ? "text-(--color-primary) bg-(--app-info)/10"
                    : "text-(--app-muted-foreground) hover:text-(--color-primary) hover:bg-(--app-surface-container)"
                }`}
              >
                {Icon && (
                  <div className={`p-1 rounded-md ${
                    active
                      ? "bg-(--app-info)/20 text-(--color-primary)"
                      : "bg-(--app-surface-container) text-(--app-muted-foreground)"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                )}
                <span>{item.label}</span>
                {active && (
                  <span className="mr-auto w-1.5 h-1.5 rounded-full bg-(--color-primary)" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Drawer Footer — ThemeToggle + Logout */}
        <div className="p-4 border-t border-(--app-border) space-y-3">
          <div className="flex items-center justify-between px-1">
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-(--app-error) hover:bg-(--app-error)/10 transition-all duration-200 active:scale-95 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </>
  );
}
