# Original User Request

## 2026-09-10T13:08:53Z

Comprehensive full-system security, RBAC, UI/UX, and edge-case audit across Admin, Commander, and Employee roles, producing an actionable vulnerability & improvement report, followed by structured remediation including modal dirty-state checking.

Working directory: /home/karim/projects/Elec-Archive
Integrity mode: development

## Requirements

### R1. Multi-Role RBAC & Cyber Threat Security Audit
Audit server layouts, middleware, API route handlers, and client permissions across all three key roles (Admin, Commander, Employee) to ensure strict zero-trust authorization, robust rate-limiting, and comprehensive mutation audit logging without permission escalation or unauthorized data leakage.

### R2. UI/UX Consistency & Redundant Controls Audit
Audit every modal, page, and workflow to detect UI/UX anti-patterns, specifically identifying read-only/display views that improperly expose edit or "حفظ" buttons, misaligned actions, and any divergence from the Sapphire Archive design standards.

### R3. Edge Cases & Defensive Error Handling
Audit all form inputs, validation schemas (Zod), date calculations, null/undefined safety, file uploads, and MongoDB operations for potential edge-case crashes, duplicate form submissions, and unhandled promise rejections.

### R4. Smart Modal Action State (Form Dirty Checking)
Design and implement a unified change-detection mechanism across modal forms so that primary action buttons ("حفظ" / "تأكيد") remain disabled by default and only become enabled when the user makes actual changes to the form values.

### R5. Comprehensive Audit Report & Phased Remediation
Generate a detailed audit report document categorizing findings by severity (Critical, High, Medium, Low, UX Polish) with exact file links and reproduction details, followed by step-by-step remediation review.

## Acceptance Criteria

### Security & RBAC Verification
- [ ] Complete permission matrix verified across Admin, Commander, and Employee roles with zero authorization bypasses.
- [ ] Every mutation endpoint enforces server-side Zod validation and records audit log events.

### UI/UX & Modal Usability
- [ ] Read-only and view-only modals strictly display "إغلاق" without saving or mutation triggers.
- [ ] Modal primary submit buttons are disabled upon opening and become active only when form values differ from initial values (dirty-state).
- [ ] All updated modals and forms strictly adhere to Sapphire Archive CSS tokens and RTL standards.

### Code Quality & Stability
- [ ] Clean TypeScript compilation (`npx tsc --noEmit` with 0 errors).
- [ ] Detailed audit report artifact produced and documented for user review before each remediation phase.

## 2026-09-10T17:09:17Z

# Teamwork Project Prompt

> Goal: Multi-specialist audit and end-to-end testing of the Daily Rollcall (التمام اليومي) workflow across all roles
> Requested team: Specialized audit team comprising Functional QA, Edge Cases QA, Security (RBAC) Auditor, UI/UX Specialist, Backend & Performance Engineer, alongside simulated test clients for each role (Admin, Commander, Employee).

Conduct a comprehensive multi-perspective audit and end-to-end testing of the Daily Rollcall (التمام اليومي) module in the Electronic Archive system on `http://localhost:3000`. Test the complete lifecycle: registration, draft saving, final submission, reopening, print reports, history exploration, independent custom sub-tables, and edge-case conflict handling across Admin, Commander, and Employee roles.

Working directory: /home/karim/projects/Elec-Archive
Integrity mode: development

## Specialized Auditor Roles & Scope

1. **Functional QA**:
   - Verify the complete end-to-end lifecycle of the daily rollcall:
     - Reviewing today's roster (`الموجود بالوحدة` + `الإجازات والراحات` + `الفرق والمأموريات`).
     - Adding and managing independent sub-tables (`التمام المستقل`).
     - Saving temporary drafts (`حفظ مسودة مؤقتة`) and verifying database persistence.
     - Final rollcall submission (`تسليم التمام النهائي`) and verification that records lock properly.
     - Reopening rollcall (`إعادة فتح التمام`) by Admin and subsequent modification.
     - Browsing past rollcall history (`سجل التمام السابق`) via `RollcallHistoryModal` and returning seamlessly to today's date.
     - Official print report triggering and generation (`طباعة كشف التمام الرسمي A4`).

