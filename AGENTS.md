# Elec-Archive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-12

## Active Technologies
- TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4 (009-arkan-harb)
- MongoDB 7 via Mongoose ODM (local Docker) (009-arkan-harb)

- TypeScript 5.x (strict mode, no `any`)
- Next.js 16+ (App Router, React 19, Server Components)
- Mongoose 9.x + MongoDB 7
- Tailwind CSS 4 + shadcn/ui
- Zod 4 (validation)
- ESLint + Prettier
- Docker Compose (app + MongoDB)

## Project Structure

```text
next/
├── app/                 # Next.js App Router (pages + API routes)
├── lib/db/              # Mongoose connection + models
├── components/ui/       # shadcn/ui components
└── public/uploads/      # Local file storage

specs/                   # Spec Kit documents
docker-compose.yml       # App + MongoDB
```

## Commands

```bash
cd next && npm run dev        # Start dev server
cd next && npm run build      # Build for production (must pass with 0 errors)
cd next && npm run lint       # Run ESLint
docker-compose up --build     # Full Docker setup
docker-compose up -d mongo    # Start MongoDB only
```

## Code Style

- TypeScript strict mode — `any` is PROHIBITED
- React Server Components by default; `'use client'` only when necessary
- Arabic RTL layout throughout
- All API routes: verify auth → check RBAC → validate with Zod → operate → audit log → respond
- Models in `next/lib/db/models/`, shared UI in `next/components/ui/`
- Zod schemas for all form inputs and API request/response bodies

## Recent Changes
- 005-officers-affairs (UPGRADE): Added Accredited AcroForm 121 PDF Parsing & Verification Engine, Direct 121 Upload at Step 1 with Automatic Seniority & Issue Date Extraction, Strict accredited AcroForm format validation, ModalShell confirmation dialogues for update & deletion, and persistent file121IssueDate tracking across all workflows.
- 005-officers-affairs: Officers Registry module with Search, Detailed Records, Daily Rollcall with local storage recovery, Leave tracking, Assignments timeline, and Commander overview mode.
- 008-education: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 007-student-affairs: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs
- 006-medical-point: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 009-arkan-harb (COMPLETED): Staff Operations module with Rollcall, Leaves, Missions, and Position Assignments. Migrated legacy Assignment records to new specialized models.
- 009-arkan-harb (DESIGN ALIGNMENT): Arkan Harb module strictly adheres to the Sapphire Archive Design System color palette and standards as adopted in Officers Affairs (شئون الضباط). All modals use `officerLabel` for officer selectors/displays, and all tables separate Rank (`الرتبة`) and Full Name (`الاسم والبيانات العسكرية`) into distinct columns.
- PROJECT-WIDE DESIGN MANDATE: All modules in the project (Officers Affairs, Arkan Harb, Medical Point, Student Affairs, Education, Fax, Audit Log, Dashboard) MUST strictly adhere to the Sapphire Archive Design System as defined in Officers Affairs (شئون الضباط). Every input must use primary blue focus ring (`focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`), every military personnel dropdown/display must use `officerLabel`, and every personnel table must separate Rank (`الرتبة`) and Name/Military Details into distinct columns.
- PROJECT-WIDE TABLE & COMPONENT MANDATE: Every table in the system MUST strictly follow the current visual identity and styling of the Officers Affairs table (`OfficersTable.tsx`). This includes: using the standard `MainTable` component, exact font colors (`text-xs font-bold text-(--app-muted-foreground)`), clickable text (`hover:underline hover:text-(--app-info)`), `ActionButton` action buttons with tooltips and matching color scheme, and wrapping inside `<SectionWrapper noPadding className="overflow-hidden rounded-2xl">`. All close/cancel buttons everywhere MUST strictly follow standard `btn-secondary`.
- PROJECT-WIDE BUTTON & TOAST MANDATE: `btn-modal-*` classes are PROHIBITED and DELETED. All buttons throughout the entire system (pages, modals, forms, dialogs) MUST strictly use the three standard unified button classes: `btn-primary`, `btn-secondary`, and `btn-destructive`. All toast notifications MUST strictly use the centralized `ToastProvider` with Sapphire Archive design tokens, RTL layout (`dir="rtl"`), status icon badges (`CheckCircle2`, `AlertCircle`, `Info`), and `shadow-depth-lg`.


## Core Principles (from Constitution)

