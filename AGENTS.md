# Elec-Archive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-10-18

## Active Technologies
- TypeScript 5.x (strict mode, no `any`)
- Next.js 16+ (App Router, React 19, Server Components)
- Mongoose 9.x + MongoDB 7 via local Docker
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
cd next && npm run build      # Build for production (required for releases/major refactors)
cd next && npm run lint       # Run ESLint
graphify auto-update .        # Refresh code structure AST index after code edits
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
- 010-arkan-harb-upgrade (COMPLETED): Operations & Staff upgrade with Fax-to-Mission bilateral conversion, Medical Point auto-sync for leaves/rests/hospitals, official A4 Military Travel Orders with conflict check engine, Clearance Documents upload, Officers Affairs dynamic position and missions history tab, Monthly Duty Roster with distribution equity metrics, and Daily Incidents Log with commander instruction recording.
- 009-patient-medical-record (COMPLETED): Patient Medical Record with Allergies, Chronic Diseases, and Diagnosis tabs. Unified patient profile page with real-time record saving, strict Zod validation, and audit logging.
- 005-officers-affairs (UPGRADE): Added Accredited AcroForm 121 PDF Parsing & Verification Engine, Direct 121 Upload at Step 1 with Automatic Seniority & Issue Date Extraction, Strict accredited AcroForm format validation, ModalShell confirmation dialogues for update & deletion, and persistent file121IssueDate tracking across all workflows.
- 005-officers-affairs: Officers Registry module with Search, Detailed Records, Daily Rollcall with local storage recovery, Leave tracking, Assignments timeline, and Commander overview mode.
- 008-education: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 007-student-affairs: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs
- 006-medical-point: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 009-arkan-harb (COMPLETED): Staff Operations module with Rollcall, Leaves, Missions, and Position Assignments. Migrated legacy Assignment records to new specialized models.
- 009-arkan-harb (DESIGN ALIGNMENT): Arkan Harb module strictly adheres to the Sapphire Archive Design System color palette and standards as adopted in Officers Affairs (شئون الضباط). All modals use `officerLabel` for officer selectors/displays, and all tables separate Rank (`الرتبة`) and Full Name (`الاسم والبيانات العسكرية`) into distinct columns.
- PROJECT-WIDE DESIGN MANDATE: All modules in the project (Officers Affairs, Arkan Harb, Medical Point, Student Affairs, Education, Fax, Audit Log, Dashboard) MUST strictly adhere to the Sapphire Archive Design System as defined in Officers Affairs (شئون الضباط). Every input must use primary blue focus ring (`focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`), every military personnel dropdown/display must use `officerLabel`, and every personnel table must separate Rank (`الرتبة`) and Name/Military Details into distinct columns.
- PROJECT-WIDE TABLE & COMPONENT MANDATE: Every table in the system MUST strictly follow the Sapphire Archive visual identity:
  1. The PRIMARY ENTITY in every table (e.g. Officer Name in personnel/leaves/rollcall, Course Name in education, Student Name in student affairs, Medicine Name in pharmacy, Patient Name in visits, Mission Title in missions, Position Title in positions, Fax Subject in faxes, User Name in user management) MUST strictly be highlighted with `text-(--color-primary)` (with `font-black` / `font-extrabold` and `hover:underline hover:text-(--app-info)`).
  2. The ACTIONS COLUMN ("عامود الإجراءات") and action buttons in tables (`btn-action-primary`, `ActionButton`, edit, delete, etc.) MUST strictly take the same styling as the primary element (`text-(--color-primary)` with `hover:text-(--app-info)`).
  3. All REMAINING secondary columns and elements in the table (Ranks, Military IDs, Seniority Numbers, Dates, Day Names, Statuses, Badges) MUST strictly use the calm neutral text `text-(--app-muted-foreground)`.
  4. All tables MUST use `MainTable` (`@/components/ui/Table`). `MainTable` is completely self-contained and already encapsulates `<SectionWrapper noPadding className="overflow-hidden rounded-2xl">` and the scroll container. Callers DO NOT wrap `MainTable` inside an external `<SectionWrapper>`. Any custom wrapper classes (such as print overrides `print:border-none print:shadow-none`) are passed via the `wrapperClassName` prop.
