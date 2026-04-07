# Data Model: النقطة الطبية — Medical Point Module

## Entities

### 1. Patient (سجل زيارة طبية)
Represents a single medical visit. **File**: `next/lib/db/models/Patient.ts` (EXISTS — needs modification)

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| patientId | String | Yes | trimmed, non-empty | Patient number (رقم الفرد). NOT unique — same patient can have multiple visits. |
| patientName | String | Yes | trimmed, non-empty | Patient name (اسم المريض) |
| visitDate | Date | Yes | valid date | Defaults to now |
| diagnosis | String | Yes | trimmed, non-empty | Diagnosis (التشخيص) — required per edge case |
| treatment | String | Yes | trimmed, non-empty | Treatment (العلاج) — required per edge case |
| dispensedMedicines | Array | No (default []) | each item has medicineId (ObjectId ref) + quantity (min 1) | Empty array if no medicines dispensed |
| createdAt | Date | Auto | — | Mongoose timestamps |
| updatedAt | Date | Auto | — | Mongoose timestamps |

**Indexes**:
- `patientId` — NOT unique (remove existing unique constraint)
- `visitDate: -1` — for sorting recent visits

**Required Change**: Remove `unique: true` from `patientId` field (line 20). The current schema has it, but spec edge case says duplicate patient IDs on same day must be allowed.

---

### 2. Medicine (دواء/مخزون)
Represents a medicine in the pharmacy inventory. **File**: `next/lib/db/models/Medicine.ts` (EXISTS — no changes needed)

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| name | String | Yes | trimmed, non-empty | Medicine name |
| unit | String | Yes | trimmed, non-empty | Unit type (tablet, vial, bottle, etc.) |
| quantity | Number | Yes | min: 0, integer | Current stock level |
| expiryDate | Date | Yes | must be in future for new additions | Expiry date |
| minThreshold | Number | Yes | min: 0, integer | Low-stock alert threshold |
| createdAt | Date | Auto | — | Mongoose timestamps |
| updatedAt | Date | Auto | — | Mongoose timestamps |

**Indexes**:
- `expiryDate: 1` — for expiry checks
- `name: 1` — for lookups

---

### 3. Notification (إشعار) — Extension
Existing model needs `low_stock` added to NotificationType. **File**: `next/lib/db/models/Notification.ts`

**Required Change**: Add `low_stock` to:
- `NotificationType` type union (line 3)
- `enum` array in schema (line 22)

New type: `"new_fax" | "rollcall_submitted" | "medicine_expiry" | "low_stock" | "officers_reminder"`

---

### 4. AuditLog (سجل التدقيق) — No Changes
Already has `module: "medical"` in the enum. Ready for use.

---

## Relationships

```
Patient (visit)
  ├── dispensedMedicines[].medicineId → Medicine._id (ObjectId ref)
  └── Not a foreign key constraint — historical records preserved even if Medicine deleted

Notification
  ├── userId → User._id
  ├── refId → Medicine._id (for expiry/low_stock alerts)
  └── refModel = "Medicine"

AuditLog
  └── module = "medical", targetId → Patient._id or Medicine._id
```

## Validation Rules (Business Logic)

| Rule | Enforced At | Method |
|------|-------------|--------|
| Dispense quantity ≤ available stock | API route (POST /api/medical) | `findOneAndUpdate` with `quantity: { $gte: N }` |
| No dispense from expired medicine | API route (POST /api/medical) | Check `expiryDate < now` before stock update |
| Diagnosis and treatment required | Zod schema | `z.string().min(1)` |
| Delete medicine only if no visit refs | API route (DELETE /api/medical/medicines/[id]) | `Patient.countDocuments({ "dispensedMedicines.medicineId": id })` |
| Arabic error messages | API routes | Pre-defined Arabic strings |

## State Transitions

### Medicine Stock
```
[initial quantity] --dispense--> [quantity - N]  (if quantity >= N)
[quantity] --restock--> [quantity + N]
```

### Visit Lifecycle
```
[created] --> [viewed/listed] --> (no state change; visits are immutable records)
```
Visits are create-and-read (no update/delete in spec requirements). CRUD for visits is not mentioned — only creation and listing/searching.
