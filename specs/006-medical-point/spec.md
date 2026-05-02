# Feature Specification: النقطة الطبية — Medical Point Module

**Feature Branch**: `006-medical-point`  
**Created**: 2026-03-27  
**Status**: Completed  
**Input**: User description: "read @master-plan.md and create a specification for PHASE 5 — النقطة الطبية"

## User Scenarios & Testing

### User Story 1 - تسجيل زيارة طبية وصرف دواء (Priority: P1) 🎯 MVP

A medical staff member opens the medical visits page, creates a new patient visit record by entering the patient's ID, name, diagnosis, and treatment. During the visit, they select one or more medicines to dispense. The system automatically reduces the medicine stock quantities and records the dispensed items against the visit. If any medicine does not have enough stock, the dispense is blocked with a clear Arabic error showing the available quantity.

**Why this priority**: This is the core daily workflow — every visit to the medical point results in a visit record with possible medicine dispensing. Without this, the module has no value.

**Independent Test**: Create a medicine with quantity=10, then create a visit dispensing 3 units. Confirm the medicine quantity drops to 7. Try dispensing 8 more (only 7 left) — confirm the system rejects it with an Arabic stock error.

**Acceptance Scenarios**:

1. **Given** medicine "باراسيتامول" exists with quantity=50, **When** staff creates a visit for patient "1234-56" dispensing 2 units of باراسيتامول, **Then** the visit is saved and باراسيتامول quantity becomes 48.
2. **Given** medicine "أموكسيسيلين" has quantity=3, **When** staff tries to dispense 5 units in a visit, **Then** the system rejects with "الكمية المتاحة غير كافية — المتوفر: 3".
3. **Given** a visit with diagnosis and treatment entered, **When** staff saves without dispensing any medicine, **Then** the visit is saved successfully with an empty dispensed list.
4. **Given** staff opens the visits page, **When** they view recent visits, **Then** each row shows patient name, visit date, diagnosis, and dispensed medicine count.

---

### User Story 2 - إدارة المخزون الدوائي (Priority: P1)

A medical staff member opens the medicine inventory page to view all medicines with current stock levels, units, and expiry dates. They can add new medicines, update existing quantities (e.g., when new stock arrives), and remove medicines. The page highlights medicines that are below their minimum threshold and medicines that are expired or expiring soon.

**Why this priority**: Accurate inventory is essential before any dispensing can happen. Staff need to know what's available, what's running low, and what's expired.

**Independent Test**: Add 5 medicines with varying quantities and expiry dates. Confirm the inventory table shows all of them. Set one medicine's quantity below its threshold — confirm it shows a low-stock warning badge. Set one expiry date in the past — confirm it shows an expired badge.

**Acceptance Scenarios**:

1. **Given** the medicine inventory page is empty, **When** staff adds "باراسيتامول" with unit="tablet", quantity=100, expiryDate="2027-06-01", minThreshold=20, **Then** the medicine appears in the inventory table.
2. **Given** medicine "فيتامين سي" has quantity=5 and minThreshold=10, **When** staff views the inventory, **Then** the medicine row shows a low-stock warning badge in Arabic.
3. **Given** medicine "أيبوبروفين" has expiryDate in the past, **When** staff views the inventory, **Then** the medicine row shows an expired warning badge.
4. **Given** medicine "باراسيتامول" has quantity=50, **When** staff updates quantity to 200 (restocking), **Then** the quantity updates to 200 and the change is audit-logged.
5. **Given** staff deletes a medicine, **When** the medicine has no active visit references, **Then** it is removed. If it has references, deletion is blocked with an Arabic message.

---

### User Story 3 - لوحة تحكم النقطة الطبية (Priority: P2)

A staff member or commander opens the medical dashboard to see a summary of today's visits, medicines below threshold count, expired medicines count, and total inventory. The dashboard provides quick navigation to the visits list and inventory.

**Why this priority**: Provides situational awareness and helps medical staff prioritize their work — knowing how many low-stock items exist or how many patients were seen today is critical for planning.

**Independent Test**: Create 3 visits today, set 2 medicines below threshold, and set 1 medicine as expired. Open the medical dashboard — confirm the summary shows: 3 visits today, 2 low-stock, 1 expired.