- PROJECT-WIDE BUTTON & TOAST MANDATE: `btn-modal-*` classes are PROHIBITED and DELETED. All buttons throughout the entire system (pages, modals, forms, dialogs) MUST strictly use the three standard unified button classes: `btn-primary`, `btn-secondary`, and `btn-destructive`. All toast notifications MUST strictly use the centralized `ToastProvider` with Sapphire Archive design tokens, RTL layout (`dir="rtl"`), status icon badges (`CheckCircle2`, `AlertCircle`, `Info`), and `shadow-depth-lg`.
- PROJECT-WIDE CENTRALIZED SHARED TYPES MANDATE: Creating ad-hoc local interfaces or duplicate entity `type` / `interface` declarations (e.g. `OfficerOption`, `OfficerInfo`, `OfficerBasicInfo`, etc.) inside pages or components is STRICTLY PROHIBITED. All domain entity shared types MUST reside centrally in `@/types/` (e.g. `@/types/officer.ts`, `@/types/index.ts`) and model-shared logic in `next/lib/db/models/<Entity>.shared.ts` (re-exported via `@/lib/db/models`). Whenever an entity interface or option shape changes or is created, it MUST be updated in the centralized `@/types/` registry so it is ALWAYS up-to-date and reused across all modules.
- PROJECT-WIDE COLOR PALETTE & WARNINGS MANDATE: Non-brand colors (orange/amber and yellow) are STRICTLY PROHIBITED across all pages, cards, tables, AND alerts/warnings. Green and Red are ONLY permitted in: (1) Toast notifications (`ToastProvider` — green for success, red for error), and (2) Standalone modal delete confirmation buttons (`btn-destructive`). In all tables (`MainTable`), the Actions column and action buttons MUST strictly use the primary theme color (`text-(--color-primary) hover:text-(--app-info)` with `btn-action-primary`). All warnings, notices, and alert banners MUST strictly use either Sapphire Blue (`bg-(--color-primary)/5 border border-(--color-primary)/20 text-(--color-primary)`) or calm neutral (`bg-(--app-surface-container)`), NEVER orange or amber.
- NON-NEGOTIABLE MANDATE: STRICT GIT BRANCHING & MAIN BRANCH PROTECTION (حظر الانتقال أو الدمج في الفرع الرئيسي main/master إلا بعد التأكيد النهائي وبأمر صريح من المستخدم):
  * All development (features, improvements, bug fixes, refactors) MUST occur strictly on dedicated, isolated feature branches (e.g. `feature/<name>` or `<ticket-id>-<name>`).
  * The agent MUST NEVER switch to or merge into the `main` or `master` branch autonomously or prematurely.
  * Merging into `main` or `master` is STRICTLY PROHIBITED until:
    1. The feature or modification is 100% complete, fully implemented, and thoroughly tested.
    2. TypeScript type check (`npx tsc --noEmit`) passes with 0 errors in strict mode.
    3. Full UI layout, component structure, and design system audit passes without any deviations.
    4. **AN EXPLICIT, DIRECT ORDER IS GIVEN BY THE USER ("بأمر مباشر وصريح من المستخدم")** approving the merge to `main`/`master`. Without this explicit command, work MUST remain strictly on the feature branch.
