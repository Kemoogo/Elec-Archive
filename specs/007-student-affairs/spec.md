# Feature Specification: شئون الطلبة (Student Affairs)

**Feature Branch**: `[007-student-affairs]`  
**Created**: 2026-03-28  
**Status**: Draft  
**Input**: User description: "read @master-plan.md and create a specification for PHASE 6 — شئون الطلبة"

## Overview

The Student Affairs module manages student records, personal files, and document uploads within the Elec Archive system. It provides a searchable directory of all enrolled students with the ability to view detailed profiles, manage documents, and add notes. This is one of five operational departments alongside Fax, Officers Affairs, Medical Point, and Education.

### Out of Scope

- Student enrollment applications and admission workflow
- Attendance tracking and reporting
- Grade/marks management and academic transcripts
- Parent/guardian communication
- Tuition and fee management

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse & Search Students (Priority: P1)

An employee opens the Student Affairs section and sees a list of all students. They can search by name or student ID and filter by enrollment date to quickly locate a specific student.

**Why this priority**: Browsing and searching is the foundational interaction — without it, no other student operations are possible. This is the first screen users land on.

**Independent Test**: Can be fully tested by navigating to the Students section, verifying the list renders, entering a search term, and confirming the filtered results are correct. Delivers a functional student directory.

**Acceptance Scenarios**:

1. **Given** the user has students permission, **When** they navigate to the Students section, **Then** a table of all students is displayed with columns: Student ID, Full Name, Enrollment Date
2. **Given** the student list is displayed, **When** the user types a search term in the search bar, **Then** the list filters to show only students matching the name or ID
3. **Given** the student list is displayed, **When** no students match the search term, **Then** a "لا توجد نتائج" (No results) message is shown

---

### User Story 2 - View Student Profile (Priority: P2)

An employee clicks on a student row in the list to open their full profile. The profile displays personal information, enrollment date, notes, and a list of uploaded documents. From here, the employee can view or download any document.

**Why this priority**: The profile view is the second most important interaction — it gives access to the student's complete record and uploaded files.

**Independent Test**: Can be tested by clicking any student in the list, verifying the profile page loads with correct data, and confirming documents are downloadable.

**Acceptance Scenarios**:

1. **Given** the student list is displayed, **When** the user clicks on a student row, **Then** the student profile page opens showing: full name, student ID, enrollment date, notes, and documents list
2. **Given** the student profile has documents, **When** the user clicks a document, **Then** the document is downloaded or opened
3. **Given** the student profile is open, **When** the user clicks the back button, **Then** they return to the student list with their previous search/filter preserved

---

### User Story 3 - Add New Student (Priority: P3)

An employee with edit permission can add a new student to the system by filling in the student ID, full name, enrollment date, and optional notes.

**Why this priority**: Adding students is essential for maintaining the directory, but browsing must work first. This is a CRUD operation dependent on the list view.

**Independent Test**: Can be tested by clicking the add button, filling in the form, submitting, and verifying the new student appears in the list.

**Acceptance Scenarios**:

1. **Given** the user has edit permission on students, **When** they click the "إضافة طالب" (Add Student) button, **Then** a form/modal appears with fields: Student ID, Full Name, Enrollment Date, Notes
2. **Given** the add student form is open, **When** the user submits with all required fields filled, **Then** the student is created and appears in the list
3. **Given** the add student form is open, **When** the user submits with missing required fields, **Then** validation errors are shown on the relevant fields
4. **Given** the user has view-only permission on students, **When** they view the student list, **Then** the add button is hidden or disabled

---

### User Story 4 - Upload Documents to Student Profile (Priority: P4)

An employee can upload documents (PDF or images) to a student's profile by providing a document name and selecting a file. The uploaded documents appear in the student's profile immediately.

**Why this priority**: Document management is a key feature of the student file but depends on the profile view being functional first.

**Independent Test**: Can be tested by opening a student profile, uploading a file, and verifying it appears in the document list and is downloadable.

**Acceptance Scenarios**:

1. **Given** the student profile is open, **When** the user clicks "رفع مستند" (Upload Document), **Then** a form appears with fields: Document Name, File Upload (accepts PDF/image)
2. **Given** the upload form is open, **When** the user selects a valid file and submits, **Then** the document is saved and appears in the student's documents list with upload date
3. **Given** the upload form is open, **When** the user attempts to upload a file exceeding the maximum allowed size, **Then** an error message indicates the file is too large
4. **Given** the upload form is open, **When** the user attempts to upload an unsupported file type, **Then** an error message indicates the file type is not allowed

---

### User Story 5 - Edit Student Information (Priority: P5)

An employee with edit permission can modify an existing student's information, including name, enrollment date, and notes.

**Why this priority**: Editing is important for data accuracy but is secondary to viewing and adding students.

**Independent Test**: Can be tested by opening a student profile, clicking edit, changing a field, saving, and verifying the update persists.

**Acceptance Scenarios**:

1. **Given** the user has edit permission and a student profile is open, **When** they click "تعديل" (Edit), **Then** the fields become editable (full name, enrollment date, notes)
2. **Given** the edit form is open, **When** the user changes a value and saves, **Then** the updated information is displayed in the profile
3. **Given** the user has view-only permission, **When** they open a student profile, **Then** the edit button is not visible

---

### User Story 6 - Deactivate a Student (Priority: P6)

An employee with edit permission can deactivate a student record after confirmation. Deactivation is a soft-delete: the student record is marked as "inactive" and hidden from the default list view but remains in the database. Associated documents are removed from the filesystem.