2. **Edge Cases & Conflict QA**:
   - Verify officers returning today (`isReturningToday`): Ensure automatic `"عودة"` note annotation and inclusion in present count without duplicate counting.
   - Verify active leaves and external missions lock enforcement: Ensure locked statuses cannot be illicitly changed or desynchronized.
   - Test independent custom sub-tables:
     - Toggling `isInsideUnit = true` vs `isInsideUnit = false` and checking accurate reflection in Table 5 (`جدول بيان تمام الضباط - جدول الإحصائية`).
     - Moving officers between default tables and custom sub-tables.
     - Deleting a custom sub-table and ensuring all assigned officers immediately return to their respective default tables without data loss.
   - Test cumulative serial numbering (`م`): Table 1 -> Table 2 -> Table 3 -> Custom Tables maintain continuous ascending numbering without gaps or resets.

3. **Security (RBAC) Auditor**:
   - **Admin (`مدير النظام`)**: Full privileges (create, edit, save draft, submit, reopen, manage custom tables, view history, print).
   - **Commander (`القائد`)**: Overview and inspection access (review rollcall summaries, commander decisions, print reports, history) with mutation buttons appropriately restricted.
   - **Employee (`موظف`)**: Standard operational privileges based on module permissions; verify unauthorized actions (like reopen after submission) return strict 403 Forbidden.
   - Verify server-side authorization: Ensure no client-side role impersonation allows submitting or reopening unauthorized rollcalls.
   - Verify audit log events (`AuditLog`) are created with valid ObjectIds and Arabic descriptions for draft save, final submit, and reopen mutations.

4. **UI/UX & Design System Specialist**:
   - Ensure strict compliance with the **Sapphire Archive ("The Digital Monolith")** design tokens and RTL layout.
   - Zero tolerance for prohibited colors (no orange/amber or yellow).
   - Header actions styling: `btn-primary` for final submit, `btn-secondary` for drafts and print, proper icon action tooltips.
   - Table columns layout, Arabic typography, stacked day + date (`آخر عودة`, `المدة`), and clean border aesthetics.
   - Verify responsive behavior and clean overflow handling without unwanted horizontal scrollbars.

5. **Backend & Performance Engineer**:
   - Inspect API responses: `/api/officers/rollcall`, `/api/arkan-harb/rollcall`, `/api/arkan-harb/rollcall/reopen`.
   - Verify Zod server-side schemas enforce valid date formats and payload consistency.
   - Verify database queries use efficient indexes and lean lookups without N+1 query bottlenecks.
   - Clean console: 0 unhandled promise rejections, 0 React hydration errors, 0 compilation warnings.

---

## Acceptance Criteria

### Functional Lifecycle Verification
- [ ] Daily rollcall roster correctly renders present, on-leave, and external mission tables with cumulative serial numbering (`م`).
- [ ] Independent sub-tables (`التمام المستقل`) can be added, updated, and removed, correctly impacting the military breakdown statistics (`جدول بيان تمام الضباط`).
- [ ] "حفظ مسودة مؤقتة" successfully persists entries to MongoDB and reloads on page refresh.
- [ ] "تسليم التمام النهائي" locks the record, issues commander notifications, and reflects "تم اعتماد التمام النهائي" on the status bar.
- [ ] "سجل التمام السابق" opens historical rollcall for any selected past date, and closing or clicking "العودة لتمام اليوم" returns to current date.
- [ ] "إعادة فتح" allows Admin to unlock a submitted rollcall and return it to editable state.
- [ ] "طباعة كشف التمام الرسمي" formats cleanly for A4 printing.

### RBAC & Security Guardrails
- [ ] Employee cannot execute "إعادة فتح" or bypass RBAC API endpoints (returns 403).
- [ ] Commander has full visibility into certified rollcalls without unwarranted edit controls.
- [ ] All rollcall mutations generate structured `AuditLog` records with valid `targetId` and descriptive Arabic summaries.

### Code & Runtime Quality
- [ ] `npx tsc --noEmit` compiles with 0 errors.
- [ ] Browser console exhibits 0 unhandled exceptions or layout shifts.
- [ ] Comprehensive test execution report delivered in Arabic detailing findings, test cases covered, and verification results across all specialist lenses.

