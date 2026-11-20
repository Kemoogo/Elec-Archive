"use client";

import Link from "next/link";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { UserMenu } from "@/components/layout/UserMenu";
import type { ModulePermissions } from "@/lib/auth/types";
import { Sparkles } from "lucide-react";
import { BrandIcon } from "@/components/ui/brand-icon";
import { NavLinks } from "./NavLinks";
import { Spotlight } from "@/components/ui/spotlight";
import { MobileDrawer } from "./MobileDrawer";

const moduleLabels: Record<keyof ModulePermissions, string> = {
  fax: "الفاكس",
  officers: "الضباط",
  medical: "الطبي",
  students: "شئون الطلاب",
  education: "التعليم",
  arkan_harb: "أركان حرب",
  historical_record: "السجل التاريخي",
};

interface AuthenticatedNavbarProps {
  user: {
    fullName: string;
    role: string;
    permissions: ModulePermissions;
  };
  accessibleModules: (keyof ModulePermissions)[];
}

interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
}

export function AuthenticatedNavbar({ user, accessibleModules }: AuthenticatedNavbarProps) {
  const navItems: NavItem[] = accessibleModules.map((mod) => {
    const routeName = mod.replace("_", "-");
    return {
      href: `/${routeName}`,
      label: moduleLabels[mod],
    };
  });

  return (
    <header className="w-full text-(--app-white) sticky top-0 z-50 overflow-visible bg-primary-gradient border-b border-white/10 backdrop-blur-2xl shadow-xl transition-all duration-300">
      <Spotlight className="from-white/15 via-white/5 to-transparent">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand Identity */}
            <Link
              href="/dashboard"
              className="flex items-center gap-3 group transition-transform duration-300 hover:scale-[1.02] cursor-pointer"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-white/10 border border-white/20 shadow-md group-hover:bg-white/20 transition-colors">
                <BrandIcon className="w-6 h-6 text-white transition-transform duration-300 group-hover:rotate-6" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base tracking-wide text-white drop-shadow-sm">
                    الأرشيف الإلكتروني
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-blue-300 opacity-80" />
                </div>
                <span className="text-[10px] font-bold text-white/70 tracking-wider">
                  منظومة الأرشفة الرقمية
                </span>
              </div>
            </Link>

            {/* Navigation Links Dock */}
            <NavLinks items={navItems} />

            {/* Right Action Icons & User Control */}
            <div className="hidden md:flex items-center gap-2.5">
              <NotificationBell />
              <ThemeToggle />
              <UserMenu fullName={user.fullName} role={user.role} permissions={user.permissions} />
            </div>

            {/* Mobile Drawer Trigger */}
            <div className="flex items-center gap-2 md:hidden">
              <NotificationBell />
              <ThemeToggle />
              <MobileDrawer navItems={navItems} user={user} />
            </div>
          </div>
        </div>
      </Spotlight>
    </header>
  );
}
