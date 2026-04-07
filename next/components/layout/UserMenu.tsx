"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown, Palette } from "lucide-react";

const roleLabels: Record<string, string> = {
  admin: "مسؤول",
  commander: "قائد",
  employee: "موظف",
  viewer: "مشاهد",
};

interface UserMenuProps {
  fullName: string;
  role: string;
}

export function UserMenu({ fullName, role }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
        className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white text-(--color-primary) font-bold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 hover:bg-blue-50 transition-all active:scale-95 cursor-pointer"
        aria-label="الحساب"
      >
        <User className="w-4 h-4" />
        <span>{fullName}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden text-slate-700 z-50 origin-top" dir="rtl">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-(--color-primary) rounded-lg text-white">
              <User className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-(--color-primary)">{fullName}</span>
              <span className="text-[10px] text-slate-500 font-bold">{roleLabels[role] ?? role}</span>
            </div>
          </div>
          <div className="p-2">
            <button
              onClick={() => { setOpen(false); router.push("/theme-playground"); }}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50 font-bold cursor-pointer"
            >
              <Palette className="w-4 h-4 text-slate-400 group-hover:text-(--color-primary)" />
              <span>لوحة التصميم</span>
            </button>
            <button
              onClick={handleLogout}
              disabled={loading}
              className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 font-bold disabled:opacity-50 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>{loading ? "جاري الخروج..." : "تسجيل الخروج"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
