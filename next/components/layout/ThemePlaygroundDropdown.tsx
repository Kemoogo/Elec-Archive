"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, X, Check, AlertTriangle, Info, Search, Plus, Trash2, Edit, Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

const colors = [
  { name: "Primary", varName: "--app-primary" },
  { name: "Primary Hover", varName: "--app-primary-hover" },
  { name: "Accent / Gold", varName: "--app-accent" },
  { name: "Secondary", varName: "--app-secondary" },
  { name: "Muted FG", varName: "--app-muted-foreground" },
  { name: "Border", varName: "--app-border" },
  { name: "Surface", varName: "--app-surface" },
  { name: "Background", varName: "--app-background" },
];

export function ThemePlaygroundDropdown() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"colors" | "buttons" | "badges" | "theme">("colors");
  const ref = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="rounded-lg p-2 transition-colors hover:bg-white/10 text-white"
        aria-label="لوحة التصميم"
      >
        <Palette className="w-5 h-5" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl bg-(--app-surface) border border-(--app-border) shadow-depth-xl overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-(--app-border) flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--color-primary)">لوحة التصميم</h3>
            <button onClick={() => setOpen(false)} className="p-1 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex border-b border-(--app-border)">
            <button onClick={() => setTab("colors")} className={`flex-1 px-3 py-2 text-xs font-medium transition ${tab === "colors" ? "text-(--color-primary) border-b-2 border-(--color-primary)" : "text-(--app-muted-foreground) hover:text-(--color-primary)"}`}>الألوان</button>
            <button onClick={() => setTab("buttons")} className={`flex-1 px-3 py-2 text-xs font-medium transition ${tab === "buttons" ? "text-(--color-primary) border-b-2 border-(--color-primary)" : "text-(--app-muted-foreground) hover:text-(--color-primary)"}`}>الأزرار</button>
            <button onClick={() => setTab("badges")} className={`flex-1 px-3 py-2 text-xs font-medium transition ${tab === "badges" ? "text-(--color-primary) border-b-2 border-(--color-primary)" : "text-(--app-muted-foreground) hover:text-(--color-primary)"}`}>الشارات</button>
            <button onClick={() => setTab("theme")} className={`flex-1 px-3 py-2 text-xs font-medium transition ${tab === "theme" ? "text-(--color-primary) border-b-2 border-(--color-primary)" : "text-(--app-muted-foreground) hover:text-(--color-primary)"}`}>الوضع</button>
          </div>

          <div className="p-4 max-h-80 overflow-y-auto">
            {tab === "colors" && (
              <div className="grid grid-cols-2 gap-3">
                {colors.map((c) => (
                  <div key={c.varName} className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg border border-(--app-border) shrink-0" style={{ background: `var(${c.varName})` }} />
                    <div>
                      <p className="text-xs font-medium text-(--color-primary)">{c.name}</p>
                      <p className="text-[10px] text-(--app-muted-foreground) font-mono">{c.varName}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "buttons" && (
              <div className="space-y-3">
                <div>
                  <span className="text-label text-(--app-muted-foreground) block mb-2">Primary</span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 bg-(--color-primary) text-(--app-white) hover:bg-(--color-primary-hover)">
                      <Plus className="w-3 h-3" /> <span>إضافة</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 bg-(--color-primary) text-(--app-white) hover:bg-(--color-primary-hover)">
                      <Check className="w-3 h-3" /> <span>حفظ</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-label text-(--app-muted-foreground) block mb-2">Secondary</span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200">
                      <Search className="w-3 h-3" /> <span>بحث</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200">
                      <Edit className="w-3 h-3" /> <span>تعديل</span>
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-label text-(--app-muted-foreground) block mb-2">Destructive</span>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-(--app-error) text-(--app-white) hover:bg-(--app-error)/90 transition-all active:scale-95">
                      <Trash2 className="w-3 h-3" /> <span>حذف</span>
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-(--app-error) hover:bg-(--app-error)/10 transition-all">
                      <X className="w-3 h-3" /> <span>إلغاء</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {tab === "badges" && (
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--app-success)/20 text-(--app-success)">
                  <Check className="w-3 h-3" /> نشط
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--app-warning)/20 text-(--app-warning)">
                  <AlertTriangle className="w-3 h-3" /> معلق
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--app-error)/20 text-(--app-error)">
                  <X className="w-3 h-3" /> مغلق
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--app-info)/20 text-(--app-info)">
                  <Info className="w-3 h-3" /> جديد
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-(--app-secondary)/20 text-(--app-secondary)">
                  مسودة
                </span>
              </div>
            )}

            {tab === "theme" && (
              <div className="space-y-3">
                <span className="text-label text-(--app-muted-foreground) block mb-2">تبديل الوضع</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${theme === "light" ? "bg-(--color-primary) text-(--app-white) shadow-md" : "bg-slate-100 text-(--color-primary) hover:bg-slate-200"}`}
                  >
                    <Sun className="w-4 h-4" /> فاتح
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${theme === "dark" ? "bg-(--color-primary) text-(--app-white) shadow-md" : "bg-slate-100 text-(--color-primary) hover:bg-slate-200"}`}
                  >
                    <Moon className="w-4 h-4" /> داكن
                  </button>
                  <button
                    onClick={() => setTheme("system")}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all ${theme === "system" ? "bg-(--color-primary) text-(--app-white) shadow-md" : "bg-slate-100 text-(--color-primary) hover:bg-slate-200"}`}
                  >
                    <Monitor className="w-4 h-4" /> تلقائي
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
