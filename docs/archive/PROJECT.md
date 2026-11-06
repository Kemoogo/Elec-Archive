# Project: Elec-Archive Full-System Audit & Phased Remediation

## Architecture
- **Framework**: Next.js 16 (App Router, React 19, Server Components) + TypeScript 5.x strict mode.
- **Database & ODM**: MongoDB 7 (local Docker) via Mongoose 9.x.
- **Access Control (RBAC)**: 4-tier hierarchy (`Admin` > `Commander` > `Employee` > `Viewer`) with granular module permissions (`none` / `view` / `edit`).
- **Design System**: Sapphire Archive ("The Digital Monolith") strictly adhering to tokens (`--color-primary`, `--app-muted-foreground`), `ModalShell` (`bg-black/40`), `MainTable`, and RTL Arabic layout.
- **Form State Management**: Smart modal dirty-state checking via `useFormDirty` and `ModalActions`.

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Middleware Execution & Route Guards | Rename `next/proxy-lib.ts` to `next/middleware.ts` to enable layout protection | M1 | CRIT-01 / SEC-01 | DONE |
| 2 | Smart Modal Dirty State Hook | Implement `useFormDirty<T>` to track form changes against initial state | M1 | R4 Architecture | DONE |
| 3 | ModalActions Dirty & ReadOnly Support | Enhance `ModalActions` with `isDirty`, `readOnly`, `hideSubmit`, suppressing empty mutations | M1 | R4 / CRIT-04 | DONE |
| 4 | Modal Overlay Standard Default | Update `ModalShell.tsx` default overlay to `bg-black/40` | M1 | MED-05 / R2-06 | DONE |
| 5 | Centralized CastError Handling | Add Mongoose `CastError` handling in `handleApiError` returning HTTP 400 | M1 | HIGH-07 / R3-05 | DONE |
| 6 | Executive Commander Ratification Check | Enforce `admin`/`commander` only in `api/arkan-harb/leaves/commander-decision` | M2 | HIGH-01 / SEC-02 | DONE |
| 7 | Role Hierarchy Central Helper | Standardize module authorization via `hasModuleAccess` across all API routes | M2 | HIGH-02 / SEC-03 | DONE |
| 8 | Seniority NoSQL Injection Shield | Add strict Zod schema validation to `api/officers/check-seniority` | M2 | HIGH-03 / SEC-04 | DONE |
| 9 | Secure Uploads & Path Sanitization | Enforce `MAX_FILE_SIZE`, sanitize `militaryId` regex, remove SVG stored XSS | M2 | CRIT-03 / SEC-05 | DONE |
| 10 | Remove Dev-Admin Backdoor | Delete mock admin fallback in `next/app/actions/officers.ts` | M2 | HIGH-04 / SEC-06 | DONE |
| 11 | Rate-Limiting & Audit TargetIds | Add rate limits on uploads/admin routes; fix `targetId` and Arabic descriptions | M2 | MED-06, MED-07 | DONE |
| 12 | Read-Only View Leakage Remediation | Fix `OfficerLeaveHistoryModal` to pass `readOnly` or hide submit button | M3 | CRIT-04 / R2-01 | DONE |
| 13 | Inspection Dialog Mislabeling Fix | Standardize 7 inspection dialogs to use "إغلاق" instead of "إلغاء" | M3 | MED-01 / R2-02 | DONE |
| 14 | Remove Redundant Save Buttons | Standardize `NewMedicineButton` to single "حفظ" button | M3 | MED-02 / R2-03 | DONE |
| 15 | Modal Confirmations for Medicine | Replace native `window.confirm()` in medicine actions with ModalShell dialog | M3 | MED-03 / R2-04 | DONE |
| 16 | Sticky Modal Footers Alignment | Route misplaced button toolbars into `ModalShell` `footer` prop (7 dialogs) | M3 | MED-04 / R2-05 | DONE |
| 17 | Position Restructuring Mongoose Fix | Update `PositionAssignment.restructure` to clear `primaryOfficerId` & `substituteOfficerIds` | M4 | CRIT-02 / R3-01 | DONE |
| 18 | Daily Rollcall Timezone Fix | Standardize UTC date boundaries in rollcall generation and queries | M4 | HIGH-05 / R3-03 | DONE |
| 19 | Leave Date Interval & Math Fix | Fix `calculateDiffDays` negative intervals and add Zod `endDate >= startDate` | M4 | HIGH-06 / R3-04 | DONE |
| 20 | Null Populate Safeguards | Add optional chaining in `fax/[id]/page.tsx` and `education/[id]/page.tsx` | M4 | HIGH-08 / R3-06 | DONE |
| 21 | Officer Creation Field Preservation | Retain all 6 fields in `api/officers/route.ts` during officer creation | M4 | MED-09 / R3-07 | DONE |
| 22 | Audit Query Schema Enums | Add `arkan_harb` and `app_ideas` to `auditQuerySchema` module enum | M4 | MED-10 / R3-08 | DONE |
| 23 | Comprehensive Verification & TS Gate | `npx tsc --noEmit` clean compilation (0 errors), Reviewers, Challengers, Auditor | M5 | Verification Gate | DONE |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Core Utilities & Smart Modal Dirty State | Items 1, 2, 3, 4, 5 (`middleware.ts`, `useFormDirty`, `ModalActions`, `ModalShell`, `handleApiError`) | none | DONE |
| 2 | Security & RBAC Remediation | Items 6, 7, 8, 9, 10, 11 (Commander auth, role hierarchy, NoSQL injection, secure uploads, dev backdoor, audit targetIds) | M1 | DONE |
| 3 | UI/UX Consistency & Modal Usability | Items 12, 13, 14, 15, 16 (History modal leakage, "إغلاق" labels, single save button, modal confirm, sticky footers) | M1 | DONE |
| 4 | Edge Cases & Data Integrity | Items 17, 18, 19, 20, 21, 22 (Position restructure, rollcall timezone, leave date math/Zod, null safety, officer fields, audit enums) | M1 | DONE |
| 5 | Verification & TypeScript Gate | Item 23 (`npx tsc --noEmit` 0 errors, Reviewers, Challengers, Forensic Auditor) | M1, M2, M3, M4 | DONE |

Gate Result: **PASS**
