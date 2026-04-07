import Link from "next/link";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import type { ModulePermissions } from "@/lib/auth/types";
import { FileText } from "lucide-react";
import { NavLinks } from "./NavLinks";

const moduleLabels: Record<keyof ModulePermissions, string> = {
  fax: "الفاكس",
  officers: "الضباط",
  medical: "الطبي",
  students: "الطلبة",
  education: "التعليم",
};

interface AuthenticatedNavbarProps {
  user: {
    fullName: string;
    role: string;
    permissions: ModulePermissions;
  };
  accessibleModules: (keyof ModulePermissions)[];
}

export function AuthenticatedNavbar({ user, accessibleModules }: AuthenticatedNavbarProps) {
  const navItems: { href: string; label: string }[] = [];

  if (user.role === "admin") {
    navItems.push({ href: "/admin/users", label: "الإدارة" });
  }

  for (const mod of accessibleModules) {
    navItems.push({ href: `/${mod}`, label: moduleLabels[mod] });
  }

  if (user.role === "admin" || user.role === "commander") {
    navItems.push({ href: "/audit-log", label: "السجل" });
  }

  return (
    <header
      className="w-full text-(--app-white) shadow-xl sticky top-0 z-50 bg-primary-gradient"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <Link className="font-bold tracking-tight flex items-center gap-2.5 shrink-0 transition-transform duration-200 hover:scale-[1.02]" href="/">
            <div className="bg-white p-1.5 rounded-lg shadow-lg shadow-blue-900/20">
              <FileText className="w-5 h-5 text-(--color-primary)" />
            </div>
            <div className="flex flex-col items-end gap-0.5 leading-tight">
              <span className="text-(--app-white) text-base drop-shadow-sm whitespace-nowrap">الأرشيف الإلكتروني</span>
              <span className="text-blue-100 text-[8px] font-bold tracking-[0.2em] uppercase opacity-90" dir="ltr">Electronic Archive</span>
            </div>
          </Link>

          <NavLinks items={navItems} />

          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            {user.role === "commander" && <NotificationBell />}
            <UserMenu fullName={user.fullName} role={user.role} />
          </div>
        </div>
      </div>
    </header>
  );
}
