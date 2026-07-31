# API Contracts: Patient Medical Record

## Contract 1: GET /api/medical/patients/[patientId]/record

**Purpose**: Fetch patient medical record with aggregated visit and medication data.

**Auth**: Requires `permissions.medical` in `view|edit`

**Rate Limit**: 60 req/min (read bucket)

### Request

**Path Parameters**:
- `patientId`: string — Military/serial ID of the patient

**Query Parameters**: None

### Response (200 OK)

```typescript
{
  success: true;
  data: {
    record: {
      patientId: string;
      patientName: string;
      allergies: string[];
      chronicConditions: string[];
      bloodType?: string;
      medicalNotes: string;
      severityNotes: string;
      version: number;
    } | null;  // null if no record exists yet
    visits: {
      _id: string;
      visitDate: string;  // ISO date
      diagnosis: string;
      treatment: string;
      dispensedMedicines: {
        medicineName: string;    // Full name: "name concentration unit"
        quantity: number;
      }[];
    }[];
    medications: {
      medicineId: string;
      medicineName: string;      // Full name: "name concentration unit"
      totalQuantity: number;
      lastDispenseDate: string;  // ISO date
    }[];
  };
}
```

### Response (404 Not Found)

```typescript
{
  success: false;
  error: "لم يتم العثور على المريض";
}
```

### Response (403 Forbidden)

```typescript
{
  success: false;
  error: "ليس لديك صلاحية للوصول إلى هذا القسم";
}
```

---

## Contract 2: PUT /api/medical/patients/[patientId]/record

**Purpose**: Create or update patient medical details.

**Auth**: Requires `permissions.medical` = `edit`

**Rate Limit**: 20 req/min (write bucket)

### Request

**Path Parameters**:
- `patientId`: string — Military/serial ID of the patient

**Body** (JSON):
```typescript
{
  patientName: string;           // Required, trimmed
  allergies: string[];           // Optional, default []
  chronicConditions: string[];   // Optional, default []
  bloodType?: string;            // Optional, enum: A+, A-, B+, B-, AB+, AB-, O+, O-
  medicalNotes: string;          // Optional, default ""
  severityNotes: string;         // Optional, default ""
  version: number;               // Required, for optimistic concurrency
}
```

### Response (200 OK — Created)

```typescript
{
  success: true;
  data: {
    record: {
      patientId: string;
      patientName: string;
      allergies: string[];
      chronicConditions: string[];
      bloodType?: string;
      medicalNotes: string;
      severityNotes: string;
      version: number;
    };
    action: "created";
  };
}
```

### Response (200 OK — Updated)

```typescript
{
  success: true;
  data: {
    record: {
      patientId: string;
      patientName: string;
      allergies: string[];
      chronicConditions: string[];
      bloodType?: string;
      medicalNotes: string;
      severityNotes: string;
      version: number;
    };
    action: "updated";
  };
}
```

### Response (409 Conflict — Optimistic Concurrency)

```typescript
{
  success: false;
  error: "تم تعديل هذه البيانات بواسطة مستخدم آخر، يرجى المراجعة والمحاولة مرة أخرى";
  latestData: {
    patientId: string;
    patientName: string;
    allergies: string[];
    chronicConditions: string[];
    bloodType?: string;
    medicalNotes: string;
    severityNotes: string;
    version: number;
  };
}
```

### Response (400 Bad Request — Validation Error)

```typescript
{
  success: false;
  error: "بيانات غير صالحة";
  details: ZodError[];
}
```

---

## Contract 3: GET /api/medical/patients/search

**Purpose**: Search patients by ID or name.

**Auth**: Requires `permissions.medical` in `view|edit`

**Rate Limit**: 60 req/min (read bucket)

### Request

**Query Parameters**:
- `q`: string — Search term (patient ID or name)
- `limit`: number (optional, default 20, max 50)

### Response (200 OK)

```typescript
{
  success: true;
  data: {
    patients: {
      patientId: string;
      patientName: string;
    }[];
  };
}
```

### Response (429 Too Many Requests)

```typescript
{
  success: false;
  error: "تم تجاوز الحد المسموح، يرجى المحاولة لاحقاً";
}
```
**Headers**: `Retry-After: <seconds>`
