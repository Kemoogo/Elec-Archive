# Data Model: Patient Medical Record — الملف الطبي للمريض

## New Entity: PatientMedicalRecord

**Purpose**: Stores patient-level medical details that persist across visits and are shared by all medical staff.

**Collection**: `patientmedicalrecords` (Mongoose default pluralization)

| Field | Type | Required | Default | Validation | Description |
|-------|------|----------|---------|------------|-------------|
| `patientId` | string | Yes | — | Trimmed, indexed (unique) | Military/serial ID linking to MedicalPatient |
| `patientName` | string | Yes | — | Trimmed | Denormalized patient name for display |
| `allergies` | string[] | No | `[]` | Each item trimmed, max 200 chars | List of allergy descriptions |
| `chronicConditions` | string[] | No | `[]` | Each item trimmed, max 200 chars | List of chronic condition descriptions |
| `bloodType` | string | No | — | Enum: A+, A-, B+, B-, AB+, AB-, O+, O- | Patient blood type |
| `medicalNotes` | string | No | `""` | Trimmed, max 2000 chars | Important medical notes |
| `severityNotes` | string | No | `""` | Trimmed, max 2000 chars | Free-text severity context for allergies/conditions |
| `version` | number | Yes | `0` | Non-negative integer | Optimistic concurrency control |
| `createdAt` | Date | Auto | `Date.now` | — | Record creation timestamp |
| `updatedAt` | Date | Auto | `Date.now` | — | Last update timestamp |

**Indexes**:
- `{ patientId: 1 }` — unique, for fast lookup by patient ID
- `{ patientName: 1 }` — text index, for name search

**State Transitions**: N/A (CRUD only, no state machine)

**Validation Rules** (Zod schema):
```typescript
const bloodTypeEnum = z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']);

const patientMedicalRecordSchema = z.object({
  patientId: z.string().trim().min(1),
  patientName: z.string().trim().min(1),
  allergies: z.array(z.string().trim().max(200)).default([]),
  chronicConditions: z.array(z.string().trim().max(200)).default([]),
  bloodType: bloodTypeEnum.optional(),
  medicalNotes: z.string().trim().max(2000).default(''),
  severityNotes: z.string().trim().max(2000).default(''),
  version: z.number().int().nonnegative().default(0),
});
```

## Existing Entities (Reused, Not Modified)

### MedicalPatient

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | string (unique) | Military/serial ID |
| `patientName` | string | Patient name (text indexed) |
| `bloodType` | string (optional) | Legacy field — not used by new feature |
| `chronicDiseases` | string (optional) | Legacy field — not used by new feature |
| `allergies` | string (optional) | Legacy field — not used by new feature |

### MedicalVisit

| Field | Type | Description |
|-------|------|-------------|
| `patientId` | ObjectId (ref: MedicalPatient) | Patient reference |
| `visitDate` | Date | Visit timestamp |
| `diagnosis` | string | Visit diagnosis |
| `treatment` | string | Treatment given |
| `dispensedMedicines` | `{ medicineId, quantity }[]` | Dispensed medications |

### Medicine

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Medicine name |
| `unit` | string | Unit of measurement |
| `concentration` | string | Dosage/formulation |
| `batches` | `{ quantity, expiryDate, receivedAt }[]` | Inventory batches |
| `totalQuantity` | number | Sum of all batch quantities |

## Relationships

```
MedicalPatient (1) ──┬── (N) MedicalVisit ── (N) Medicine (via dispensedMedicines)
                     │
                     └── (1) PatientMedicalRecord (via patientId string)
```

- One `MedicalPatient` can have many `MedicalVisit` records
- One `MedicalPatient` has exactly one `PatientMedicalRecord` (created on first edit, or implicitly on query)
- `PatientMedicalRecord` links to `MedicalPatient` via `patientId` string (not ObjectId) for consistency with visit data

## Data Flow for Modal

1. **Open modal** → GET `/api/medical/patients/[patientId]/record`
   - Returns `PatientMedicalRecord` (or empty defaults if not found)
   - Also returns aggregated visit + medication data

2. **Save medical details** → PUT `/api/medical/patients/[patientId]/record`
   - Validates with Zod
   - Checks `version` for optimistic concurrency
   - Updates record, increments `version`
   - Logs to AuditLog

3. **Search patients** → GET `/api/medical/patients/search?q=...`
   - Searches `MedicalPatient` by `patientId` (regex) and `patientName` (text search)
   - Returns list of `{ patientId, patientName }`