- PROJECT-WIDE UI LAYOUT & DESIGN SYSTEM MANDATE (الالتزام الصارم بتخطيط وهيكل الواجهات UI Layout):
  * **SSOT Authority**: The living reference `/theme-playground` is the absolute SSOT for all UI layouts and components across the entire platform.
  * **Tables Layout**: Every table across all modules MUST use `MainTable` (`@/components/ui/Table`) directly (without redundant outer `<SectionWrapper>` since `MainTable` already includes it). Standard header `bg-[var(--color-primary)] text-white`. Primary entity in table: `text-(--color-primary) font-black hover:underline hover:text-(--app-info)`. Actions column & buttons: MUST use `ActionButton` with `btn-action-primary` (`text-(--color-primary) hover:text-(--app-info)`). All secondary columns/text: calm neutral `text-(--app-muted-foreground)`. Use `showSerialNumber` for the standard Egyptian military index column (`م`).
  * **Modals Layout**: Every dialog/modal MUST use `ModalShell` with `overlayClassName="bg-black/40"`. Backdrop blur (`backdrop-blur`) is STRICTLY PROHIBITED. Titles must be clean strings with icon badge. Footer MUST use `ModalActions` with unified buttons (`btn-primary`, `btn-secondary`, `btn-destructive`).
  * **Form Fields & Inputs Layout**: Every dropdown MUST use `CustomSelect` (raw `<select>` is strictly prohibited). Every date MUST use `DateField`. Focus ring on all inputs MUST be `focus:outline-none focus:ring-blue-500/20 focus:border-blue-500`. Labels MUST follow officer label pattern `text-xs font-bold text-(--app-muted-foreground) block mr-1`.
  * **Colors & Tone**: Non-brand colors (`amber`, `orange`, `yellow`) and raw `text-slate-500` are STRICTLY PROHIBITED. Use design tokens: `--color-primary`, `--app-muted-foreground`, `--app-surface-container`, `--app-border`. Red and green are restricted solely to toast notifications and standalone modal delete buttons (`btn-destructive`).
- NON-NEGOTIABLE MANDATE: OUT-OF-UNIT OFFICERS ARE STRICTLY ARCHIVED (عزل تام للضباط المنقولين وخارج الوحدة):
  * A transferred, retired, terminated, or departed officer (`isInUnit: false`) is considered STRICTLY ARCHIVED (`مؤرشف`).
  * Out-of-unit officers MUST NEVER appear in any active operational workflow, dropdown, select modal, active register, or calculation:
    - Leaves register and leave request modals (سجل الإجازات وطلبات الإجازة).
    - Daily rollcall and operational attendance engines (التمام اليومي ومحرك حساب القوة).
    - Missions and external assignments (المأموريات والتكليفات).
    - Position placements and substitutions (تسليم الوظائف والتكليفات والبدلاء).
    - Dashboard active personnel counters (إحصائيات القوة الفعلية بالوحدة).
  * Out-of-unit officers have ONLY ONE place in the system: the Historical Archive (أرشيف الضباط السابقين / سجل الحركات وتاريخ الخدمة في شئون الضباط).
  * All active queries, calculation engines, and mutation APIs MUST enforce `{ isInUnit: true, employmentStatus: "active" }`. Assigning an out-of-unit officer to a leave, mission, position, or rollcall is strictly prohibited at both API and UI levels.


## Core Principles & System Governance

