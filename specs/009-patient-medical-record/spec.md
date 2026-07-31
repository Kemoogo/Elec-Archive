# Feature Specification: Patient Medical Record — الملف الطبي للمريض

**Feature Branch**: `009-patient-medical-record`

**Created**: 2026-05-16

**Status**: Draft

**Input**: User description: "عاوزين نعمل ملف مرضي للمريض يفتح مودال فيه تاريخ الزيارات و الادوية و اي تفاصيل مرضية ممكنة و اي حاجة ممكن اكون نسيتها"

## Clarifications

### Session 2026-05-16

- Q: How should allergies and chronic conditions be stored — as simple text strings or as structured objects with additional metadata? → A: Simple strings with a separate free-text "severity notes" field at the record level
- Q: What specific conflict resolution mechanism should be used for concurrent edits? → A: Optimistic concurrency with version field — reject stale writes with a conflict message and show the updated data
- Q: Should medicines with the same name but different dosages/formulations be grouped together or listed separately? → A: Listed separately by full name including dosage/formulation
- Q: How should rate limit violations be handled? → A: HTTP 429 with Arabic error message and Retry-After header
- Q: Should the modal display sections as scrollable content or tabbed navigation? → A: Tabbed navigation (3 tabs: الزيارات, الأدوية, التفاصيل الطبية) within the modal

## User Scenarios & Testing

### User Story 1 - عرض الملف الطبي الكامل للمريض (Priority: P1)

Medical staff member opens the medical visits list, clicks on a patient's name to open a modal showing the complete medical record for that patient. The modal uses tabbed navigation with three tabs: الزيارات (visit history chronologically), الأدوية (all previously dispensed medications across visits), and التفاصيل الطبية (patient-level medical details: allergies, chronic conditions, blood type, important notes).

**Why this priority**: This is the primary use case — consolidating scattered visit records and medication history into one comprehensive view so staff can make informed medical decisions quickly without switching between screens.

**Independent Test**: Create 3 visits for patient "1234-56" with different diagnoses and dispensed medicines. Open the patient's medical record modal. Confirm all 3 visits appear in chronological order, all dispensed medicines are listed with quantities, and medical details fields (allergies, chronic conditions) are displayed.

**Acceptance Scenarios**:

1. **Given** patient "1234-56" has 3 past visits with varying diagnoses, **When** staff clicks the patient name on the visits list, **Then** a modal opens showing all 3 visits sorted by date (newest first).
2. **Given** patient "1234-56" was dispensed "باراسيتامول" in visit 1 and "أموكسيسيلين" in visit 2, **When** the medical record modal opens, **Then** the medications section lists both medicines with their quantities and visit dates.
3. **Given** patient "1234-56" has no visits yet, **When** staff opens the medical record modal, **Then** the modal shows empty states for visits and medications sections with Arabic messages "لا توجد زيارات سابقة" and "لا توجد أدوية سابقة".
4. **Given** the modal is open, **When** staff clicks the close button or clicks outside the modal, **Then** the modal closes and returns to the visits list.

---

### User Story 2 - إدارة التفاصيل الطبية للمريض (Priority: P1)

Medical staff member opens the patient medical record modal and can add, edit, or update patient-level medical details including allergies (حساسية), chronic conditions (أمراض مزمنة), blood type (فصيلة الدم), and important medical notes (ملاحظات طبية). These details persist across visits and are visible to all medical staff.

**Why this priority**: Patient-level medical data (allergies, chronic conditions) is critical for safe treatment decisions. Staff must know about penicillin allergies or diabetes before prescribing or dispensing.

**Independent Test**: Open the medical record modal for patient "1234-56". Add an allergy "حساسية من البنسلين". Save and close the modal. Reopen the modal — confirm the allergy is still displayed. Edit the allergy to "حساسية من الأموكسيسيلين" — confirm the update persists.

**Acceptance Scenarios**:

1. **Given** the medical record modal is open for patient "1234-56", **When** staff enters allergy "حساسية من البنسلين" and saves, **Then** the allergy is saved and visible immediately in the modal.
2. **Given** patient "1234-56" has chronic condition "سكري النوع الثاني", **When** staff opens the modal, **Then** the chronic condition is displayed in the medical details section.
3. **Given** staff updates blood type for patient "1234-56" from "A+" to "O+", **When** they save, **Then** the blood type is updated and audit-logged.
4. **Given** staff clears all medical detail fields, **When** they save with empty values, **Then** the fields are cleared and saved as empty/null without error.

---

### User Story 3 - البحث والتنقل بين المرضى (Priority: P2)

Staff can search for a patient by patient ID or name from within the medical module and open their medical record directly, without having to find them through the visits list first.

**Why this priority**: In emergency situations or follow-up care, staff need to access a patient's full medical record quickly without navigating through visit logs.

**Independent Test**: Open the medical records page, search for "1234-56" (patient ID), click on the result — confirm the medical record modal opens showing the correct patient's data.

**Acceptance Scenarios**:

1. **Given** multiple patients exist in the system, **When** staff searches for patient ID "1234-56", **Then** only the matching patient's medical record summary is shown.
2. **Given** staff searches for patient name "أحمد", **When** multiple patients match, **Then** a list of matching patients is shown with IDs and names.
3. **Given** a search returns no results, **When** staff searches "9999-99" (non-existent ID), **Then** the system displays "لا يوجد مريض بهذا الرقم" with no errors.

---

### Edge Cases

