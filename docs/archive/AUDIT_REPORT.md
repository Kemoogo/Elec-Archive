# Comprehensive Full-System Audit Report — Elec-Archive
**Date**: 2026-09-10  
**Scope**: Full-system audit across Admin, Commander, and Employee roles (Security, RBAC, UI/UX, Edge Cases, Smart Modal Dirty State)  
**Target Codebase**: `/home/karim/projects/Elec-Archive/next`  
**Governing Standard**: `AGENTS.md` & `ORIGINAL_REQUEST.md`

---

## 1. Executive Summary & Audit Matrix

The Elec-Archive platform was audited across 69 API routes, 48 pages, and 156 components. The system shows strong foundations in offline-first intranet design, JWT HttpOnly authentication, Arabic RTL layout, and zero `any` strict TypeScript usage. However, the audit uncovered 28 actionable findings categorized across 4 severity tiers:
- **Critical Severity**: 4 findings (Middleware inaction, position restructure data loss, unbounded file uploads/path traversal, read-only modal view leakage).
- **High Severity**: 8 findings (Vertical privilege escalation, role hierarchy lockouts, NoSQL injection, development admin backdoor, timezone day shifts, negative date masking, uncaught CastErrors, null reference crashes).
- **Medium Severity**: 10 findings (Read-only button mislabeling, duplicate save buttons, native confirm dialogues, misplaced modal footers, overlay discrepancies, missing rate limits, audit log gaps, SSE token query exposure, silent field dropping, missing audit schema enums).
- **Low & UX Polish**: 6 findings (Obsolete department checks, sole admin demotion, stock deduction concurrency, orphaned uploads, non-brand color tokens, ad-hoc duplicate types).
- **Requirement R4 Architecture**: Master design for `useFormDirty<T>` and `ModalActions` smart dirty-state tracking.

---

## 2. Comprehensive Findings & Reproduction Details

### Tier 1: Critical Severity (P0 — Immediate Remediation)

#### CRIT-01 (SEC-01): Middleware File Misnamed as `proxy-lib.ts` — Server Layout Guards Bypassed
- **Affected File**: `next/proxy-lib.ts` vs `next/middleware.ts`
- **Location**: `next/proxy-lib.ts:1-26` and `next/app/(dashboard)/layout.tsx:32-34`
- **Description**: Next.js App Router exclusively executes `middleware.ts` at the root of `next/`. Because the file was named `proxy-lib.ts`, Next.js never runs it. In `next/app/(dashboard)/layout.tsx`, `headers().get("x-pathname")` returns `null`, defaulting `pathname` to `"/"`. Consequently, layout-level permission checks for `/admin`, `/officers`, `/medical`, `/students`, `/education`, and `/fax` are completely bypassed.
- **Remediation**: Rename `next/proxy-lib.ts` to `next/middleware.ts` and ensure `x-pathname` is set and forwarded on all matched requests.

#### CRIT-02 (R3-01): Position Restructuring Updates Non-Existent Field `officerId: null`
- **Affected File**: `next/app/api/arkan-harb/positions/restructure/route.ts:43`
- **Description**: The `PositionAssignment` Mongoose model uses `primaryOfficerId` and `substituteOfficerIds`. The restructure endpoint calls:
  `await PositionAssignment.updateMany({ branchId: { $in: branchIds } }, { $set: { officerId: null } });`
  Because `officerId` is not defined on `PositionAssignment`, MongoDB updates a phantom field. Positions in deleted/restructured branches remain occupied, causing ghost officer assignments and data corruption.
- **Remediation**: Update the mutation to `$set: { primaryOfficerId: null, substituteOfficerIds: [] }`.

#### CRIT-03 (R3-02 / SEC-05): Unbounded File Upload Size & Path Traversal Vulnerabilities
- **Affected Files**: `next/app/api/officers/[id]/file121/route.ts:51-68`, `next/app/api/officers/[id]/photo/route.ts:54-75`, `next/app/actions/officers.ts:241-260`
- **Description**:
  1. `await file.arrayBuffer()` loads the entire file into Node.js buffer memory before any size checking, permitting memory exhaustion (OOM DoS).
  2. For `id === "new"`, `reqMilitaryId` is taken directly from client `formData` without sanitization or regex validation, allowing directory traversal (`../../`) via `path.join()`.
  3. `image/svg+xml` is allowed in `ALLOWED_MIME_TYPES` without SVG sanitization, exposing stored XSS via inline `<script>` tags when SVG files are rendered.
- **Remediation**:
  1. Enforce strict `MAX_FILE_SIZE` (10MB for PDF 121, 5MB for photos) before reading full buffers.
  2. Sanitize `militaryId` with strict regex `/^\d{1,14}$/` and reject directory traversal sequences.
  3. Disallow `image/svg+xml` or sanitize it; restrict photos to JPEG, PNG, and WebP.