**Why this priority**: Deactivation is a low-frequency administrative action. It is the least critical core operation but important for data integrity.

**Independent Test**: Can be tested by deactivating a student from the profile, confirming the action, and verifying the student no longer appears in the active list but remains accessible via a "show inactive" filter.

**Acceptance Scenarios**:

1. **Given** the user has edit permission and a student profile is open, **When** they click "إيقاف" (Deactivate) and confirm, **Then** the student status changes to inactive, associated documents are removed from the filesystem, and the user is redirected to the student list
2. **Given** the deactivation confirmation dialog is shown, **When** the user cancels, **Then** no action is taken and the profile remains unchanged
3. **Given** the student list is displayed, **When** the user toggles "عرض الموقفين" (Show Inactive), **Then** inactive students are included in the list with an "inactive" status badge

---

### Edge Cases

- Duplicate Student ID: System rejects the operation and displays an error message indicating the ID is already in use
- Deactivating a student with documents: Associated documents are deleted from the filesystem when the student is deactivated
- Filesystem full during upload: System displays an error message indicating insufficient storage and rejects the upload
- Concurrent edits to the same student: Last-write-wins based on timestamp; no merge conflict UI needed for this system size
- Unauthorized URL access: System redirects unauthenticated users to login and shows access denied for users without students permission

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a paginated list of all students with columns: Student ID, Full Name, Enrollment Date
- **FR-002**: System MUST allow users to search students by name or Student ID with real-time filtering
- **FR-003**: System MUST allow users to view a student's full profile including personal info, notes, and documents
- **FR-004**: System MUST allow employees with edit permission to add new students with fields: Student ID (required, unique), Full Name (required), Enrollment Date (required), Notes (optional)
- **FR-005**: System MUST allow employees with edit permission to edit existing student information (name, enrollment date, notes)
- **FR-006**: System MUST allow employees with edit permission to deactivate a student record after explicit confirmation (soft-delete: status set to inactive, documents removed from filesystem, record preserved in database)
- **FR-007**: System MUST allow employees with edit permission to upload documents (PDF, images) to a student profile with a document name
- **FR-008**: System MUST allow users to download or view uploaded documents from a student profile
- **FR-009**: System MUST enforce RBAC: users without `students` permission cannot access the Students section; users with `view` permission can only read, users with `edit` permission can perform all CRUD operations
- **FR-010**: System MUST log all create, update, and delete operations on student records to the Audit Log
- **FR-011**: System MUST validate Student ID uniqueness and show a clear error if a duplicate is attempted
- **FR-012**: System MUST validate uploaded file types (PDF, JPEG, PNG only) and reject files exceeding 10MB
- **FR-013**: System MUST preserve search/filter state when navigating back from a student profile to the list
- **FR-014**: System MUST display the student list with RTL Arabic layout consistent with the overall application design
- **FR-015**: System MUST handle concurrent edits using last-write-wins with timestamp comparison; the most recent update is persisted
- **FR-016**: System MUST only display students with active status by default; inactive students are accessible via a dedicated filter toggle

### Key Entities *(include if feature involves data)*

- **Student**: Represents an enrolled student. Key attributes: Student ID (unique identifier), Full Name, Enrollment Date, Documents (list of uploaded files), Notes, Status (active/graduated/inactive/withdrawn). Relationship: may participate in Courses (via Course.participants).
- **Document**: Represents a file attached to a student profile. Key attributes: Document Name, File URL (local path), Upload Date. Belongs to a Student.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can search and locate any student in under 10 seconds using name or ID search
- **SC-002**: Employee can add a new student record in under 1 minute including all required fields
- **SC-003**: Document upload completes within 5 seconds for files up to 10MB
- **SC-004**: 100% of student CRUD operations are recorded in the Audit Log with user, action, and timestamp
- **SC-005**: Users with incorrect permissions see access denied messages and cannot perform unauthorized actions on 100% of attempts
- **SC-006**: Student list loads within 2 seconds for directories up to 5,000 students
- **SC-007**: All UI screens render correctly in RTL Arabic layout with no LTR alignment issues

## Assumptions

- The User model and RBAC middleware are already implemented from Phase 1 (Auth & User Management)
- The Audit Log system is already implemented from Phase 2 (Dashboard & Notifications)
- File uploads are stored locally under `public/uploads/students/` consistent with the existing upload pattern
- The Student Mongoose model exists as defined in master-plan.md (studentId, fullName, enrollDate, documents, notes)
- The DESIGN.md is already established from Phase 0 and will be applied to all student-related screens
- The dashboard layout (sidebar + navbar) is already implemented from Phase 2
- JWT authentication and session management are fully functional from Phase 1
- The system runs completely offline with no external API dependencies

## Clarifications

### Session 2026-03-28

- Q: What is the maximum allowed file size for document uploads per file? → A: 10MB per file
- Q: Should students have a status field to track their lifecycle, or is simple CRUD sufficient? → A: Soft-delete with status field (active/graduated/inactive/withdrawn) — delete marks as inactive instead of removing
- Q: How should the system handle concurrent edits to the same student profile? → A: Last-write-wins with timestamp comparison; the most recent update is persisted
- Q: What happens to uploaded documents when a student record is deactivated? → A: Associated documents are deleted from the filesystem when the student is deactivated
- Q: What should be explicitly excluded from this module's scope? → A: Enrollment applications, attendance tracking, and grade/marks management are out of scope