- **Patient with no visits**: Opening the medical record for a patient who has been entered as a reference but has no visits — all sections display empty states with appropriate Arabic messages.
- **Patient with no medical details**: Opening a record where allergies, chronic conditions, etc. have never been filled in — fields show empty/placeholder state, not errors.
- **Very long visit history (50+ visits)**: The الزيارات tab scrolls internally without breaking the modal layout (tab content area height capped with internal scroll).
- **Concurrent edit conflict**: Two staff members open the same patient's medical record modal simultaneously and both try to edit medical details — the second save is rejected with an Arabic conflict message ("تم تعديل هذه البيانات بواسطة مستخدم آخر، يرجى المراجعة والمحاولة مرة أخرى") and the modal displays the latest data for review.
- **Patient ID not found in system**: Searching for a non-existent patient ID returns a clear Arabic error message.
- **Network interruption during save**: If the save request fails, the system shows a clear Arabic error and keeps the modal open with unsaved data so the user can retry.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a modal view of the complete patient medical record, accessible from the medical visits list by clicking on a patient's name or ID. The modal MUST use tabbed navigation with three tabs: الزيارات (visits), الأدوية (medications), and التفاصيل الطبية (medical details).
- **FR-002**: The الزيارات tab MUST display the patient's visit history in reverse chronological order (newest first), showing visit date, diagnosis, treatment, and dispensed medicines for each visit.
- **FR-003**: The الأدوية tab MUST include a medications history section aggregating all medicines dispensed across all of the patient's visits, showing medicine name (including dosage/formulation), total quantity dispensed, and last dispense date. Medicines with the same base name but different dosages/formulations (e.g., "باراسيتامول 500mg" vs "باراسيتامول 1000mg") MUST be listed as separate entries.
- **FR-004**: The التفاصيل الطبية tab MUST include a medical details section showing patient-level data: allergies (حساسية), chronic conditions (أمراض مزمنة), blood type (فصيلة الدم), important medical notes (ملاحظات طبية), and a free-text severity notes field (ملاحظات الشدة) at the record level for contextual allergy/condition severity information.
- **FR-005**: Staff with medical edit permissions MUST be able to add, edit, and save all fields in the medical details section.
- **FR-006**: Staff with medical view-only permissions MUST be able to view the medical record modal but not edit any fields.
- **FR-007**: System MUST provide a search interface to find patients by patient ID (رقم الفرد) or patient name (اسم المريض) and open their medical record directly.
- **FR-008**: System MUST show appropriate Arabic empty-state messages when a patient has no visits, no medications history, or no medical details entered.
- **FR-009**: System MUST persist patient-level medical details (allergies, chronic conditions, blood type, notes) across sessions and make them visible to all medical staff.
- **FR-010**: System MUST audit-log all CREATE and UPDATE operations on patient medical details with module = "medical".
- **FR-011**: System MUST validate all medical detail inputs with Zod schemas before saving (string fields trimmed, blood type restricted to valid types A+, A-, B+, B-, AB+, AB-, O+, O-).
- **FR-012**: System MUST handle concurrent edit conflicts using optimistic concurrency: the PatientMedicalRecord model includes a version field (integer or timestamp); on save, the server rejects writes where the submitted version does not match the current version, returning an Arabic conflict error message and the latest data so the user can retry.
- **FR-013**: System MUST enforce RBAC: modal viewing requires `permissions.medical` in `view|edit`; editing medical details requires `edit`.
- **FR-014**: System MUST enforce per-route rate limiting (60 req/min for reads, 20 req/min for writes). Rate limit violations MUST return HTTP 429 with Arabic error message "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً" and a Retry-After header indicating seconds until the next allowed request.
- **FR-015**: All error messages MUST be in Arabic.

### Key Entities

- **PatientMedicalRecord (الملف الطبي)**: Represents the consolidated medical record for a single patient. Contains patientId (رقم الفرد), patientName (اسم المريض), allergies (list of allergy strings), chronicConditions (list of chronic disease strings), bloodType (فصيلة الدم), medicalNotes (ملاحظات طبية), severityNotes (ملاحظات الشدة — free-text field for contextual allergy/condition severity at the record level), and version (integer for optimistic concurrency control). One record per patient. Linked to existing Patient visit records via patientId.

- **PatientVisit (زيارة طبية)**: Existing entity — represents a single medical visit. Contains patientId, patientName, visitDate, diagnosis, treatment, dispensedMedicines. Multiple visits can exist per patient.

- **Medicine (دواء)**: Existing entity — referenced by PatientVisit.dispensedMedicines for medication history aggregation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Staff can open a patient's complete medical record modal in under 2 seconds from clicking the patient name.
- **SC-002**: Staff can view visit history, medications, and medical details without leaving the modal — zero page navigations required.
- **SC-003**: Staff can add or update medical details (allergies, chronic conditions) in under 30 seconds.
- **SC-004**: 100% of save operations on medical details are audit-logged with module = "medical".
- **SC-005**: Patient medical record modal displays correctly with 0 up to 100+ past visits without breaking layout.
- **SC-006**: Search for patients by ID or name returns results in under 1 second for up to 500 patients.
- **SC-007**: Staff with view-only permission cannot edit any medical detail field (zero bypass incidents).

## Assumptions

- The existing Patient (visit) model and Medicine model from the النقطة الطبية module are reused without modification.
- A new PatientMedicalRecord model is created for patient-level data (allergies, chronic conditions, blood type, notes), indexed by patientId.
- The modal pattern (ModalShell) and design tokens from the established design system are used, with tabbed navigation inside the modal body.
- Authentication and RBAC from the existing system (`permissions.medical`) are reused.
- The existing audit logging infrastructure is reused for audit events.
- Patient identity is based on patientId (رقم الفرد) as used in the existing medical visits.
- The medical record modal is initially accessible from the visits list page; a dedicated search page is a lower-priority add-on.
- Modal maximum height is capped at 85vh; each tab's content area scrolls independently for long content.
- Blood type validation follows standard medical blood type notation (A+, A-, B+, B-, AB+, AB-, O+, O-).