#### CRIT-04 (R2-01): View Leakage of "حفظ التغييرات" Button in Pure Read-Only Modal
- **Affected Files**: `next/components/officers/OfficerLeaveHistoryModal.tsx:274-279` and `next/components/ui/modal-actions.tsx:44-59`
- **Description**: `OfficerLeaveHistoryModal` renders a pure historical timeline of leaves. It passes `<ModalActions onCancel={onClose} cancelText="إغلاق" />`. Because `modal-actions.tsx` unconditionally renders the submit button when `children` is falsy (defaulting `submitText` to `"حفظ التغييرات"`), the read-only history modal actively renders an operable, misleading "حفظ التغييرات" button.
- **Remediation**: Update `ModalActions.tsx` to support `readOnly?: boolean` or `hideSubmit?: boolean`. When true or when `submitText` is not provided and `readOnly` is active, suppress the submit button completely.

---

### Tier 2: High Severity (P1)

#### HIGH-01 (SEC-02): Vertical Privilege Escalation in Arkan Harb Leaves Ratification
- **Affected File**: `next/app/api/arkan-harb/leaves/commander-decision/route.ts:19-25`
- **Description**: The authorization check reads:
  `if (!isCommanderOrAdmin && !canEditModule(auth.user!, "arkan_harb")) return 403;`
  An `employee` user with module edit permission on `arkan_harb` bypasses this check and can issue formal commander approvals (`تصدق` / `رفض`), which is strictly an executive prerogative.
- **Remediation**: Require `auth.user.role === "commander" || auth.user.role === "admin"`.

#### HIGH-02 (SEC-03): Broken Role Hierarchy in Module API Routes
- **Affected Files**: `next/app/api/medical/route.ts:31`, `next/app/api/education/route.ts:31`, `next/app/api/students/route.ts:31`, `next/app/api/fax/route.ts:25`
- **Description**: These route handlers check raw `user.permissions.<module> !== "edit"` without evaluating `user.role === "admin"` or `user.role === "commander"`. If an admin account has empty module permissions, they are locked out with HTTP 403.
- **Remediation**: Use centralized helper `hasModuleAccess(user, module, "edit")` where Admin has automatic override and Commander has automatic view override.

#### HIGH-03 (SEC-04): NoSQL Injection in Seniority Check
- **Affected File**: `next/app/api/officers/check-seniority/route.ts:15-23`
- **Description**: The endpoint consumes `const { seniorityNumber, excludeOfficerId } = await request.json();` without Zod validation. Passing `{ "seniorityNumber": { "$gt": "" } }` directly executes a query selector against MongoDB.
- **Remediation**: Add a strict Zod schema: `seniorityNumber` must be a non-negative integer or numeric string; `excludeOfficerId` must be a valid MongoDB ObjectId if present.

#### HIGH-04 (SEC-06): Development Admin Backdoor in Server Actions
- **Affected File**: `next/app/actions/officers.ts:373-398`
- **Description**: When `NODE_ENV === "development"`, unauthenticated requests are automatically assigned a mock `dev-admin` user with full `admin` role, allowing unauthorized administrative actions across local network connections.
- **Remediation**: Remove the hardcoded fallback; all mutations must authenticate strictly against real user sessions.

#### HIGH-05 (R3-03): Daily Rollcall Timezone Offset Shift
- **Affected Files**: `next/app/api/officers/rollcall/route.ts:51-78`, `next/lib/rollcall-engine.ts:38-42`
- **Description**: Mixing `new Date("YYYY-MM-DD")` (UTC midnight) with `.setHours(0,0,0,0)` (local midnight) causes dates in Egypt (+02:00 / +03:00) to shift back to 21:00 or 22:00 UTC of the previous day, resulting in mismatched queries and duplicate daily rollcall creation.
- **Remediation**: Standardize on UTC date boundaries or date-only string matching (`YYYY-MM-DD`).

#### HIGH-06 (R3-04): Negative Date Interval Masking in Leave Math
- **Affected Files**: `next/lib/utils/date.ts:18`, `next/lib/validation/officers.ts:85-110`
- **Description**: `calculateDiffDays` uses `Math.max(1, diffDays)`. When `endDate < startDate`, it returns 1 day instead of erroring or returning 0. Furthermore, `createLeaveSchema` and `patchLeaveSchema` lack `.refine(data => data.endDate >= data.startDate)`.
- **Remediation**: Add refinement in Zod schemas validating `endDate >= startDate`, and return 0 or throw on inverted ranges in `calculateDiffDays`.

