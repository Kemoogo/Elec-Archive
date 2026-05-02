# Feature Specification: التعليم (Education & Courses)

**Feature Branch**: `[008-education]`  
**Created**: 2026-03-28  
**Status**: Completed  
**Input**: User description: "read @master-plan.md and create a specification for PHASE 7 — التعليم"

## Overview

The Education module manages training courses and programs within the Elec Archive system. It provides a catalog of courses with their status, participant enrollment (officers or students), schedule tracking, and document attachment. This is one of five operational departments alongside Fax, Officers Affairs, Medical Point, and Student Affairs.

### Out of Scope

- Course content management (curriculum, syllabus, materials creation)
- Grading, exams, or certification issuance
- Online/distance learning platform features
- Course scheduling automation or calendar integration
- Student academic transcripts or GPA tracking
- Payment or fee management for courses

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse & Filter Courses (Priority: P1)

An employee opens the Education section and sees a card-based catalog of all training courses. Each card shows the course name, date range, status badge (قادمة/جارية/منتهية), and participant count. They can filter by status to focus on upcoming or ongoing courses.

**Why this priority**: Browsing and filtering is the foundational interaction — without it, no other course operations are possible. This is the first screen users land on.

**Independent Test**: Can be fully tested by navigating to the Education section, verifying cards render with course name, dates, status badge, and participant count. Filter by status — list updates. Delivers a functional course catalog.

**Acceptance Scenarios**:

1. **Given** the user has education permission, **When** they navigate to the Education section, **Then** a card grid of all courses is displayed showing: title, date range, status badge, and participant count
2. **Given** the courses are displayed, **When** the user filters by status "قادمة" (upcoming), **Then** only upcoming courses are shown
3. **Given** the courses are displayed, **When** no courses match the filter, **Then** a "لا توجد دورات" (No courses) message is shown

---

### User Story 2 - View Course Details (Priority: P2)

An employee clicks on a course card to open the full course detail page. The page displays course information (title, description, dates, status), a list of enrolled participants with their type (officer/student), and attached documents available for download.

**Why this priority**: The detail view is essential for understanding course enrollment and accessing documents. It is the second most important interaction.

**Independent Test**: Can be tested by clicking any course card, verifying the detail page loads with correct data, participant list is visible, and documents are downloadable.

**Acceptance Scenarios**:

1. **Given** the courses list is displayed, **When** the user clicks on a course card, **Then** the course detail page opens showing: title, description, date range, status, participant list, and documents
2. **Given** the course has participants, **When** the detail page loads, **Then** each participant shows their name and type (ضابط/طالب)
3. **Given** the course has documents, **When** the user clicks a document, **Then** the document is downloaded or opened

---

### User Story 3 - Create New Course (Priority: P3)

An employee with edit permission can create a new training course by filling in the title, description, start date, end date, and selecting the participant type (officers or students).

**Why this priority**: Creating courses is essential for maintaining the education catalog, but browsing must work first.

**Independent Test**: Can be tested by clicking the add button, filling in the form, submitting, and verifying the new course appears in the catalog.

**Acceptance Scenarios**:

1. **Given** the user has edit permission on education, **When** they click the "إضافة دورة" (Add Course) button, **Then** a form appears with fields: Title, Description, Start Date, End Date, Participant Type (ضباط/طلبة)
2. **Given** the form is open, **When** the user submits with all required fields filled, **Then** the course is created and appears in the catalog with status "قادمة" (upcoming)
3. **Given** the form is open, **When** the user submits with end date before start date, **Then** a validation error indicates the date range is invalid
4. **Given** the user has view-only permission on education, **When** they view the courses list, **Then** the add button is hidden

---

### User Story 4 - Manage Course Participants (Priority: P4)

An employee with edit permission can add or remove participants (officers or students) from a course. Adding is done by selecting from the existing officer/student directory. The participant count updates immediately.

**Why this priority**: Participant management is the core operational feature of courses — it determines who is enrolled in each training program.

**Independent Test**: Can be tested by opening a course detail, adding a participant, verifying they appear in the list, then removing them and verifying removal.

**Acceptance Scenarios**:

1. **Given** the course detail is open and the user has edit permission, **When** they click "إضافة مشارك" (Add Participant), **Then** a searchable list of officers or students (based on course participant type) is shown for selection
2. **Given** the participant selection is open, **When** the user selects a participant and confirms, **Then** the participant is added to the course and appears in the list
3. **Given** a participant is listed in the course, **When** the user clicks remove on that participant and confirms, **Then** the participant is removed from the course
4. **Given** a participant is already enrolled, **When** the user tries to add the same participant again, **Then** the system prevents duplicate enrollment with an error message

---

### User Story 5 - Upload Course Documents (Priority: P5)

An employee with edit permission can upload documents (PDF or images) to a course, such as training materials, attendance sheets, or certificates.

**Why this priority**: Document management supports course administration but is secondary to the core course and participant features.

**Independent Test**: Can be tested by opening a course detail, uploading a document, and verifying it appears in the documents list and is downloadable.

**Acceptance Scenarios**:

1. **Given** the course detail is open and the user has edit permission, **When** they click "رفع مستند" (Upload Document), **Then** a form appears with fields: Document Name, File Upload (accepts PDF/image)
2. **Given** the upload form is open, **When** the user selects a valid file and submits, **Then** the document is saved and appears in the course documents list
3. **Given** the upload form is open, **When** the user attempts to upload a file exceeding 10MB, **Then** an error message indicates the file is too large

---

### User Story 6 - Edit & Update Course (Priority: P6)