**Acceptance Scenarios**:

1. **Given** 5 visits were recorded today, **When** staff opens the medical dashboard, **Then** it shows "5 زيارة اليوم" in a summary card.
2. **Given** 3 medicines are below their minimum threshold, **When** staff views the dashboard, **Then** it shows "3 أدوية تحت الحد الأدنى" with a warning indicator.
3. **Given** 2 medicines have expired, **When** staff views the dashboard, **Then** it shows "2 أدوية منتهية الصلاحية" with a danger indicator.
4. **Given** staff clicks the visits card, **When** the page loads, **Then** they are navigated to the full visits list filtered to today.

---

### User Story 4 - تنبيهات الصلاحية والمخزون المنخفض (Priority: P2)

The system automatically checks medicine expiry dates and stock levels. When medicines are expired or below minimum threshold, the system creates notifications for medical staff and commanders. Expired medicines can be flagged so they are not dispensed.

**Why this priority**: Proactive alerts prevent medical staff from dispensing expired medicine and help them reorder low-stock items before running out.

**Independent Test**: Create a medicine with expiryDate=yesterday. Run the expiry check — confirm a notification is created for medical staff. Confirm that attempting to dispense the expired medicine in a visit is blocked.

**Acceptance Scenarios**:

1. **Given** medicine "أموكسيسيلين" expired yesterday, **When** the system runs the expiry check, **Then** a notification is created: "دواء أموكسيسيلين منتهي الصلاحية".
2. **Given** medicine "باراسيتامول" has quantity=3 and minThreshold=10, **When** the system runs the low-stock check, **Then** a notification is created: "باراسيتامول: الكمية أقل من الحد الأدنى (3/10)".
3. **Given** medicine "إيبوبروفين" is expired, **When** staff tries to dispense it in a visit, **Then** the system blocks the dispense with "الدواء منتهي الصلاحية ولا يمكن صرفه".
4. **Given** staff views the notification bell, **When** there are medical alerts, **Then** they appear grouped under "النقطة الطبية" with appropriate warning icons.

---

### User Story 5 - البحث والفلترة في سجل الزيارات (Priority: P3)

Staff can search visits by patient name or patient ID, filter by date range, and paginate through results. This helps locate historical visit records quickly.

**Why this priority**: As visit records accumulate over weeks and months, finding specific visits by patient or date becomes essential for follow-up care.

**Independent Test**: Create 25 visits for different patients. Search by patient name "أحمد" — confirm only matching visits appear. Filter by date range — confirm only visits within the range appear. Navigate pagination — confirm page 2 loads correctly.

**Acceptance Scenarios**:

1. **Given** visits exist for patients "أحمد علي" and "محمد سعيد", **When** staff searches "أحمد", **Then** only visits for "أحمد علي" are shown.
2. **Given** visits exist across multiple dates, **When** staff filters from "2026-03-01" to "2026-03-15", **Then** only visits within that range appear.
3. **Given** 50 visits exist, **When** staff views page 1 with limit 20, **Then** 20 visits are shown with pagination controls indicating 3 total pages.

---

### Edge Cases

