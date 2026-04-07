"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Bell, Search, Plus, Trash2, Edit, Check, X, AlertTriangle, Info, ChevronLeft, FileText, Users, Shield, BookOpen, GraduationCap } from "lucide-react";
import { type LucideIcon } from "lucide-react";

const navItems = [
  { label: "شئون الضباط", icon: Shield },
  { label: "الفاكسات", icon: FileText },
  { label: "الطلبة", icon: Users },
  { label: "التعليم", icon: GraduationCap },
  { label: "السجل", icon: BookOpen },
];

function SlidingNavbar({ items }: { items: { label: string; icon: LucideIcon }[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const updateIndicator = useCallback((index: number) => {
    const el = refs.current[index];
    if (el) {
      setIndicatorStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, []);

  useEffect(() => {
    updateIndicator(activeIndex);
    const handleResize = () => updateIndicator(activeIndex);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [activeIndex, updateIndicator]);

  return (
    <div className="rounded-xl overflow-hidden shadow-depth-lg">
      <div className="bg-linear-to-br from-(--app-gradient-start) to-(--app-gradient-end) p-3">
        <span className="text-label text-blue-200 block mb-3">شريط التنقل — Sliding Navbar</span>
        <nav className="relative flex items-center gap-1">
          <div
            className="absolute top-0 h-full bg-(--app-surface) rounded-lg shadow-md transition-all duration-300 ease-out"
            style={{ left: indicatorStyle.left, width: indicatorStyle.width }}
          />
          {items.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === activeIndex;
            return (
              <button
                key={item.label}
                ref={(el) => { refs.current[i] = el; }}
                onClick={() => setActiveIndex(i)}
                className={`relative z-10 flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-300 cursor-pointer ${isActive ? "text-(--color-primary)" : "text-(--app-white) hover:text-(--app-white)/80"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

export default function ThemePlaygroundPage() {
  return (
    <div dir="rtl" className="space-y-12 pb-20">

      {/* ===== INSTRUCTIONS ===== */}
      <section className="archive-card border-l-4 border-l-(--color-primary)">
        <h2 className="text-xl font-bold text-(--color-primary) mb-3">كيف تطلب تعديل أي عنصر</h2>
        <p className="text-sm text-(--app-muted-foreground) leading-relaxed">
          كل قسم أدناه له <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">data-section</code> فريد.
          كل عنصر داخل القسم له <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">data-element</code>.
          مثلاً: <strong>&quot;عدّل الـ <code>data-section=&quot;buttons&quot;</code> الـ primary hover&quot;</strong>.
          أو: <strong>&quot;غيّر لون badge في <code>data-section=&quot;badges&quot; data-element=&quot;success&quot;</code>&quot;</strong>.
        </p>
      </section>

      {/* ===== 1. COLOR PALETTE ===== */}
      <section data-section="palette">
        <SectionTitle title="لوحة الألوان — Color Palette" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <ColorSwatch name="Primary" hex="#1E3C72" varName="--app-primary" />
          <ColorSwatch name="Primary Hover" hex="#2a5298" varName="--app-primary-hover" />
          <ColorSwatch name="Secondary / Slate" hex="#64748B" varName="--app-secondary" />
          <ColorSwatch name="Accent / Gold" hex="#d4a843" varName="--app-accent" />
          <ColorSwatch name="Destructive" hex="#ef4444" varName="red-500" />
          <ColorSwatch name="Background" hex="#f8fafc" varName="--app-background" />
          <ColorSwatch name="Surface" hex="#ffffff" varName="--app-surface" />
          <ColorSwatch name="Surface Container" hex="#f1f5f9" varName="--app-surface-container" />
          <ColorSwatch name="Foreground" hex="#0f172a" varName="--app-foreground" />
          <ColorSwatch name="Muted FG" hex="#64748B" varName="--app-muted-foreground" />
          <ColorSwatch name="Border" hex="#e2e8f0" varName="--app-border" />
        </div>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;غيّر لون Primary في <code>data-section=&quot;palette&quot;</code> إلى #xxx&quot;
        </p>

        <div className="mt-6 archive-card space-y-4">
          <span className="text-label text-(--app-muted-foreground) block mb-2">استخدامات كل لون — Color Usage</span>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-(--color-primary) shrink-0" />
              <div>
                <p className="text-sm font-medium text-(--color-primary)">Primary — الأزرق</p>
                <p className="text-xs text-(--app-muted-foreground)">النصوص الأساسية، الأزرار الرئيسية، العناوين</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-(--app-accent) shrink-0" />
              <div>
                <p className="text-sm font-medium text-(--color-primary)">Accent / Gold — الذهبي</p>
                <p className="text-xs text-(--app-muted-foreground)">أزرار CTA، Active states، Focus rings، Highlights</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary shrink-0" />
              <div>
                <p className="text-sm font-medium text-(--color-primary)">Secondary — الرمادي</p>
                <p className="text-xs text-(--app-muted-foreground)">النصوص الثانوية، Metadata، الحدود</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-(--app-error) shrink-0" />
              <div>
                <p className="text-sm font-medium text-(--color-primary)">Destructive — الأحمر</p>
                <p className="text-xs text-(--app-muted-foreground)">أزرار الحذف، الأخطاء، التنبيهات الحرجة</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 bg-(--color-primary) text-(--app-white) hover:bg-(--color-primary-hover)">
              <Plus className="w-4 h-4" /> Primary Button
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 bg-(--app-accent) text-(--app-accent-foreground) hover:bg-(--app-accent)/90">
              <Check className="w-4 h-4" /> Accent / Gold Button
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-(--app-secondary)/20 text-(--color-primary) hover:bg-(--app-secondary)/30">
              <Search className="w-4 h-4" /> Secondary Button
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-(--app-error) text-(--app-white) hover:bg-(--app-error)/90 transition-all active:scale-95">
              <Trash2 className="w-4 h-4" /> Destructive Button
            </button>
          </div>
        </div>
      </section>

      {/* ===== 2. TYPOGRAPHY ===== */}
      <section data-section="typography">
        <SectionTitle title="التايبوغرافي — Typography" />
        <div className="archive-card space-y-4">
          <div data-element="display">
            <span className="text-label text-(--app-muted-foreground)">Display / Hero — 3rem→5rem</span>
            <p className="text-display text-(--color-primary)">الأرشيف الإلكتروني</p>
          </div>
          <div data-element="headline">
            <span className="text-label text-(--app-muted-foreground)">Headline — 1.5rem→1.875rem</span>
            <h2 className="text-2xl font-bold text-(--color-primary)">عنوان القسم</h2>
          </div>
          <div data-element="body">
            <span className="text-label text-(--app-muted-foreground)">Body — 0.875rem→1.125rem</span>
            <p className="text-sm text-(--color-primary) leading-relaxed">هذا نص عادي للمحتوى. خط Segoe UI أو Tahoma مع line-height 1.6.</p>
            <p className="text-base text-(--color-primary) leading-relaxed mt-1">وهذا بحجم أكبر قليلاً للقراءة المريحة.</p>
          </div>
          <div data-element="muted-text">
            <span className="text-label text-(--app-muted-foreground)">نص ثانوي — Muted</span>
            <p className="text-sm text-(--app-muted-foreground)">هذا النص الثانوي يُستخدم للبيانات الوصفية والتعليقات</p>
          </div>
          <div data-element="label">
            <span className="text-label text-(--app-muted-foreground)">Label — 9px→12px uppercase tracking 0.2em</span>
            <p className="text-label text-(--app-muted-foreground) mt-1">METADATA LABEL · SECONDARY BRANDING</p>
          </div>
          <div data-element="gradient-text">
            <span className="text-label text-(--app-muted-foreground)">Gradient Text Accent</span>
            <p className="text-3xl font-bold text-gradient-accent">نص بتدرج لوني</p>
          </div>
        </div>
      </section>

      {/* ===== 3. BUTTONS ===== */}
      <section data-section="buttons">
        <SectionTitle title="الأزرار — Buttons" />
        <div className="archive-card space-y-6">
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-3">المفتاح الرئيسي — Primary</span>
            <div className="flex flex-wrap gap-3">
              <button data-element="primary" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 bg-(--color-primary) text-(--app-white) hover:bg-(--color-primary-hover) shadow-blue-900/10 hover:shadow-lg hover:-translate-y-0.5">
                <Plus className="w-4 h-4" />
                <span>إضافة ضابط</span>
              </button>
              <button data-element="primary" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 bg-(--color-primary) text-(--app-white) hover:bg-(--color-primary-hover) shadow-blue-900/10 hover:shadow-lg hover:-translate-y-0.5">
                <FileText className="w-4 h-4" />
                <span>حفظ</span>
              </button>
            </div>
          </div>
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-3">المفتاح الثانوي — Secondary</span>
            <div className="flex flex-wrap gap-3">
              <button data-element="secondary" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200">
                <Search className="w-4 h-4" />
                <span>بحث</span>
              </button>
              <button data-element="secondary" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all bg-slate-100 text-(--color-primary) hover:bg-slate-200">
                <Edit className="w-4 h-4" />
                <span>تعديل</span>
              </button>
            </div>
          </div>
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-3">حذف — Destructive</span>
            <div className="flex flex-wrap gap-3">
              <button data-element="destructive" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-(--app-white) hover:bg-red-600 transition-all active:scale-95">
                <Trash2 className="w-4 h-4" />
                <span>حذف</span>
              </button>
              <button data-element="destructive-ghost" className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-red-500 hover:bg-red-50 transition-all">
                <X className="w-4 h-4" />
                <span>إلغاء</span>
              </button>
            </div>
          </div>
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-3">أيقونة فقط — Icon Only</span>
            <div className="flex flex-wrap gap-3">
              <button data-element="icon-only" className="rounded-lg p-2 transition-colors hover:bg-(--app-surface)/10 text-(--app-white) bg-(--color-primary)">
                <Bell className="w-5 h-5" />
              </button>
              <button data-element="icon-only" className="rounded-lg p-2 transition-colors hover:bg-slate-100 text-(--color-primary)">
                <Search className="w-5 h-5" />
              </button>
              <button data-element="icon-only" className="rounded-lg p-2 transition-colors hover:bg-red-50 text-red-500">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 4. NAVBAR ITEMS ===== */}
      <section data-section="navbar-items">
        <SectionTitle title="عناصر شريط التنقل — Navbar Items" />

        <SlidingNavbar items={navItems} />

        <div className="mt-6 archive-card space-y-4">
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-2">عنصر نشط — Active</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block whitespace-pre-wrap text-(--color-primary)">
              {`<a class="relative px-3 py-2 text-sm font-medium transition-all group">
  <span class="relative z-10 flex items-center gap-2 whitespace-nowrap text-(--color-primary)">
    <Icon /> label
  </span>
  <div class="absolute inset-0 bg-(--app-surface) rounded-lg shadow-md" />
</a>`}</code>
          </div>
          <div>
            <span className="text-label text-(--app-muted-foreground) block mb-2">عنصر غير نشط — Inactive</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono block whitespace-pre-wrap text-(--color-primary)">
              {`<a class="relative px-3 py-2 text-sm font-medium transition-all group">
  <span class="relative z-10 flex items-center gap-2 whitespace-nowrap text-(--app-white)">
    <Icon /> label
  </span>
  <div class="absolute inset-0 bg-(--app-surface)/0 group-hover:bg-(--app-surface)/10 rounded-lg transition-colors" />
</a>`}</code>
          </div>
        </div>
      </section>

      {/* ===== 5. CARDS — Archive Card ===== */}
      <section data-section="cards">
        <SectionTitle title="الكروت — Archive Cards" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div data-element="archive-card" className="archive-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-(--color-primary)">الفاكسات</h3>
                <p className="mt-2 text-3xl font-bold text-(--color-primary)">12</p>
                <p className="mt-1 text-sm text-(--app-muted-foreground)">فاكس معلق</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-100">
                <FileText className="w-6 h-6 text-(--color-primary)" />
              </div>
            </div>
          </div>
          <div data-element="archive-card-hover" className="archive-card">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-(--color-primary)">الضباط</h3>
                <p className="mt-2 text-3xl font-bold text-emerald-700">45</p>
                <p className="mt-1 text-sm text-(--app-muted-foreground)">حاضر اليوم</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100">
                <Users className="w-6 h-6 text-emerald-700" />
              </div>
            </div>
          </div>
          <div data-element="archive-card-alert" className="archive-card border-l-4 border-l-red-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-(--color-primary)">تنبيه طبي</h3>
                <p className="mt-2 text-3xl font-bold text-red-700">3</p>
                <p className="mt-1 text-sm text-(--app-muted-foreground)">أدوية منتهية</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;عدّل الـ <code>data-section=&quot;cards&quot; data-element=&quot;archive-card&quot;</code> padding&quot;
        </p>
      </section>

      {/* ===== 5. BADGES ===== */}
      <section data-section="badges">
        <SectionTitle title="الشارات — Badges" />
        <div className="archive-card">
          <div className="flex flex-wrap gap-3">
            <span data-element="success" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-700">
              <Check className="w-3 h-3" /> نشط
            </span>
            <span data-element="warning" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700">
              <AlertTriangle className="w-3 h-3" /> معلق
            </span>
            <span data-element="error" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-700">
              <X className="w-3 h-3" /> مغلق
            </span>
            <span data-element="info" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-700">
              <Info className="w-3 h-3" /> جديد
            </span>
            <span data-element="neutral" className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
              مسودة
            </span>
          </div>
          <p className="mt-4 text-xs text-(--app-muted-foreground)">
            ← قل: &quot;غيّر لون <code>data-section=&quot;badges&quot; data-element=&quot;success&quot;</code>&quot;
          </p>
        </div>
      </section>

      {/* ===== 6. FORM INPUTS ===== */}
      <section data-section="inputs">
        <SectionTitle title="حقول الإدخال — Inputs" />
        <div className="archive-card space-y-4 max-w-lg">
          <div data-element="text-input">
            <label className="block text-sm font-medium text-(--color-primary) mb-1.5">نص عادي</label>
            <input
              type="text"
              placeholder="اكتب هنا..."
              className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
            />
          </div>
          <div data-element="select">
            <label className="block text-sm font-medium text-(--color-primary) mb-1.5">قائمة منسدلة</label>
            <select className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition">
              <option>خيار 1</option>
              <option>خيار 2</option>
            </select>
          </div>
          <div data-element="textarea">
            <label className="block text-sm font-medium text-(--color-primary) mb-1.5">نص طويل</label>
            <textarea
              rows={3}
              placeholder="اكتب هنا..."
              className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition resize-none"
            />
          </div>
          <div data-element="input-with-icon">
            <label className="block text-sm font-medium text-(--color-primary) mb-1.5">مع أيقونة</label>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--app-muted-foreground)" />
              <input
                type="text"
                placeholder="بحث..."
                className="w-full rounded-lg border border-(--app-border) bg-(--app-surface) pr-10 px-3 py-2 text-sm text-(--color-primary) placeholder:text-(--app-muted-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-primary) transition"
              />
            </div>
          </div>
          <div data-element="input-error">
            <label className="block text-sm font-medium text-(--color-primary) mb-1.5">مع خطأ</label>
            <input
              type="text"
              defaultValue="قيمة خاطئة"
              className="w-full rounded-lg border border-red-500 bg-(--app-surface) px-3 py-2 text-sm text-(--color-primary) focus:outline-none focus:ring-2 focus:ring-red-500 transition"
            />
            <p className="mt-1 text-xs text-red-500">هذا الحقل مطلوب</p>
          </div>
          <p className="text-xs text-(--app-muted-foreground)">
            ← قل: &quot;عدّل <code>data-section=&quot;inputs&quot; data-element=&quot;text-input&quot;</code> focus ring&quot;
          </p>
        </div>
      </section>

      {/* ===== 7. TABLE ===== */}
      <section data-section="table">
        <SectionTitle title="الجداول — Tables" />
        <div className="archive-card overflow-x-auto">
          <table data-element="data-table" className="w-full text-right text-sm">
            <thead>
              <tr className="border-b border-(--app-border) text-(--app-muted-foreground)">
                <th className="py-3 px-3 font-medium">الاسم</th>
                <th className="py-3 px-3 font-medium">الدور</th>
                <th className="py-3 px-3 font-medium">الحالة</th>
                <th className="py-3 px-3 font-medium">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-(--app-border) hover:bg-(--app-surface-container) transition-colors">
                <td className="py-3 px-3 text-(--color-primary) font-medium">أحمد محمد</td>
                <td className="py-3 px-3 text-(--app-muted-foreground)">مسؤول</td>
                <td className="py-3 px-3"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-700">نشط</span></td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) hover:text-(--color-primary) transition"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 rounded-md hover:bg-red-50 text-(--app-muted-foreground) hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
              <tr className="border-b border-(--app-border) hover:bg-(--app-surface-container) transition-colors">
                <td className="py-3 px-3 text-(--color-primary) font-medium">محمد علي</td>
                <td className="py-3 px-3 text-(--app-muted-foreground)">موظف</td>
                <td className="py-3 px-3"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-700">معلق</span></td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) hover:text-(--color-primary) transition"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 rounded-md hover:bg-red-50 text-(--app-muted-foreground) hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-(--app-surface-container) transition-colors">
                <td className="py-3 px-3 text-(--color-primary) font-medium">سعيد عبدالله</td>
                <td className="py-3 px-3 text-(--app-muted-foreground)">قائد</td>
                <td className="py-3 px-3"><span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-700">مغلق</span></td>
                <td className="py-3 px-3">
                  <div className="flex gap-1">
                    <button className="p-1.5 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) hover:text-(--color-primary) transition"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 rounded-md hover:bg-red-50 text-(--app-muted-foreground) hover:text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-4 text-xs text-(--app-muted-foreground)">
            ← قل: &quot;عدّل <code>data-section=&quot;table&quot; data-element=&quot;data-table&quot;</code> header color&quot;
          </p>
        </div>
      </section>

      {/* ===== 8. SURFACES & ELEVATION ===== */}
      <section data-section="surfaces">
        <SectionTitle title="الطبقات والارتفاع — Surfaces & Elevation" />
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div data-element="surface-lowest" className="rounded-xl p-5 bg-(--app-surface-container-lowest) border border-(--app-border)">
            <p className="text-xs text-label text-(--app-muted-foreground) mb-2">surface_container_lowest</p>
            <p className="text-sm text-(--color-primary)">خلفية الكروت الأساسية</p>
          </div>
          <div data-element="surface-low" className="rounded-xl p-5 bg-(--app-surface-container-low) border border-(--app-border)">
            <p className="text-xs text-label text-(--app-muted-foreground) mb-2">surface_container_low</p>
            <p className="text-sm text-(--color-primary)">الخلفية العامة للصفحة</p>
          </div>
          <div data-element="surface-container" className="rounded-xl p-5 bg-(--app-surface-container) border border-(--app-border)">
            <p className="text-xs text-label text-(--app-muted-foreground) mb-2">surface_container</p>
            <p className="text-sm text-(--color-primary)">منطقة معلومات ثانوية</p>
          </div>
          <div data-element="surface-primary" className="rounded-xl p-5 bg-linear-to-br from-(--app-gradient-start) to-(--app-gradient-end)">
            <p className="text-xs text-label text-blue-200 mb-2">primary gradient</p>
            <p className="text-sm text-(--app-white)">التوقيع البصري</p>
          </div>
        </div>

        <div className="mt-4 grid md:grid-cols-4 gap-4">
          <div data-element="shadow-sm" className="rounded-xl p-5 bg-(--app-surface) shadow-depth-sm">
            <p className="text-xs text-label text-(--app-muted-foreground)">shadow-sm</p>
          </div>
          <div data-element="shadow-md" className="rounded-xl p-5 bg-(--app-surface) shadow-depth-md">
            <p className="text-xs text-label text-(--app-muted-foreground)">shadow-md</p>
          </div>
          <div data-element="shadow-lg" className="rounded-xl p-5 bg-(--app-surface) shadow-depth-lg">
            <p className="text-xs text-label text-(--app-muted-foreground)">shadow-lg</p>
          </div>
          <div data-element="shadow-xl" className="rounded-xl p-5 bg-(--app-surface) shadow-depth-xl">
            <p className="text-xs text-label text-(--app-muted-foreground)">shadow-xl</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;عدّل <code>data-section=&quot;surfaces&quot; data-element=&quot;shadow-lg&quot;</code>&quot;
        </p>
      </section>

      {/* ===== 9. TOASTS / ALERTS ===== */}
      <section data-section="alerts">
        <SectionTitle title="التنبيهات — Toasts & Alerts" />
        <div className="archive-card space-y-3">
          <div data-element="alert-success" className="flex items-center gap-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-3">
            <Check className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-sm text-emerald-800">تم الحفظ بنجاح</p>
          </div>
          <div data-element="alert-error" className="flex items-center gap-3 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
            <X className="w-5 h-5 text-red-600 shrink-0" />
            <p className="text-sm text-red-800">حدث خطأ أثناء العملية</p>
          </div>
          <div data-element="alert-warning" className="flex items-center gap-3 rounded-lg bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-800">تنبيه: صلاحية الدواء ستنتهي قريباً</p>
          </div>
          <div data-element="alert-info" className="flex items-center gap-3 rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800">معلومة: تم تحديث النظام</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;غيّر <code>data-section=&quot;alerts&quot; data-element=&quot;alert-success&quot;</code> background&quot;
        </p>
      </section>

      {/* ===== 10. MODAL / DIALOG ===== */}
      <section data-section="modals">
        <SectionTitle title="النوافذ المنبثقة — Modals" />
        <div className="relative rounded-xl overflow-hidden min-h-[320px]">
          <div className="absolute inset-0 grid grid-cols-3 gap-2 p-3 opacity-50">
            <div className="rounded-lg bg-gray-200" />
            <div className="rounded-lg bg-gray-300" />
            <div className="rounded-lg bg-gray-200" />
            <div className="rounded-lg bg-gray-300" />
            <div className="rounded-lg bg-gray-200" />
            <div className="rounded-lg bg-gray-300" />
          </div>
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          <div className="relative z-10 flex items-center justify-center p-6">
            <div data-element="modal" className="w-full max-w-md rounded-xl bg-(--app-surface) border border-(--app-border) shadow-depth-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-(--app-border) flex items-center justify-between">
                <h3 className="text-base font-semibold text-(--color-primary)">تأكيد الحذف</h3>
                <button className="p-1 rounded-md hover:bg-(--app-surface-container) text-(--app-muted-foreground) transition">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="px-6 py-5">
                <p className="text-sm text-(--app-muted-foreground)">هل أنت متأكد من حذف هذا العنصر؟ لا يمكن التراجع عن هذا الإجراء.</p>
              </div>
              <div className="px-6 py-3 bg-(--app-surface-container) flex justify-start gap-3">
                <button className="btn-pill-secondary text-sm">إلغاء</button>
                <button className="flex items-center gap-1.5 px-4 py-1.5 rounded-2xl bg-red-500 text-(--app-white) text-sm font-medium hover:bg-red-600 transition active:scale-95">
                  <Trash2 className="w-3.5 h-3.5" /> حذف
                </button>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;عدّل <code>data-section=&quot;modals&quot; data-element=&quot;modal&quot;</code> footer bg&quot;
        </p>
      </section>

      {/* ===== 11. BREADCRUMBS ===== */}
      <section data-section="breadcrumbs">
        <SectionTitle title="Breadcrumb" />
        <nav data-element="breadcrumb" className="flex items-center gap-1.5 text-xs text-(--app-muted-foreground)">
          <a href="#" className="hover:text-(--color-primary) transition">الرئيسية</a>
          <ChevronLeft className="w-3 h-3 rotate-180" />
          <a href="#" className="hover:text-(--color-primary) transition">الضباط</a>
          <ChevronLeft className="w-3 h-3 rotate-180" />
          <span className="text-(--color-primary) font-medium">أحمد محمد</span>
        </nav>
        <p className="mt-3 text-xs text-(--app-muted-foreground)">
          ← قل: &quot;عدّل <code>data-section=&quot;breadcrumbs&quot;</code>&quot;
        </p>
      </section>

      {/* ===== 12. PAGINATION ===== */}
      <section data-section="pagination">
        <SectionTitle title="التنقل بين الصفحات — Pagination" />
        <div className="archive-card">
          <div data-element="pagination" className="flex items-center gap-1">
            <button className="px-3 py-1.5 text-xs rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground) hover:bg-(--app-border) transition">السابق</button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-(--color-primary) text-(--app-white) font-medium">1</button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground) hover:bg-(--app-border) transition">2</button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground) hover:bg-(--app-border) transition">3</button>
            <button className="px-3 py-1.5 text-xs rounded-lg bg-(--app-surface-container) text-(--app-muted-foreground) hover:bg-(--app-border) transition">التالي</button>
          </div>
          <p className="mt-4 text-xs text-(--app-muted-foreground)">
            ← قل: &quot;عدّل <code>data-section=&quot;pagination&quot; data-element=&quot;pagination&quot;</code> active color&quot;
          </p>
        </div>
      </section>

    </div>
  );
}

/* --- Helpers --- */

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xl font-bold text-(--color-primary)">{title}</h2>
      <div className="flex-1 h-px bg-(--app-border)" />
    </div>
  );
}

function ColorSwatch({ name, hex, varName }: { name: string; hex: string; varName: string }) {
  return (
    <div className="space-y-2">
      <div className="h-16 rounded-xl border border-(--app-border) shadow-depth-sm" style={{ background: hex }} />
      <div>
        <p className="text-sm font-medium text-(--color-primary)">{name}</p>
        <p className="text-xs text-(--app-muted-foreground) font-mono">{hex}</p>
        <p className="text-[10px] text-(--app-muted-foreground) font-mono">{varName}</p>
      </div>
    </div>
  );
}
