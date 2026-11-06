# Implementation Plan: ترقية فرع العمليات وأركان حرب والتكامل الشامل

**Branch**: `010-arkan-harb-upgrade` | **Date**: 2026-10-19 | **Status**: Completed | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-arkan-harb-upgrade/spec.md` and `/PRD.md`

## Summary

ترقية شاملة لموديول أركان حرب وفرع العمليات لتحويله إلى مركز قيادة وسيطرة عملياتي متكامل. يشمل التحديث سد الفجوات الوظيفية عبر:
1. التكامل الثنائي مع منظومة الفاكس (تحويل الفاكس لمأمورية + ربط حقيقي + عارض المرفق).
2. التكامل التلقائي مع النقطة الطبية (سحب الراحات وحالات حجز المستشفيات وقفل التمام آلياً).
3. إصدار وطباعة أوامر التحرك العسكرية وخطوط السير الرسمية (A4 Military Travel Orders).
4. الفحص الاستباقي للتعارضات داخل نافذة تسجيل المأمورية لمنع تضارب الأوامر مع الإجازات.
5. إغلاق دورة حياة المأمورية برفع مستندات إخلاء الطرف وإفادات الإنجاز.
6. مزامنة تسكين الوظائف وسجل المأموريات التراكمي مع شئون الضباط.
7. بناء منظومة إدارة جدول النوبتجيات والخدمات العسكرية مع خوارزمية عدالة التوزيع.
8. بناء سجل يومية الحوادث والبلاغات والعمليات الطارئة.
*(ملاحظة معمارية إلزامية: استبعاد تام لجناح التعليم `/education` من أي تعديل في هذه الفيتشر)*.

## Technical Context

**Language/Version**: TypeScript 5.x (Strict mode, `any` prohibited)

**Primary Dependencies**: Next.js 16 (App Router, React 19), Mongoose 9.x, Zod 4, Tailwind CSS 4, shadcn/ui, `react-to-print`

**Storage**: MongoDB 7 via Mongoose ODM (local Docker). New collections: `DutyRoster`, `IncidentLog`. Extended collections: `Mission`. Cross-queried collections: `Fax`, `MedicalVisit`, `Officer`, `DailyRollcall`, `PositionAssignment`.

**Testing & Quality Gates**: `npx tsc --noEmit` (0 errors), ESLint compliance, manual workflow verification.

**Target Platform**: Local network Docker deployment (Offline-First / Air-gapped Intranet).

**Constraints**:
- Strict RTL Arabic layout throughout.
- Sapphire Archive Design System ("The Digital Monolith") tokens and centralized UI components (`MainTable`, `ModalShell`, `DateField`, `CustomSelect`).
- Mandatory Audit Logging (`logAuditEvent`) with valid MongoDB `ObjectId` string as `targetId`.
- Out-of-unit officers isolation (`isInUnit: false` strictly archived).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|---|---|---|
| **I. Security-First** | Auth & RBAC on every API route; strict Zod validation; `logAuditEvent()` on all mutations; no dev backdoors | PASS — All new endpoints enforce RBAC (`arkan_harb: edit/view`), Zod schema parsing, and audit logging |
| **II. SSR-First** | React Server Components by default; leaf client components for modals/forms | PASS — Base pages SSR-rendered; modals and interactive roster tables isolated in client components |
| **III. Offline-First** | No external APIs, CDNs, or internet fonts; local storage & Docker MongoDB | PASS — Fully air-gapped intranet architecture |
| **IV. Type Safety** | TypeScript strict mode; zero `any`; centralized types in `@/types/` | PASS — All shared interfaces in `@/types/` and `.shared.ts` |
| **V. Quality Gates** | `npx tsc --noEmit` clean compilation (0 errors); edge-cases covered | PASS — Rigorous type safety verified |
| **VI. Design-Driven UI** | Sapphire Archive palette; primary blue focus rings; `ModalShell` with `bg-black/40` | PASS — Standard components used exclusively |

## Project Structure

### Documentation (this feature)

```text
specs/010-arkan-harb-upgrade/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (api-contracts.md)
└── tasks.md             # Phase 2 output (to be generated next)
```

### Source Code (next/ directory)

```text
next/
├── lib/db/models/
│   ├── DutyRoster.ts              # [NEW] Duty & Guard Roster Mongoose model
│   ├── DutyRoster.shared.ts       # [NEW] Duty Roster types & constants
│   ├── IncidentLog.ts             # [NEW] Daily incident log model
│   ├── IncidentLog.shared.ts      # [NEW] Incident log types & constants
│   ├── Mission.ts                 # [MODIFY] Add linkedFax ObjectId, travel order, docs
│   └── Mission.shared.ts          # [MODIFY] Update mission types
│
├── lib/arkan-harb/
│   ├── rollcall-engine.ts         # [MODIFY] Query MedicalVisit & DutyRoster
│   └── roster-engine.ts           # [NEW] Roster equity calculation logic
│
├── app/api/arkan-harb/
│   ├── roster/route.ts            # [NEW] Get/Put duty roster
│   ├── incidents/route.ts         # [NEW] Get/Post incident logs
│   ├── missions/[id]/travel-order/route.ts # [NEW] Travel order dispatch data
│   └── missions/check-conflict/route.ts   # [NEW] Proactive conflict check
│
├── app/api/fax/[id]/
│   └── convert-to-mission/route.ts # [NEW] Convert incoming fax to mission
│
├── components/arkan-harb/
│   ├── TravelOrderModal.tsx       # [NEW] Official travel order print view
│   ├── DutyRosterTab.tsx          # [NEW] Guard & duty roster management
│   ├── IncidentLogTab.tsx         # [NEW] Operations daily incident log
│   ├── MissionForm.tsx            # [MODIFY] Proactive conflict alerts & fax link
│   ├── MissionCompleteModal.tsx   # [MODIFY] Attachment upload for clearance
│   └── ArkanHarbClient.tsx        # [MODIFY] Integrate new tabs & actions
│
└── components/officers/
    └── tabs/OfficerMissionsTab.tsx # [NEW] Officer missions history tab in profile
```
