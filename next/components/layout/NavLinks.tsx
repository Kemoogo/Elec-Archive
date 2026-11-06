"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback, useSyncExternalStore } from "react";
import {
  Home,
  FileText,
  Shield,
  ClipboardList,
  ScrollText,
  GraduationCap,
  BookOpen,
  Settings,
  Swords,
  ChevronDown,
  History,
  Stethoscope,
} from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface NavItem {
  href: string;
  label: string;
  children?: NavItem[];
}

const iconMap: Record<string, typeof Home> = {
  "/": Home,
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
  "/arkan-harb?tab=rollcall": ClipboardList,
  "/arkan-harb/leaves": ScrollText,
  "/arkan-harb/missions": FileText,
  "/arkan-harb/positions": Shield,
  "/audit-log": History,
};

const emptySubscribe = () => () => {};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const { resolvedTheme: _resolvedTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const refs = useRef<(HTMLAnchorElement | HTMLDivElement | null)[]>([]);

  const activeIndex = items.findIndex((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/")
  );

  const updateIndicator = useCallback((index: number) => {
    const el = refs.current[index];
    if (el && index !== -1) {
      setIndicator({ left: el.offsetLeft, width: el.offsetWidth, opacity: 1 });
    } else {
      setIndicator((prev) => ({ ...prev, opacity: 0 }));
    }
  }, []);

  useEffect(() => {
    updateIndicator(activeIndex);
    const handleResize = () => updateIndicator(activeIndex);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, updateIndicator]);

  if (items.length === 0 || !mounted) return null;

  return (
    <nav className="hidden md:flex items-center gap-1.5 relative h-full">
      {/* Silky Sliding Active Capsule Indicator */}
      <div
        className="absolute top-[14px] h-[36px] bg-white/15 backdrop-blur-md border border-white/25 rounded-xl shadow-md shadow-black/10 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none"
        style={{
          left: indicator.left,
          width: indicator.width,
          opacity: indicator.opacity,
        }}
      />
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        const Icon = iconMap[item.href];
        const hasChildren = item.children && item.children.length > 0;

        if (hasChildren) {
          return (
            <div
              key={item.href}
              className="relative group flex items-center h-full"
              ref={(el) => {
                refs.current[i] = el;
              }}
              onMouseEnter={() => setOpenDropdown(item.href)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href}
                className={`relative z-10 flex items-center gap-2 px-3.5 py-2 text-sm font-extrabold whitespace-nowrap transition-all duration-200 rounded-xl ${
                  isActive
                    ? "text-white drop-shadow-sm font-black"
                    : "text-blue-100/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {Icon && (
                  <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
                )}
                <span>{item.label}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    openDropdown === item.href ? "rotate-180" : ""
                  }`}
                />
              </Link>

              {/* Enhanced Dropdown Menu */}
              <div
                className={`absolute top-[85%] right-0 mt-2 w-52 bg-(--app-surface)/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-(--app-border) py-2.5 z-50 transition-all duration-300 origin-top-right overflow-hidden ${
                  openDropdown === item.href
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="px-3.5 py-1.5 mb-1 border-b border-(--app-border)/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-(--app-muted-foreground)">
                    العمليات المتاحة
                  </span>
                </div>
                {item.children?.map((child) => {
                  const ChildIcon = iconMap[child.href];
                  const isChildActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-all duration-200 hover:bg-(--app-surface-container) group/item ${
                        isChildActive
                          ? "text-(--color-primary) font-black bg-(--color-primary)/10"
                          : "text-(--app-muted-foreground) font-bold hover:text-(--color-primary)"
                      }`}
                    >
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          isChildActive
                            ? "bg-(--color-primary)/20 text-(--color-primary)"
                            : "bg-(--app-surface-container) text-(--app-muted-foreground) group-hover/item:bg-(--color-primary)/20 group-hover/item:text-(--color-primary)"
                        }`}
                      >
                        {ChildIcon && <ChildIcon className="w-3.5 h-3.5" />}
                      </div>
                      <span>{child.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`relative z-10 flex items-center gap-2 px-3.5 py-2 text-sm font-extrabold whitespace-nowrap transition-all duration-200 rounded-xl group ${
              isActive
                ? "text-white drop-shadow-sm font-black"
                : "text-blue-100/90 hover:text-white hover:bg-white/10"
            }`}
          >
            {Icon && (
              <Icon className="w-4 h-4 transition-transform duration-300 group-hover:scale-110" />
            )}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