### I. Security-First (أمان أولاً)
- Enforce auth/authz on every API route and server layout.
- Use HttpOnly Cookies for JWT. RBAC check at API and Server level.
- **MANDATORY AUDIT LOGGING FOR ALL MUTATIONS:** Every CREATE, UPDATE, DELETE, REORDER, RESTOCK, IMPORT, STATUS_CHANGE, LOGIN, and LOGOUT across ALL modules (Officers, Arkan Harb, Medical Point, Student Affairs, Education, Faxes, Departments/Branches, Users/Auth) MUST call `logAuditEvent()`.
  - Ensure `targetId` passed to `logAuditEvent()` is a valid MongoDB `ObjectId` string (e.g., `doc._id.toString()`) and NOT an arbitrary custom ID string (like patient military number `patientId`), since the `AuditLog` schema strictly validates `targetId` as a Mongoose `ObjectId`.
  - Always include a clear, descriptive Arabic summary in `description` (e.g., including entity name, military ID, or action details).
- No public self-registration.

### II. SSR-First (عرض الخادم أولاً)
- RSC by default. `'use client'` only for interactivity/forms.
- Isolate interactivity into leaf components.

### III. Offline-First (بدون إنترنت)
- Zero internet dependency. Local MongoDB, local file storage.
- No external CDNs or APIs.

### IV. Type Safety & Validation (سلامة الأنواع)
- TypeScript STRICT mode. **`any` is PROHIBITED.**
- Validate all inputs with Zod (server-side).

### V. Quality Gates (بوابات الجودة)
- `npm run build` is run ONLY when strictly necessary (e.g., major refactoring, final deployment/delivery, or when explicitly requested by user) and is NOT required for every single routine edit to ensure fast development velocity.
- Run build and lint only if needed.
- Handle edge cases: DB failures, 404s, file limits. Always think about edge cases if needed and inform the user about those cases to take action.

### VI. Design-Driven UI (تصميم الواجهات)
- Use CSS Variables/Design Tokens.
- Arabic RTL layout throughout (`dir="rtl"`).

---

## Design System — Sapphire Archive ("The Digital Monolith")

### CSS Design Tokens (defined in `next/app/globals.css`)

```
--app-primary / --color-primary        : #1E3C72 (deep navy)
--app-primary-hover / --color-primary-hover : #2a5298
--app-background                       : #f8fafc
--app-surface / --color-surface        : #ffffff
--app-surface-container                : #f1f5f9
--app-foreground                       : #172b53
--app-muted-foreground / --color-muted : #4a638c
--app-border / --color-border          : #e2e8f0
--app-success                          : #10b981
--app-warning                          : #f59e0b
--app-error                            : #ef4444
--app-info                             : #3b82f6
--app-white                            : #ffffff
```

Dark mode tokens exist under `.dark`.

### Typography, Text & Hover Colors Mandate
- Page titles: `text-xl font-black text-(--color-primary)`
- Modal titles: `text-base font-extrabold text-(--color-primary)`
- Labels: `text-xs font-bold text-(--app-muted-foreground) block mr-1` (Officer Style)
- Muted/Inactive text: `text-(--app-muted-foreground)`
- **Hover on Interactive Elements (Tabs, Buttons, Icons, Links):** MUST always highlight with **Primary Sapphire Blue** (`hover:text-(--color-primary)` or `hover:text-(--app-info)`). **PROHIBITED:** NEVER use near-black / dark text on hover (`hover:text-(--app-foreground)`, `hover:text-slate-900`, `hover:text-black`). All interactive elements stay true to the Sapphire Archive color palette.

### Z-Index Stacking Order
```
z-100   Toast
z-60    Modals (ModalShell / Dialog) — ALWAYS on top of everything
z-50    Navbar
z-2..3  Active folder tab trigger
z-0     Normal page content
```

### Single Source of Truth (SSOT) — `theme-playground` Mandate
> [!IMPORTANT]
> **SINGLE SOURCE OF TRUTH (SSOT):** The page `/theme-playground` (`next/app/(dashboard)/theme-playground/page.tsx`) is the **sole and definitive reference (المرجع الأساسي والوحيد)** for all visual designs, color tokens, typography, inputs, tables, badges, and modals across the entire application.
> 
> **COMPONENT REUSE RULE:** NEVER write ad-hoc inline classes or create custom color combinations for elements in pages or modals. Every UI element MUST be backed by a centralized reusable component from `@/components/ui/`. Any styling adjustment requested by the user on `/theme-playground` must be implemented inside the corresponding shared UI component so that it automatically updates across the entire application.

### Modal Pattern & Component Library (Unified Strict Mandate)
> [!IMPORTANT]
> **NO BACKDROP BLUR:** Do NOT use `backdrop-blur`, `backdrop-blur-xs`, `backdrop-blur-sm`, or any CSS backdrop filters on modal overlays (`overlayClassName`). ALWAYS use clean translucent `overlayClassName="bg-black/40"`.

