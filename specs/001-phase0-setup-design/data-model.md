# Data Model: Phase 0 — Setup & Design System

**Date**: 2026-03-23
**Feature**: Phase 0 — Setup & Design System

## Entities

All 11 database models are defined in this phase. Each model is implemented as a Mongoose schema in `next/lib/db/models/`.

### User

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| username | String | Yes | Unique, indexed |
| password | String | Yes | bcrypt hashed, never returned in queries |
| fullName | String | Yes | Display name |
| role | Enum | Yes | `admin`, `commander`, `employee`, `viewer` |
| department | String | No | Assigned department |
| permissions | Object | Yes | Per-module permission map |
| permissions.fax | Enum | Yes | `none`, `view`, `edit` |
| permissions.officers | Enum | Yes | `none`, `view`, `edit` |
| permissions.medical | Enum | Yes | `none`, `view`, `edit` |
| permissions.students | Enum | Yes | `none`, `view`, `edit` |
| permissions.education | Enum | Yes | `none`, `view`, `edit` |
| isActive | Boolean | Yes | Default: true |
| createdAt | Date | Auto | Mongoose timestamps |
| updatedAt | Date | Auto | Mongoose timestamps |

**Validation Rules**: username minimum 3 characters, password minimum 8 characters, role must be one of the four valid values.

**Relationships**: Referenced by AuditLog.userId, Notification.userId, DailyRollcall.submittedBy.

---

### Fax

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| faxNumber | String | Yes | Unique fax identifier |
| date | Date | Yes | Fax date |
| fromEntity | String | Yes | Sending entity |
| toEntity | String | Yes | Receiving entity |
| subject | String | Yes | Fax subject |
| fileUrl | String | Yes | Local file path |
| fileType | Enum | Yes | `pdf`, `image` |
| status | Enum | Yes | `pending`, `decision_made`, `forwarded`, `closed` |
| commanderDecision | String | No | Decision text |
| forwardedTo | String | No | Forward target |
| relatedFaxes | [ObjectId] | No | Thread references |
| uploadedBy | ObjectId | Yes | Ref: User |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**Validation Rules**: fileUrl must reference a file in `public/uploads/`, fileType must match file extension.

**State Transitions**: pending → decision_made → forwarded → closed (or pending → closed directly).

---

### Officer

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| militaryId | String | Yes | Unique military identifier |
| fullName | String | Yes | |
| rank | String | Yes | Military rank |
| position | String | Yes | Current position |
| joinDate | Date | Yes | Date of joining |
| documents | Array | No | Attached documents |
| documents[].name | String | Yes | Document name |
| documents[].fileUrl | String | Yes | Local file path |
| documents[].uploadedAt | Date | Auto | |
| isActive | Boolean | Yes | Default: true |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**Relationships**: Referenced by Leave.officerId, Assignment.officerId, DailyRollcall.entries.officerId.

---

### Leave

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| officerId | ObjectId | Yes | Ref: Officer |
| type | Enum | Yes | `annual`, `sick`, `mission`, `absence` |
| startDate | Date | Yes | |
| endDate | Date | Yes | Must be after startDate |
| reason | String | No | |
| status | Enum | Yes | `pending`, `approved`, `rejected` |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**Validation Rules**: endDate must be after or equal to startDate.

**State Transitions**: pending → approved/rejected.

---

### Assignment

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| officerId | ObjectId | Yes | Ref: Officer |
| type | Enum | Yes | `promotion`, `assignment`, `mission` |
| description | String | Yes | |
| date | Date | Yes | |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

---

### DailyRollcall

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| date | Date | Yes | Rollcall date (unique per day) |
| submittedBy | ObjectId | Yes | Ref: User |
| submittedAt | Date | Yes | |
| entries | Array | Yes | Per-officer status |
| entries[].officerId | ObjectId | Yes | Ref: Officer |
| entries[].status | Enum | Yes | `present`, `absent`, `leave`, `mission` |
| entries[].note | String | No | |
| isSubmitted | Boolean | Yes | Default: false |
| viewedByCommander | Boolean | Yes | Default: false |
| createdAt | Date | Auto | |

**Validation Rules**: Each officer must have exactly one entry per rollcall.

---

### Patient

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| patientId | String | Yes | Individual ID number |
| patientName | String | Yes | |
| visitDate | Date | Yes | |
| diagnosis | String | Yes | |
| treatment | String | Yes | |
| dispensedMedicines | Array | No | Medicines given |
| dispensedMedicines[].medicineId | ObjectId | Yes | Ref: Medicine |
| dispensedMedicines[].quantity | Number | Yes | Must be > 0 |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**Relationships**: dispensedMedicines[].medicineId references Medicine. On dispense, Medicine.quantity is decremented.

---

### Medicine

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | String | Yes | Medicine name |
| unit | String | Yes | Unit of measurement |
| quantity | Number | Yes | Current stock, must be >= 0 |
| expiryDate | Date | Yes | |
| minThreshold | Number | Yes | Low-stock alert threshold |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**Validation Rules**: quantity must never go below 0. If quantity <= minThreshold, a notification is generated.

---

### Student

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| studentId | String | Yes | Unique student identifier |
| fullName | String | Yes | |
| enrollDate | Date | Yes | |
| documents | Array | No | Same structure as Officer.documents |
| notes | String | No | |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

---

### Course

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | String | Yes | |
| description | String | No | |
| startDate | Date | Yes | |
| endDate | Date | Yes | Must be after startDate |
| status | Enum | Yes | `upcoming`, `ongoing`, `completed` |
| participants | [ObjectId] | No | Ref: Officer or Student |
| documents | Array | No | Course materials |
| documents[].name | String | Yes | |
| documents[].fileUrl | String | Yes | |
| createdAt | Date | Auto | |
| updatedAt | Date | Auto | |

**State Transitions**: upcoming → ongoing → completed.

---

### Notification

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | ObjectId | Yes | Ref: User (target) |
| type | String | Yes | `new_fax`, `rollcall_submitted`, `medicine_expiry` |
| title | String | Yes | |
| body | String | Yes | |
| isRead | Boolean | Yes | Default: false |
| refId | ObjectId | No | Reference to related entity |
| refModel | String | No | Model name for refId |
| createdAt | Date | Auto | |

---

### AuditLog

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| userId | ObjectId | Yes | Ref: User |
| userName | String | Yes | Denormalized for display |
| action | String | Yes | `CREATE`, `UPDATE`, `DELETE`, `VIEW` |
| module | String | Yes | `fax`, `officers`, `medical`, `students`, `education` |
| targetId | ObjectId | No | Affected entity ID |
| description | String | Yes | Human-readable action description |
| ipAddress | String | Yes | |
| createdAt | Date | Auto | |

**Immutability**: AuditLog entries MUST never be updated or deleted.

## Relationships Diagram

```
User ─────┬── AuditLog.userId
          ├── Notification.userId
          ├── DailyRollcall.submittedBy
          └── Fax.uploadedBy

Officer ──┬── Leave.officerId
          ├── Assignment.officerId
          └── DailyRollcall.entries[].officerId

Medicine ── Patient.dispensedMedicines[].medicineId

Course ──── Course.participants[] (→ Officer or Student, polymorphic)
```
