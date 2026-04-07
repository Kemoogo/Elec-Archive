# Quickstart: النقطة الطبية — Medical Point Module

## Prerequisites
- Docker running with MongoDB
- Next.js dev server (`cd next && npm run dev`)
- At least one user with `permissions.medical = "edit"`
- Stitch MCP server accessible (project `14721618739991060852`)

## Step 1: Model Updates

### 1.1 Fix Patient Model
Remove `unique: true` from `patientId` field in `next/lib/db/models/Patient.ts`:
```typescript
// BEFORE (line 20):
patientId: { type: String, required: true, unique: true, trim: true },
// AFTER:
patientId: { type: String, required: true, trim: true },
```

### 1.2 Extend Notification Model
Add `low_stock` to NotificationType in `next/lib/db/models/Notification.ts`:
```typescript
// BEFORE (line 3):
export type NotificationType = "new_fax" | "rollcall_submitted" | "medicine_expiry" | "officers_reminder";
// AFTER:
export type NotificationType = "new_fax" | "rollcall_submitted" | "medicine_expiry" | "low_stock" | "officers_reminder";

// ALSO update enum in schema (line 22):
enum: ["new_fax", "rollcall_submitted", "medicine_expiry", "low_stock", "officers_reminder"],
```

## Step 2: Create Validation Schemas

Create `next/lib/validations/medical.ts` with Zod schemas for:
- `createVisitSchema` — patientId, patientName, diagnosis, treatment, optional dispensedMedicines array
- `visitListQuerySchema` — page, limit, search, dateFrom, dateTo
- `createMedicineSchema` — name, unit, quantity, expiryDate, minThreshold
- `updateMedicineSchema` — all optional fields from create

## Step 3: Create API Routes

### Visits
- `next/app/api/medical/route.ts` — GET (list) + POST (create with atomic dispense)
- `next/app/api/medical/[id]/route.ts` — GET (single visit)

### Medicines
- `next/app/api/medical/medicines/route.ts` — GET (list) + POST (create)
- `next/app/api/medical/medicines/[id]/route.ts` — PUT (update) + DELETE

### Dashboard
- `next/app/api/medical/dashboard/route.ts` — GET (stats aggregation)

### Checks
- `next/app/api/medical/checks/route.ts` — POST (run expiry + low-stock checks)

## Step 4: Business Logic

Create `next/lib/medical/` with:
- `stock.ts` — Atomic stock reduction via `findOneAndUpdate` with `quantity: { $gte: N }` guard
- `queries.ts` — Dashboard aggregation pipeline, visit search/filter helpers
- `checks.ts` — Expiry and low-stock detection, notification creation

## Step 5: UI Pages (Stitch MCP)

Generate via live Stitch MCP server using prompts from `design-reference.md`:

1. **Dashboard** — `stitch_generate_screen_from_text` → apply design system → extract → convert to `next/app/(dashboard)/medical/page.tsx`
2. **Visits List** — Generate → convert to `next/app/(dashboard)/medical/visits/page.tsx`
3. **New Visit** — Generate → convert to `next/app/(dashboard)/medical/visits/new/page.tsx`
4. **Medicine Inventory** — Generate → convert to `next/app/(dashboard)/medical/medicines/page.tsx`

## Step 6: Test Scenarios

1. **Create medicine**: Add "باراسيتامول" with quantity=10, verify in inventory
2. **Dispense medicine**: Create visit dispensing 3 units, verify quantity drops to 7
3. **Insufficient stock**: Try to dispense 8 units from quantity=7, verify Arabic error
4. **Expired medicine**: Create medicine with past expiry, verify dispense blocked
5. **Dashboard**: Verify visit count, low-stock count, expired count
6. **Delete with references**: Try to delete medicine used in a visit, verify blocked
7. **Notifications**: Run checks endpoint, verify notifications created for expired/low-stock
8. **Search**: Search visits by patient name, verify filtered results
9. **Pagination**: Create 25 visits, verify pagination works

## Verification

```bash
cd next && npm run build  # Must pass with 0 errors, 0 warnings
```
