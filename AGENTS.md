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


## Core Principles (from Constitution)

### I. Security-First (أمان أولاً)
- Enforce auth/authz on every API route and server layout.
- Use HttpOnly Cookies for JWT. RBAC check at API and Server level.
- Log every CREATE/UPDATE/DELETE to AuditLog. Ensure `targetId` passed to `logAuditEvent()` is a valid MongoDB `ObjectId` string (e.g., `doc._id.toString()`) and NOT an arbitrary custom ID string (like patient military number `patientId`), since the `AuditLog` schema strictly validates `targetId` as a Mongoose `ObjectId`.
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
- `npm run build` must pass with 0 errors/warnings before completion.
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

### Typography & Font
- Page titles: `text-xl font-black text-(--color-primary)`
- Labels: `text-xs font-bold text-(--app-muted-foreground) block mr-1` (Officer Style)
- Muted text: `text-(--app-muted-foreground)`

### Z-Index Stacking Order
```
z-100   Toast
z-60    Modals (ModalShell / Dialog) — ALWAYS on top of everything
z-50    Navbar
z-2..3  Active folder tab trigger
z-0     Normal page content
```

### Modal Pattern (Unified Style)
```tsx
<ModalShell
  title={<span className="text-base font-semibold text-(--color-primary)">العنوان</span>}
  onClose={onClose}
  overlayClassName="bg-black/40"
  panelClassName="max-h-[85vh] max-w-lg border-(--app-border) shadow-depth-xl"
  bodyClassName="p-6 no-scrollbar"
  footer={<ModalActions>…buttons…</ModalActions>}
>
  <form id="form-id" onSubmit={handleSubmit} className="space-y-4">
    <div className="space-y-4 text-right">
       {/* Use Grid for layout consistency */}
       <div className="grid grid-cols-2 gap-3">
         {/* Inputs... */}
       </div>
    </div>
  </form>
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