All modals must use the centralized sub-components from `@/components/ui/modal-shell`:
- **`ModalShell`**: Dialog container with `overlayClassName="bg-black/40"`. Handles **title typography (`text-base font-extrabold`), icon container badge, colors, and close button centrally**.
  - **Rule**: NEVER pass custom inline typography `<span className="...">` or `<div className="...">` to `title`.
  - **Rule**: ALWAYS pass `title="العنوان"` (plain string), `icon={<Icon className="w-4 h-4" />} `, and optional `titleVariant="default" | "danger" | "warning" | "info"`.
- **`ModalHeaderCard`**: Top summary card (`title`, `subtitle`, `icon`, `badge`).
- **`ModalSection`**: Inner section container (`variant="card"` (`bg-(--color-primary)/5 border-(--color-primary)/10`), `title`, `badge`).
- **`ModalBadge`**: Unified chip/badge (`icon`, `children`, `onClick`) with `bg-(--app-surface-container) border-(--app-border) shadow-sm text-xs font-bold text-(--app-muted-foreground)`.
- **`ModalActions`**: Standardized footer buttons (`submitText`, `onCancel`, `onConfirm`, `submitVariant`).

```tsx
<ModalShell
  title="بيانات الوظيفة"
  icon={<Briefcase className="w-4 h-4" />}
  onClose={onClose}
  overlayClassName="bg-black/40"
  panelClassName="max-w-xl border-(--app-border) shadow-depth-xl"
  bodyClassName="p-5 space-y-4 no-scrollbar"
  footer={<ModalActions submitText="حفظ" onCancel={onClose} />}
>
  {/* Standard Top Header Card */}
  <ModalHeaderCard
    icon={<Briefcase className="w-6 h-6" />}
    title="المسمى / العنوان"
    subtitle="الفرع / القسم: ..."
    badge={<ModalBadge icon={<AlertCircle className="w-3.5 h-3.5" />}>شارة</ModalBadge>}
  />

  {/* Standard Section */}
  <ModalSection title="عنوان القسم" badge={<ModalBadge>مسكن</ModalBadge>}>
    <p className="text-xs font-bold text-(--app-muted-foreground)">المحتوى...</p>
  </ModalSection>
</ModalShell>
```

### Form Field Pattern (Officer Style)
```tsx
<div className="space-y-1.5">
  <label htmlFor="id" className="text-xs font-bold text-(--app-muted-foreground) block mr-1">الاسم</label>
  <input
    id="id"
    className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 focus:outline-none focus:ring-blue-500/20 focus:border-blue-500 transition-all text-right"
  />
</div>
```

**Focus State Rule:**
- **DO NOT** use module-specific colors (e.g., emerald for medical) for default input focus states.
- **ALWAYS** use the primary blue focus indicator: `focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`.
- Status colors (red/green) are reserved for validation errors or success confirmations only.

### Select Field Pattern
```tsx
<div className="relative">
  <select className="w-full px-3 py-2 bg-(--app-surface) border border-(--app-border) rounded-xl text-sm font-bold text-slate-500 appearance-none">
    <option>...</option>
  </select>
  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
</div>
```

### Date Field Pattern
**ALWAYS** use the specialized `DateField` component for any date inputs. It handles smart digit entry (DD-MM-YYYY) and syncs with an ISO (YYYY-MM-DD) state.

```tsx
import { DateField } from "@/components/ui/date-field";

<DateField
  id="date-id"
  label="تاريخ الاستحقاق"
  value={dateValue} // ISO string
  onChange={setDateValue}
  required
/>
```

**Horizontal Layout (Inline):**
To place the label and input on the same line, use the following pattern:
```tsx
<DateField
  id="date-id"
  label="العنوان"
  value={value}
  onChange={setValue}
  className="!flex !flex-row !items-center !justify-between !space-y-0 gap-3"
  containerClassName="w-48" // or flex-1
/>
```

### Table Pattern (Officer Table Style — Mandatory Project Mandate)
All tables across all modules MUST strictly follow the Officers Table design pattern:

1. **Wrapper:** Wrap tables inside `<SectionWrapper noPadding className="overflow-hidden rounded-2xl">`.
2. **Table Header (`thead`):**
   `bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs`
3. **Table Body Rows (`tbody` & `td`):**
   - `divide-y divide-(--app-border)/40 text-xs`
   - Cells: `px-5 py-3 text-xs font-bold text-(--app-muted-foreground)`
   - Hover state: `hover:bg-(--app-surface-container)/60 transition-colors`