#### HIGH-07 (R3-05): Unchecked `Types.ObjectId.isValid()` Causing HTTP 500 CastErrors
- **Affected Files**: 43 API routes across `next/app/api/**/[id]/route.ts`
- **Description**: Routes invoke `findById(params.id)`. When an invalid ObjectId string is passed (e.g. from malformed client requests or path probes), Mongoose throws `CastError`, which crashes into `handleApiError` as an unclassified HTTP 500 internal server error.
- **Remediation**:
  1. Add `CastError` handler in `next/lib/api-response.ts:handleApiError` mapping to HTTP 400 with message `"معرف غير صالح"`.
  2. Validate `mongoose.Types.ObjectId.isValid(id)` in route handlers.

#### HIGH-08 (R3-06): Unhandled Null Populate Reference Crashes
- **Affected Files**: `next/app/(dashboard)/fax/[id]/page.tsx:123`, `next/app/(dashboard)/education/[id]/page.tsx:41`
- **Description**: `fax/[id]/page.tsx` accesses `populatedUploadedBy.fullName` without optional chaining. If an uploader's user account is deleted, navigating to the fax detail page crashes the React Server Component.
- **Remediation**: Use optional chaining: `fax.uploadedBy?.fullName || "مستخدم غير معروف"`.

---

### Tier 3: Medium Severity (P2)

#### MED-01 (R2-02): Read-Only Dialogs Erroneously Labeled "إلغاء"
- **Affected Files**:
  - `next/components/medical/ViewVisitModal.tsx:231`
  - `next/components/medical/MedicineDetailModal.tsx:108`
  - `next/components/arkan-harb/MissionDetailModal.tsx:127`
  - `next/components/arkan-harb/PositionViewModal.tsx:89`
  - `next/components/arkan-harb/PositionsHistoryArchiveModal.tsx:148`
  - `next/components/arkan-harb/MissionPrintModal.tsx:32`
  - `next/app/(dashboard)/theme-playground/page.tsx:606`
- **Description**: Pure read-only inspection dialogs display "إلغاء" (Cancel) which incorrectly implies aborting an edit transaction, rather than strictly "إغلاق" (Close).
- **Remediation**: Replace `cancelText="إلغاء"` with `cancelText="إغلاق"`.

#### MED-02 (R2-03): Redundant Duplicate Save Buttons in `NewMedicineButton`
- **Affected File**: `next/components/medical/NewMedicineButton.tsx:89-113`
- **Description**: Renders two save buttons side-by-side: `<button>حفظ وخروج</button>` and `<button>حفظ</button>`.
- **Remediation**: Standardize to a single primary "حفظ" button using `ModalActions`.

#### MED-03 (R2-04): Native Browser `window.confirm()` Calls
- **Affected Files**: `next/components/medical/EditMedicineButton.tsx:99`, `next/components/medical/MedicineDetailModal.tsx:56`
- **Description**: Uses unstyled native browser `window.confirm()` for medicine and batch deletion, violating the Sapphire Archive modal dialog standard.
- **Remediation**: Replace with standard `ModalShell` or `confirmDialog` with `btn-destructive`.

#### MED-04 (R2-05): Misplaced Modal Footers Inside Scrollable Body
- **Affected Files**: `next/components/officers/LeaveAddModal.tsx:177`, `DeleteOfficerButton.tsx:55`, `OfficerPromoteModal.tsx:158`, `OfficerReturnModal.tsx:112`, `OfficerTransferModal.tsx:136`, `OfficerDocuments.tsx:239,278`, `medical/ViewVisitModal.tsx:228`
- **Description**: Placing `ModalActions` inside the scrollable modal body breaks sticky footer delineation and causes buttons to scroll offscreen.
- **Remediation**: Pass action buttons via `ModalShell`'s `footer` prop.

#### MED-05 (R2-06): Inconsistent Modal Overlay Default in `ModalShell.tsx`
- **Affected File**: `next/components/ui/modal-shell.tsx:158`
- **Description**: Defaults `overlayClassName` to `bg-slate-950/75` instead of `bg-black/40` mandated by `AGENTS.md`.
- **Remediation**: Update default parameter to `bg-black/40`.

#### MED-06 (SEC-07): Missing Rate Limiting on File Uploads & Admin Routes
- **Affected Files**: `api/officers/[id]/file121`, `api/officers/[id]/photo`, `api/departments`, `api/branches`, `api/audit`
- **Description**: Upload endpoints and administrative taxonomy routes lack `checkApiRateLimit()`.
- **Remediation**: Add `checkApiRateLimit(ip, 20, 60000)` to upload and management endpoints.

