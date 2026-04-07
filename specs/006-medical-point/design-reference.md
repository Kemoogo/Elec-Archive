# Stitch MCP Design Reference: النقطة الطبية — Medical Point Module

## Live Server Configuration

- **Stitch Project**: `projects/14721618739991060852`
- **Design System Asset**: `assets/101360978e324d26a6d0ba49750c8f7f`
- **Design System Name**: "Vault Modern"
- **Status**: ✅ Live and accessible

## Design System Tokens

| Token | Value | Usage |
|-------|-------|-------|
| primary | `#00255a` | Primary actions, key UI elements |
| primary_container | `#1e3c72` | Primary gradient start, hero sections |
| secondary | `#365da3` | Secondary actions, links |
| tertiary | `#402000` | Warnings, accent highlights |
| surface | `#f7f9fb` | Page background |
| surface_container_low | `#f2f4f6` | Card backgrounds (no-line rule) |
| surface_container_lowest | `#ffffff` | Interactive cards, modals |
| error | `#ba1a1a` | Error states, expired badges |
| outline_variant | `#c4c6d1` | Ghost borders at 10% opacity |
| headlineFont | Plus Jakarta Sans | Section headers, titles |
| bodyFont | Inter | Body text, descriptions |
| roundness | ROUND_EIGHT | 0.5rem border-radius |

## Screen Generation Prompts

### 1. Medical Dashboard (`/medical`)

**Arabic RTL Prompt:**
```
لوحة تحكم طبية تعرض 4 بطاقات ملخصة: عدد الزيارات اليوم، عدد الأدوية تحت الحد الأدنى، عدد الأدوية منتهية الصلاحية، إجمالي المخزون. كل بطاقة تعرض رقمًا كبيرًا بالخط العريض مع وصف بالعربي تحته. البطاقات مرتبة RTL. زر للتنقل إلى قائمة الزيارات وقائمة الأدوية. استخدم نظام التصميم Vault Modern مع Glassmorphism.
```

**Stitch Call**: `stitch_generate_screen_from_text` with deviceType `DESKTOP`

---

### 2. Visits List (`/medical/visits`)

**Arabic RTL Prompt:**
```
جدول زيارات طبية بالعربي مع RTL. يحتوي على: شريط بحث أعلى الصفحة للبحث باسم المريض أو رقم الفرد، فلتر تاريخ من-إلى، جدول بالأعمدة: رقم المريض، اسم المريض، تاريخ الزيارة، التشخيص، عدد الأدوية المصروفة. أسفل الجدول ترقيم صفحات. زر "زيارة جديدة" في الأعلى على اليمين. استخدم نظام التصميم Vault Modern.
```

**Stitch Call**: `stitch_generate_screen_from_text` with deviceType `DESKTOP`

---

### 3. New Visit Form (`/medical/visits/new`)

**Arabic RTL Prompt:**
```
نموذج زيارة طبية جديدة بالعربي RTL. حقول: رقم المريض (نص)، اسم المريض (نص)، التشخيص (نص كبير)، العلاج (نص كبير). قسم "صرف أدوية": اختيار دواء من قائمة منسدلة + حقل عدد + زر إضافة. عرض الأدوية المختارة في جدول صرف مع إمكانية الحذف. زر حفظ أسفل النموذج. استخدم نظام التصميم Vault Modern مع Glassmorphism.
```

**Stitch Call**: `stitch_generate_screen_from_text` with deviceType `DESKTOP`

---

### 4. Medicine Inventory (`/medical/medicines`)

**Arabic RTL Prompt:**
```
جدول مخزون أدوية بالعربي RTL. يحتوي على: جدول بالأعمدة: اسم الدواء، الوحدة، الكمية الحالية، تاريخ الصلاحية، الحد الأدنى. بادج تحذير "مخزون منخفض" بالبرتقالي للدواء تحت الحد الأدنى. بادج خطأ "منتهي الصلاحية" بالأحمر للدواء المنتهي. أزرار تعديل وحذف لكل صف. زر "إضافة دواء" في الأعلى على اليمين. استخدم نظام التصميم Vault Modern.
```

**Stitch Call**: `stitch_generate_screen_from_text` with deviceType `DESKTOP`

---

## Design System Application Workflow

1. Generate each screen via `stitch_generate_screen_from_text`
2. Apply design system via `stitch_apply_design_system` using asset `101360978e324d26a6d0ba49750c8f7f`
3. Extract the generated HTML/CSS from the screen response
4. Convert to Next.js component with Tailwind CSS classes
5. Add `'use client'` directive only where interactive forms are needed
6. Connect to API routes via `fetch()` calls
7. Ensure Arabic RTL via `dir="rtl"` and `lang="ar"` on root layout

## CSS Conversion Notes

| Stitch Generated | Tailwind CSS Equivalent |
|------------------|-------------------------|
| `border-radius: 12px` | `rounded-xl` |
| `backdrop-filter: blur(20px)` | `backdrop-blur-xl` |
| `background: linear-gradient(#1e3c72, #2a5298)` | `bg-gradient-to-b from-[#1e3c72] to-[#2a5298]` |
| `box-shadow: 0 24px 48px rgba(30,60,114,0.04)` | `shadow-lg shadow-[#1e3c72]/4` |
| `padding: 1rem` | `p-4` |
| `gap: 1rem` | `gap-4` |