4. **Clickable Text / Links:**
   `hover:underline hover:text-(--app-info) cursor-pointer transition-colors`
5. **Action Buttons & Tooltips (`ActionButton`):**
   - Icon-only buttons wrapped in `ActionButton` component with hover tooltip:
   ```tsx
   function ActionButton({ icon, color, title, onClick }: ActionButtonProps) {
     return (
       <div className="relative flex flex-col items-center group">
         <button type="button" onClick={onClick} className={`p-1.5 rounded-lg transition-all ${color} relative cursor-pointer`}>
           {icon}
         </button>
         {title && (
           <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[200px] whitespace-normal bg-(--app-foreground) text-(--app-surface) text-[10px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xl hidden group-hover:block pointer-events-none border border-(--app-border)/20">
             {title}
             <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-(--app-foreground)"></div>
           </div>
         )}
       </div>
     );
   }
   ```
6. **Interaction & Editing:**
   - Clicking on the item name/title directly triggers the edit modal.
   - The dedicated `الإجراءات` column contains icon-only actions (like Delete `Trash2`).
7. **Cursor:**
   - Standard cursor (`cursor-default`) or clickable link cursor (`cursor-pointer`); DO NOT use query/help cursor (`cursor-help`).

### VII. Component Reuse Mandate (إعادة استخدام المكونات البرمجية)
- **DO NOT build UI elements manually with raw HTML/CSS** when a shared component exists in `@/components/ui/` or `@/components/layout/`.
- Reusing standard components ensures design system consistency, accessibility, RTL support, and optimal performance.

#### Standard Component Usage Guide:
1. **`MainTable` (`@/components/ui/Table`):**
   Use for all tabular data. Supports `columns` (with nested `children` for multi-level / merged headers), `data`, `showSerialNumber`, `isNumeric`, `render`, `cellAlign`, `headerAlign`, and `minWidth`.
2. **`ModalShell` (`@/components/ui/modal-shell`):**
   Use for all modals and dialogs. Always specify `overlayClassName="bg-black/40"` (NO backdrop-blur). Supports `title`, `footer`, `panelClassName`, `bodyClassName`.
3. **`ModalActions` (`@/components/ui/modal-actions`):**
   Use inside `footer` prop of `ModalShell`. Supports `submitText`, `submitVariant` ("primary" | "destructive"), `submitLoading`, `onCancel`, `onSubmit` / `onConfirm`, and `form`.
4. **`FolderTabs` (`@/components/ui/folder-tabs`):**
   Use for multi-tab views and switching inside pages or modals. Accepts `tabs: TabItem[]` with `id`, `label`, `icon`, `content`, `badge`.
5. **`DateField` (`@/components/ui/date-field`):**
   Use for all date inputs. Handles smart digit entry (DD-MM-YYYY) and syncs with ISO string state (`value`, `onChange`, `required`, `error`).
6. **`SectionWrapper` (`@/components/ui/section-wrapper`):**
   Use as container for cards, tables (`noPadding`), and dashboard widgets.
7. **`ActionButton` (`@/components/officers/OfficersTable`):**
   Use for table row action buttons with built-in group hover tooltips (`icon`, `color`, `title`, `placement`, `onClick`).
8. **`PageHeader` (`@/components/layout/ModernPageHeader`):**
   Standard header with `title`, `subtitle`, `icon`, `showSearch`, `searchQuery`, `onSearchChange`, `action`.
9. **`ToastProvider` / `useToast` (`@/components/ui/toast`):**
   Unified toast notifications across the entire app. Adheres strictly to Sapphire Archive tokens, RTL layout (`dir="rtl"`), status icon badges (`CheckCircle2`, `AlertCircle`, `Info`), and `shadow-depth-lg`. Call `showToast(message, "success" | "error" | "info")`.
10. **`MonoBadge` / `MonoNumber` (`@/components/ui/mono-badge`):**
   Standard military monospace badges and numbers (`font-mono tracking-tight`). Used for Military IDs, Seniority Numbers, National IDs, phone numbers, batches, dates, and order numbers. Supports `label`, `value`, `icon`, `variant` ("surface" | "primary" | "muted" | "outline"), and `size` ("sm" | "md" | "lg").

### API Route Pattern
1. `authenticate()`
2. Check RBAC
3. `checkApiRateLimit()`
4. `connectToDatabase()`
5. Parse & validate with Zod
6. Business logic
7. `logAuditEvent()`
8. Standardized response



<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at `specs/009-patient-medical-record/plan.md`.
<!-- SPECKIT END -->