An employee with edit permission can modify course information (title, description, dates) and update the course status (e.g., mark as completed when the training ends).

**Why this priority**: Editing and status updates are important for keeping the catalog current but are secondary operations.

**Independent Test**: Can be tested by opening a course, clicking edit, changing fields, saving, and verifying the updates persist.

**Acceptance Scenarios**:

1. **Given** the user has edit permission and a course detail is open, **When** they click "تعديل" (Edit), **Then** the fields become editable (title, description, dates, status)
2. **Given** the edit form is open, **When** the user changes the status to "منتهية" (completed) and saves, **Then** the course status updates and the badge reflects the change
3. **Given** the user has view-only permission, **When** they open a course detail, **Then** the edit button is not visible

---

### Edge Cases

- Duplicate participant enrollment: System rejects the addition and displays an error indicating the participant is already enrolled
- Invalid date range (end before start): System rejects the course creation/update with a validation error
- Filesystem full during document upload: System displays an error indicating insufficient storage
- Course with no participants: Course card shows "0 مشاركين" (0 participants) without errors
- Deleting a course with participants and documents: Course deletion is blocked while participants are enrolled; all participants must be removed first, then the course can be deleted
- Concurrent edits to the same course: Last-write-wins based on timestamp; no merge conflict UI needed for this system size

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a grid of all courses as cards showing: title, date range, status badge (قادمة/جارية/منتهية), and participant count
- **FR-002**: System MUST allow users to filter courses by status (upcoming, ongoing, completed, all)
- **FR-003**: System MUST allow users to view a course's full detail including title, description, dates, status, participant list, and documents
- **FR-004**: System MUST allow employees with edit permission to create new courses with fields: Title (required), Description (optional), Start Date (required), End Date (required, must be >= start date), Participant Type (required: officers or students)
- **FR-005**: System MUST allow employees with edit permission to edit existing course information (title, description, dates, status)
- **FR-006**: System MUST allow employees with edit permission to add participants to a course by selecting from the existing officer or student directory (based on course participant type)
- **FR-007**: System MUST allow employees with edit permission to remove participants from a course after confirmation
- **FR-008**: System MUST prevent duplicate participant enrollment in the same course
- **FR-009**: System MUST allow employees with edit permission to upload documents (PDF, images) to a course with a document name, max 10MB per file
- **FR-010**: System MUST allow users to download or view uploaded documents from a course
- **FR-011**: System MUST enforce RBAC: users without `education` permission cannot access the Education section; users with `view` permission can only read; users with `edit` permission can perform all CRUD and enrollment operations
- **FR-012**: System MUST log all create, update, delete, enrollment, and document operations to the Audit Log
- **FR-013**: System MUST validate date ranges (end date must be on or after start date)
- **FR-014**: System MUST validate uploaded file types (PDF, JPEG, PNG only) and reject files exceeding 10MB
- **FR-015**: System MUST display the Education section with RTL Arabic layout consistent with the overall application design
- **FR-016**: System MUST allow manual status transitions between upcoming, ongoing, and completed; no automatic status changes based on dates
- **FR-017**: System MUST handle concurrent edits using last-write-wins with timestamp comparison; the most recent update is persisted
- **FR-018**: System MUST not impose a limit on the number of participants per course

### Key Entities *(include if feature involves data)*

- **Course**: Represents a training course or program. Key attributes: Title, Description, Start Date, End Date, Status (upcoming/ongoing/completed), Participant Type (officer/student), Participants (list of enrolled officers or students), Documents (list of uploaded files). Relationship: references Officers or Students via polymorphic participant list.
- **Document**: Represents a file attached to a course. Key attributes: Document Name, File URL (local path). Belongs to a Course.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can browse the full course catalog and locate any course in under 10 seconds
- **SC-002**: Employee can create a new course in under 1 minute including all required fields
- **SC-003**: Employee can add a participant to a course in under 30 seconds
- **SC-004**: 100% of course CRUD, enrollment, and document operations are recorded in the Audit Log
- **SC-005**: Users with incorrect permissions see access denied and cannot perform unauthorized actions on 100% of attempts
- **SC-006**: Course catalog loads within 2 seconds for up to 500 courses
- **SC-007**: All UI screens render correctly in RTL Arabic layout with no LTR alignment issues
- **SC-008**: Zero duplicate participant enrollments are accepted by the system

## Assumptions

- The User model and RBAC middleware are already implemented from Phase 1 (Auth & User Management)
- The Audit Log system is already implemented from Phase 2 (Dashboard & Notifications)
- The Course Mongoose model already exists (title, description, startDate, endDate, status, participantModel, participants, documents)
- The Officer and Student models exist and can be referenced for participant enrollment
- File uploads are stored locally under `public/uploads/courses/` consistent with the existing upload pattern
- The DESIGN.md is already established from Phase 0 and will be applied to all education-related screens
- The dashboard layout (sidebar + navbar) is already implemented from Phase 2
- JWT authentication and session management are fully functional from Phase 1
- The system runs completely offline with no external API dependencies
- The sidebar already includes an "التعليم" (Education) link in the module navigation

## Clarifications

### Session 2026-03-28

- Q: What happens when deleting a course with enrolled participants and documents? → A: Course deletion is not permitted for courses with enrolled participants; participants must be removed first, then the course can be deleted
- Q: When should course status transition between upcoming/ongoing/completed? → A: Manual only — user explicitly changes status via edit form; no automatic transitions based on dates
- Q: How should the system handle concurrent edits to the same course? → A: Last-write-wins with timestamp comparison; the most recent update is persisted
- Q: Is there a maximum limit on participants per course? → A: No limit on participants per course
