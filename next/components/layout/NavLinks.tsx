"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import { Home, FileText, Shield, ClipboardList, ScrollText, Users, GraduationCap, BookOpen, Settings } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
}

const iconMap: Record<string, typeof Home> = {
  "/": Home,
  "/admin/users": Settings,
  "/fax": FileText,
  "/officers": Shield,
  "/officers/rollcall": ClipboardList,
  "/officers/leaves": ScrollText,
  "/medical": ClipboardList,
  "/students": Users,
  "/education": GraduationCap,
  "/audit-log": BookOpen,
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  const [indicator, setIndicator] = useState({ left: 0, width: 0, opacity: 0 });
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  const activeIndex = items.findIndex((item) =>
    item.href === "/"
      ? pathname === "/"
      : pathname === item.href || pathname.startsWith(item.href + "/")
  );

  const updateIndicator = useCallback((index: number) => {
    const el = refs.current[index];
    if (el) {
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

  if (items.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1 relative">
      <div
        className="absolute top-0 h-full bg-white rounded-lg shadow-md transition-all duration-300 ease-out pointer-events-none"
        style={{ left: indicator.left, width: indicator.width, opacity: indicator.opacity }}
      />
      {items.map((item, i) => {
        const isActive = i === activeIndex;
        const Icon = iconMap[item.href];

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => { refs.current[i] = el; }}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors duration-300 rounded-lg ${
              isActive
                ? "text-(--color-primary)"
                : "text-blue-100 hover:text-white hover:bg-white/10"
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
