# API Contracts: النقطة الطبية — Medical Point Module

All endpoints follow the project convention: auth → RBAC → Zod validate → operate → audit log → respond.

## Base Path: `/api/medical`

---

### 1. Visits — List & Create

**GET `/api/medical`** — List visits with search, filter, pagination

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page (max 100) |
| search | string | — | Search by patient name or ID |
| dateFrom | string | — | ISO date filter start |
| dateTo | string | — | ISO date filter end |

**Auth**: `permissions.medical` in `view|edit`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "visits": [
      {
        "_id": "...",
        "patientId": "1234-56",
        "patientName": "أحمد علي",
        "visitDate": "2026-03-27T10:00:00.000Z",
        "diagnosis": "نزلة برد",
        "treatment": "باراسيتامول 500mg",
        "dispensedMedicines": [
          { "medicineId": "...", "medicineName": "باراسيتامول", "quantity": 2 }
        ],
        "createdAt": "2026-03-27T10:00:00.000Z"
      }
    ],
    "pagination": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
  }
}
```

**POST `/api/medical`** — Create visit with optional medicine dispense

**Auth**: `permissions.medical === "edit"`
**Body** (Zod validated):
```json
{
  "patientId": "1234-56",
  "patientName": "أحمد علي",
  "diagnosis": "نزلة برد",
  "treatment": "باراسيتامول 500mg",
  "dispensedMedicines": [
    { "medicineId": "...", "quantity": 2 }
  ]
}
```

**Response 201**: Created visit object
**Errors**:
- 400: Stock insufficient — `"الكمية المتاحة غير كافية — المتوفر: N"`
- 400: Medicine expired — `"الدواء منتهي الصلاحية ولا يمكن صرفه"`
- 400: Validation failed — Zod issues array
- 401: Not authenticated
- 403: No edit permission

---

### 2. Medicines — CRUD

**GET `/api/medical/medicines`** — List all medicines

**Auth**: `permissions.medical` in `view|edit`
**Response 200**: Array of medicine objects with computed `isLowStock` and `isExpired` flags.

**POST `/api/medical/medicines`** — Add new medicine

**Auth**: `permissions.medical === "edit"`
**Body**:
```json
{
  "name": "باراسيتامول",
  "unit": "tablet",
  "quantity": 100,
  "expiryDate": "2027-06-01",
  "minThreshold": 20
}
```
**Response 201**: Created medicine object

**PUT `/api/medical/medicines/[id]`** — Update medicine (restock, edit fields)

**Auth**: `permissions.medical === "edit"`
**Body**: Partial medicine fields (all optional, at least one required)

**DELETE `/api/medical/medicines/[id]`** — Delete medicine

**Auth**: `permissions.medical === "edit"`
**Errors**:
- 400: Medicine has visit references — `"لا يمكن حذف الدواء لوجود زيارات مرتبطة به"`

---

### 3. Dashboard

**GET `/api/medical/dashboard`** — Get summary stats

**Auth**: `permissions.medical` in `view|edit`
**Response 200**:
```json
{
  "success": true,
  "data": {
    "visitsToday": 5,
    "lowStockCount": 3,
    "expiredCount": 2,
    "totalMedicines": 15
  }
}
```

---

### 4. Checks (Expiry & Low-Stock Notifications)

**POST `/api/medical/checks`** — Run expiry and low-stock checks, create notifications

**Auth**: `permissions.medical === "edit"`
**Logic**:
1. Find all expired medicines → create `medicine_expiry` notifications for medical staff + commanders
2. Find all low-stock medicines (quantity < minThreshold) → create `low_stock` notifications for medical staff + commanders
3. Return counts of notifications created

**Response 200**:
```json
{
  "success": true,
  "data": {
    "expiryAlerts": 2,
    "lowStockAlerts": 3,
    "notificationsCreated": 5
  }
}
```