- **Zero stock dispense**: Attempting to dispense from a medicine with quantity=0 must be blocked with "الكمية المتاحة غير كافية — المتوفر: 0".
- **Concurrent dispense**: Two staff members dispense the last 5 units of the same medicine simultaneously — the system must prevent negative stock via atomic operations.
- **Expired medicine on dispense date**: Medicine was valid when added but expired by the time of dispense — the system must block the dispense.
- **Delete medicine with historical visits**: Deleting a medicine that was previously dispensed in past visits must either be blocked or handled gracefully (historical records should not break).
- **Empty visit save**: A visit with no diagnosis or treatment entered must be blocked (both are required).
- **Duplicate patient ID**: Two visits for the same patient on the same day must be allowed (a patient may visit multiple times).

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow staff to create a medical visit record with patient ID, patient name, visit date, diagnosis, treatment, and optional dispensed medicines list.
- **FR-002**: System MUST automatically reduce medicine stock quantity when a visit includes dispensed medicines, using atomic operations to prevent negative stock.
- **FR-003**: System MUST block medicine dispensing if the requested quantity exceeds available stock, displaying the available quantity in Arabic.
- **FR-004**: System MUST block medicine dispensing if the medicine's expiry date is in the past.
- **FR-005**: System MUST provide a medicine inventory page showing all medicines with name, unit, current quantity, expiry date, minimum threshold, and visual warning badges for low-stock and expired items.
- **FR-006**: System MUST allow staff to add new medicines with name, unit, initial quantity, expiry date, and minimum threshold.
- **FR-007**: System MUST allow staff to update medicine quantities (restocking) and other fields.
- **FR-008**: System MUST allow deletion of medicines only when they have no visit references, or block deletion with an Arabic message listing the constraint.
- **FR-009**: System MUST provide a medical dashboard showing: visits count today, low-stock medicines count, expired medicines count, and total inventory count.
- **FR-010**: System MUST generate notifications when medicines expire or fall below minimum threshold, targeting users with `permissions.medical = edit` and commanders.
- **FR-011**: System MUST allow searching visits by patient name or patient ID.
- **FR-012**: System MUST allow filtering visits by date range.
- **FR-013**: System MUST support paginated visit listing with configurable page size.
- **FR-014**: System MUST enforce authentication and RBAC on all medical API routes (view requires `permissions.medical` in `view|edit`; create/update/delete requires `edit`).
- **FR-015**: System MUST log every medical operation (visit create, medicine add/update/delete, dispense) to the AuditLog with `module = "medical"`.
- **FR-016**: System MUST apply per-route rate limiting on all medical API endpoints (60 requests/minute for read operations, 20 requests/minute for write operations).
- **FR-017**: System MUST validate all inputs with Zod schemas before any database operation.
- **FR-018**: All error messages MUST be in Arabic and clearly describe the issue.

### Key Entities

- **Patient (سجل زيارة طبية)**: Represents a single medical visit. Contains patientId (رقم الفرد), patientName (اسم المريض), visitDate, diagnosis (التشخيص), treatment (العلاج), and a list of dispensed medicines with quantities. One patient can have multiple visit records over time.

- **Medicine (دواء/مخزون)**: Represents a medicine in the pharmacy inventory. Contains name (الاسم), unit (الوحدة — tablet, vial, bottle, etc.), quantity (الكمية الحالية), expiryDate (تاريخ الصلاحية), and minThreshold (الحد الأدنى للتنبيه). Referenced by Patient visit records through dispensedMedicines.

- **Notification (إشعار)**: Extended to include medicine_expiry and low_stock event types targeting medical staff and commanders.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Staff can create a complete medical visit record with dispensed medicines in under 3 minutes.
- **SC-002**: Medicine inventory updates (add/restock/delete) take under 30 seconds per item.
- **SC-003**: The medical dashboard loads and displays current summary data in under 2 seconds.
- **SC-004**: 100% of expired medicine dispense attempts are blocked with an Arabic error message.
- **SC-005**: 100% of insufficient-stock dispense attempts are blocked, showing available quantity.
- **SC-006**: Expiry and low-stock notifications are delivered to all relevant users within 60 seconds of the check running.
- **SC-007**: Visit search results render in under 1 second for up to 500 visit records.
- **SC-008**: Zero instances of negative medicine stock after concurrent dispense operations (atomicity guarantee).

## Assumptions

- The existing authentication system (`permissions.medical` in `none|view|edit`) is reused from the established RBAC model.
- The existing audit logging, notification, and rate-limiting infrastructure from the fax and officers modules is reused.
- Medicine stock is tracked at aggregate level (not per batch/lots); a single expiry date per medicine entry is sufficient for this phase.
- Patient visit records reference medicines by ObjectId; historical visit records remain valid even if medicine data is later updated.
- The Stitch MCP design system context (DESIGN.md) from Phase 0 is available and used for generating the medical UI screens.
- The system runs completely offline on a local Docker deployment with MongoDB.
- The Arabic RTL layout and light theme from the existing design system are applied to all medical screens.