#### MED-07 (SEC-08): Mutation Audit Logging Defects
- **Affected Files**: `api/officers/rollcall/route.ts:168`, `api/arkan-harb/positions/unassign-all/route.ts:46`, `api/medical/checks/route.ts`
- **Description**: `targetId` passed as `undefined` or omitted, violating the Mongoose `ObjectId` schema; bulk daily medical checks unlogged; login/logout logged in English.
- **Remediation**: Provide valid `targetId` strings and descriptive Arabic audit logs for all mutations.

#### MED-08 (SEC-09): SSE Notifications Token Query Exposure & Missing Revocation Check
- **Affected File**: `next/app/api/notifications/stream/route.ts:33-40`
- **Description**: Token is accepted from URL query string and lacks `tokenVersion` check.
- **Remediation**: Verify cookie first; validate `user.tokenVersion === payload.tokenVersion`.

#### MED-09 (R3-07): Silent Field Dropping in Officer Creation
- **Affected File**: `next/app/api/officers/route.ts:50-75`
- **Description**: Drops `graduationDate`, `bloodType`, `religion`, `maritalStatus`, `faculty`, and `file121IssueDate` when creating a new officer document.
- **Remediation**: Include all validated fields from `createOfficerSchema` when instantiating the officer model.

#### MED-10 (R3-08): Audit Log Query Schema Missing Module Enums
- **Affected File**: `next/lib/validation/audit.ts:14`
- **Description**: `auditQuerySchema` module enum lacks `arkan_harb` and `app_ideas`, causing HTTP 400 when filtering by Staff Operations.
- **Remediation**: Add `"arkan_harb"` and `"app_ideas"` to the `module` enum.

---

### Tier 4: Low & UX Polish Severity (P3)

- **LOW-01 (SEC-10)**: Dashboard stats query checks obsolete English department strings instead of checking `user.permissions`.
- **LOW-02 (SEC-11)**: Sole admin self-demotion risk in user management route.
- **LOW-03 (R3-09)**: Inventory deduction in medicine dispensing lacks atomic `$inc` with `{ quantity: { $gte: qty } }`.
- **LOW-04 (R3-10)**: Fax upload writes file to disk before validating request body; validation errors leave orphaned files.
- **LOW-05 (R2-07)**: Out-of-palette purple badges in `MissionActionModal` and `RollcallSheet`.
- **LOW-06 (R3-13)**: 18+ ad-hoc duplicate entity types in components instead of central `@/types/`.

---

## 3. Requirement R4 Architecture: Smart Modal Action State (Form Dirty Checking)

### Problem
Across all 22 mutation modals in the codebase, the primary action button ("حفظ" / "تأكيد") is enabled immediately upon modal opening (`disabled={loading}`). Users can click "حفظ" repeatedly without changing any field, which sends redundant network requests and generates empty audit log entries.

### Architectural Solution
1. **Create `next/lib/hooks/useFormDirty.ts`**:
   A zero-dependency React hook that tracks baseline vs current form state:
   ```typescript
   export function useFormDirty<T extends Record<string, unknown>>(initialValues: T, currentValues: T): {
     isDirty: boolean;
     resetBaseline: (newBaseline?: T) => void;
     changedKeys: (keyof T)[];
   }
   ```
2. **Enhance `next/components/ui/modal-actions.tsx`**:
   - Add `isDirty?: boolean` (defaults to `true` if omitted for backwards compatibility).
   - Add `readOnly?: boolean` to suppress the submit button in view-only dialogs.
   - When `isDirty === false`, disable the submit button (`disabled={submitDisabled || submitLoading || !isDirty}`) with calm opacity styling.
3. **Rollout**: Integrate into key edit modals (`OfficerForm`, `EditDepartmentModal`, `EditUserModal`, `LeaveSystemModal`, `PositionPlacementModal`, `EditMedicineButton`).

---

## 4. Phased Remediation Strategy

The remediation is structured into 4 sequential milestones:
1. **Milestone 1**: Core Infrastructure, Smart Modal Dirty State & Critical Utilities (`middleware.ts`, `useFormDirty.ts`, `modal-actions.tsx`, `modal-shell.tsx`, `api-response.ts` CastError handling).
2. **Milestone 2**: Security & RBAC Remediation (Commander ratification permission, role hierarchy helpers, NoSQL injection fix, secure file uploads, backdoor removal, audit log targetId fixes).
3. **Milestone 3**: UI/UX Consistency & Modal Usability (Read-only view leakage fix, inspection dialog label fixes, duplicate button removal, native confirm replacement, sticky footers).
4. **Milestone 4**: Edge Cases, Data Integrity & Zod Schemas (Position restructure fix, rollcall timezone normalization, leave interval validation, null reference safeguards, officer field preservation, audit enums).

---

## 5. Verification Gate Criteria
- TypeScript compiles cleanly (`npx tsc --noEmit` with 0 errors).
- All Reviewer, Challenger, and Forensic Auditor checks pass with CLEAN verdicts.
