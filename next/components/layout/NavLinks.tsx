"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useEffect, useState, useCallback } from "react";
import { Home, FileText, Shield, ClipboardList, ScrollText, Users, GraduationCap, BookOpen, Settings, Swords, ChevronDown } from "lucide-react";

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
  "/medical": ClipboardList,
  "/students": Users,
  "/education": GraduationCap,
  "/arkan-harb": Swords,
  "/arkan-harb/rollcall": ClipboardList,
  "/arkan-harb/leaves": ScrollText,
  "/arkan-harb/missions": FileText,
  "/arkan-harb/positions": Shield,
  "/audit-log": BookOpen,
};

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
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

  if (items.length === 0) return null;

  return (
    <nav className="hidden md:flex items-center gap-1.5 relative h-full">
      <div
        className="absolute top-[12px] h-[32px] bg-white rounded-lg shadow-md transition-all duration-300 ease-out pointer-events-none"
        style={{ 
          left: indicator.left, 
          width: indicator.width, 
          opacity: indicator.opacity 
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
              ref={(el) => { refs.current[i] = el; }}
              onMouseEnter={() => setOpenDropdown(item.href)}
              onMouseLeave={() => setOpenDropdown(null)}
            >
              <Link
                href={item.href}
                className={`relative z-10 flex items-center gap-1.5 px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-300 rounded-lg ${
                  isActive
                    ? "text-(--color-primary)"
                    : "text-blue-100 group-hover:text-white group-hover:bg-white/10"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {item.label}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${openDropdown === item.href ? "rotate-180" : ""}`} />
              </Link>

              {/* Enhanced Dropdown Menu */}
              <div
                className={`absolute top-[80%] right-0 mt-2 w-48 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100/50 py-2.5 z-50 transition-all duration-300 origin-top-right overflow-hidden ${
                  openDropdown === item.href
                    ? "opacity-100 scale-100 translate-y-0"
                    : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                }`}
              >
                <div className="px-3 py-1.5 mb-1 border-b border-slate-50">
                   <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">العمليات المتاحة</span>
                </div>
                {item.children?.map((child) => {
                  const ChildIcon = iconMap[child.href];
                  const isChildActive = pathname === child.href;
                  return (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`flex items-center gap-2.5 px-4 py-2.5 text-xs transition-all duration-200 hover:bg-blue-50/80 group/item ${
                        isChildActive 
                          ? "text-(--color-primary) font-black bg-blue-50/50" 
                          : "text-slate-600 font-bold hover:text-(--color-primary)"
                      }`}
                    >
                      <div className={`p-1 rounded-md transition-colors ${isChildActive ? "bg-blue-100 text-(--color-primary)" : "bg-slate-50 text-slate-400 group-hover/item:bg-blue-100 group-hover/item:text-(--color-primary)"}`}>
                        {ChildIcon && <ChildIcon className="w-3 h-3" />}
                      </div>
                      {child.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            ref={(el) => { refs.current[i] = el; }}
            className={`relative z-10 flex items-center gap-1.5 px-3 py-2 text-xs font-bold whitespace-nowrap transition-colors duration-300 rounded-lg ${
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