All development MUST comply with the project constitution at [.specify/memory/constitution.md](file:///home/karim/projects/Elec-Archive/.specify/memory/constitution.md) (Security-First, SSR-First, Offline-First, Type Safety, Quality Gates, Design-Driven UI).

Key operational mandates:
- **Main Branch Protection**: Never switch to or merge into `main`/`master` without (1) 100% completion & verification, (2) 0 TypeScript errors, (3) full UI audit, and (4) explicit direct user command.
- **UI Layout Strict Compliance**: Reusable components (`MainTable`, `ModalShell` without blur, `CustomSelect`, `DateField`) and design tokens (`--color-primary`, `--app-muted-foreground`, `--app-surface-container`) MUST be used without exception.
- **Audit Logging**: Every CREATE, UPDATE, DELETE, REORDER, RESTOCK, IMPORT, STATUS_CHANGE, LOGIN, and LOGOUT across ALL modules MUST call `logAuditEvent()`. Ensure `targetId` passed to `logAuditEvent()` is a valid MongoDB `ObjectId` string (e.g. `doc._id.toString()`) and NOT an arbitrary custom ID string (like patient military number `patientId`), since the `AuditLog` schema strictly validates `targetId` as a Mongoose `ObjectId`.
- **Entity Types**: Never declare ad-hoc entity types in components/pages; centralize in `@/types/` and `next/lib/db/models/<Entity>.shared.ts`.
- **Quality Gates**: `npm run build` is run ONLY when strictly necessary for releases/major refactors, not for routine edits.
- **Search Debounce & Server Load Protection**: All search inputs across the application MUST avoid instant keystroke requests. Use debouncing (minimum 450-500ms delay), enforce minimum 2-character query length before firing server queries or router pushes, support immediate execution on Enter key press or search button click, and cancel in-flight requests using `AbortController`. Backend search endpoints MUST guard against single-character regex table scans.
- **Code Navigation Index (`graphify`)**: Always run `graphify auto-update .` after editing, refactoring, or creating source code files to keep the structural AST index (`graphify-out/graph.json`) accurate and synchronized.
- **Design System SSOT**: Visual identity, component styles, and tokens are strictly governed by the interactive Single Source of Truth at `/theme-playground` and centralized UI components in `next/components/ui/`.

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
- **`ModalActions`**: Standardized footer buttons (`mode="action" | "view"`, `submitText`, `cancelText`, `onCancel`, `onConfirm`, `destructiveText`, `onDestructive`, `startSlot`). Standardizes RTL layout: Primary Action is anchored at the far left, Secondary Action is adjacent to its right, and Destructive/Auxiliary Action is isolated on the far right. Binary naming is strictly enforced: Mutation/form modals use "إلغاء" (`mode="action"`), View/details modals use "إغلاق" (`mode="view"`). Combining "إلغاء" and "إغلاق" in the same modal is strictly prohibited.

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
- Green and Red status indicators are reserved strictly for Toast notifications (`ToastProvider`) and standalone modal destructive buttons (`btn-destructive`). Default forms and inputs stay strictly within the primary brand palette.

### Select Field Pattern — CustomSelect Mandate
**ALWAYS** use the modern `CustomSelect` component (`@/components/ui/custom-select`) for any dropdown selection. Standard HTML `<select>` is strictly PROHIBITED in newly developed and updated interfaces.

`CustomSelect` provides full RTL alignment, custom chevron animations, badges, descriptions, keyboard navigation (ArrowUp/ArrowDown/Enter/Escape), and Sapphire Archive styling tokens.

```tsx
import { CustomSelect, type CustomSelectOption } from "@/components/ui/custom-select";

<CustomSelect
  id="field-id"
  label="العنوان"
  value={value}
  onChange={setValue}
  options={options} // Array of { value, label, description?, badge?, icon? }
  placeholder="اختر من القائمة..."
  required
/>
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

1. **Self-Contained Architecture:** `MainTable` (`@/components/ui/Table`) is completely self-contained. It internally renders `<SectionWrapper noPadding className={cn("overflow-hidden rounded-2xl", wrapperClassName)}>` and `<div className="overflow-x-auto">`. Callers DO NOT wrap `MainTable` inside another `<SectionWrapper>`.
2. **Table Header (`thead`):**
   `bg-[var(--color-primary)] dark:bg-(--color-primary)/10 text-white dark:text-(--color-primary) border-b border-(--app-border) text-xs font-black`
3. **Table Body Rows (`tbody` & `td`):**
   - `divide-y divide-(--app-border)/40 text-xs`
   - Default cell styling: `px-5 py-3 text-xs font-bold text-(--app-muted-foreground) whitespace-nowrap`
   - Row hover state: `hover:bg-(--app-surface-container)/60 transition-colors`
4. **Primary Entity Highlighting:**
   The primary subject in every row (Officer Name, Course, Medicine, Patient, Fax Subject, Date) MUST strictly be highlighted with `text-(--color-primary)` (or `text-(--color-primary-hover)`) and `font-black` / `font-extrabold`. Clickable entities add `hover:underline hover:text-(--app-info) cursor-pointer transition-colors`.
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
   - **Color Restriction Rule**: Red, green, and orange/amber are strictly PROHIBITED inside tables and on table action buttons (`Trash2`, edit, etc.). All table action buttons must strictly use `btn-action-primary` (`text-(--color-primary) hover:text-(--app-info)`). Red and green are ONLY permitted in toast notifications (`ToastProvider`) and standalone modal destructive buttons (`btn-destructive`).
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
   The single, unified, and mandatory tabular component across the entire application.
   
   **`MainTable<T>` Props Specification:**
   - `columns: TableColumn<T>[]` (Mandatory): Array of column specifications.
   - `data: T[]` (Mandatory): Array of table row objects.
   - `showSerialNumber?: boolean`: When `true`, automatically renders the Egyptian military sequence column (`م`) with `width: 1%`, `text-center`, and `font-mono`. DO NOT create manual `#` index columns in `columns`.
   - `isLoading?: boolean`: When `true`, automatically renders a centralized animated spinner with `جاري التحميل...` inside the table container.
   - `emptyTitle?: string`, `emptyDescription?: string`, `emptyIcon?: LucideIcon`: Automatically renders `<EmptyState>` when `data.length === 0`.
   - `onRowClick?: (row: T) => void`: Enables interactive row selection with `cursor-pointer hover:bg-(--app-surface-container)`.
   - `wrapperClassName?: string`: Custom classes applied to the container `SectionWrapper` (e.g. `print:border-none print:shadow-none`).
   - `className?: string`: Custom classes applied to the `<table>` element.
   - `variant?: "primary" | "secondary"`: `"primary"` (default deep navy `thead`) vs `"secondary"` (`bg-(--app-surface-container)`).

   **`TableColumn<T>` Properties Specification:**
   - `header: ReactNode`: Column header text or JSX.
   - `accessor?: string`: Property key path in row object (supports nested dot notation like `"officer.name"`).
   - `render?: (value: unknown, row: T) => ReactNode`: Custom cell renderer receiving the cell value and entire row object.
   - `minWidth?: boolean`: When `true`, sets `style={{ width: '1%', whiteSpace: 'nowrap' }}` on both `<th>` and `<td>`. Essential for serial numbers, codes, dates, badges, and action columns to prevent awkward stretching or wrapping.
   - `cellAlign?: "right" | "center" | "left" | "justify"`: Alignment for cell content. Automatically aligns the header identically if `headerAlign` is omitted.
   - `headerAlign?: "right" | "center" | "left" | "justify"`: Alignment for header text. Automatically aligns the cell identically if `cellAlign` is omitted.
   - `isNumeric?: boolean`: When `true`, automatically applies `font-mono` to the cell content.
   - `emptyValue?: string`: Fallback string when accessor value is null/undefined/empty string (defaults to `"-"`).
   - `className?: string` / `tdClassName?: string`: Additional styling applied to table cell `<td>`.
   - `headerClassName?: string`: Additional styling applied to header cell `<th>` (e.g. `min-w-[200px]`).
   - `children?: TableColumn<T>[]`: Supports grouped, multi-level headers with automatic `colSpan` and `rowSpan` calculation.
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
11. **`CustomSelect` (`@/components/ui/custom-select`):**
   Mandatory unified dropdown select across the entire system. Replaces native `<select>`. Supports options with `label`, `description`, `badge`, `icon`, keyboard navigation (arrows/enter/escape), custom focus states, and RTL alignment.

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
shell commands, and other important information, read the current plan at specs/012-quarterly-backup-retention/plan.md
<!-- SPECKIT END -->
