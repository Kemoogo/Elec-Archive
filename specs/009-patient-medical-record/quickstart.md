# Quickstart: Patient Medical Record — الملف الطبي للمريض

## Prerequisites

- Docker Compose running with MongoDB container
- `npm run dev` running on the Next.js app
- Existing medical module data (patients, visits, medicines)

## New Files Created

| File | Purpose |
|------|---------|
| `lib/db/models/PatientMedicalRecord.ts` | Mongoose model for patient-level medical details |
| `lib/validations/medical-record.ts` | Zod schemas for API validation |
| `app/api/medical/patients/search/route.ts` | Patient search API |
| `app/api/medical/patients/[patientId]/record/route.ts` | GET/PUT patient medical record API |
| `app/(dashboard)/medical/patients/page.tsx` | Patient search page |
| `components/medical/PatientRecordModal.tsx` | Main modal with tabs |
| `components/medical/PatientSearchModal.tsx` | Search modal for visits page |
| `components/medical/VisitsTab.tsx` | Visit history tab content |
| `components/medical/MedicationsTab.tsx` | Medication history tab content |
| `components/medical/MedicalDetailsTab.tsx` | Medical details tab content |

## How to Test

### 1. Open Medical Record from Visits List

1. Navigate to `/medical` (visits tab)
2. Click on any patient name in the visit table
3. A modal opens with three tabs: الزيارات, الأدوية, التفاصيل الطبية
4. Verify all visits appear in the الزيارات tab (newest first)
5. Verify all dispensed medicines appear in the الأدوية tab
6. Verify medical details fields appear in the التفاصيل الطبية tab

### 2. Edit Medical Details

1. Open the medical record modal for a patient
2. Switch to the التفاصيل الطبية tab
3. Add an allergy (e.g., "حساسية من البنسلين")
4. Add a chronic condition (e.g., "سكري النوع الثاني")
5. Select a blood type
6. Add medical notes
7. Click "حفظ"
8. Close and reopen the modal — verify all data persists

### 3. Test Concurrent Edit Conflict

1. Open the same patient's medical record in two browser tabs
2. Edit and save in the first tab
3. Edit and save in the second tab — should see Arabic conflict message
4. Verify the modal shows the latest data from the first save

### 4. Test Patient Search

1. Navigate to `/medical/patients`
2. Enter a patient ID or name in the search field
3. Verify matching results appear
4. Click a result — medical record modal opens
5. Search for a non-existent ID — verify Arabic "no results" message

### 5. Test RBAC

1. Log in as a user with `permissions.medical = "view"`
2. Open medical record modal — fields should be read-only
3. Log in as a user with `permissions.medical = "none"`
4. Attempt to access `/medical/patients` — should redirect to `/unavailable`

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/medical/patients/search?q=...` | medical: view/edit | Search patients |
| GET | `/api/medical/patients/[patientId]/record` | medical: view/edit | Get medical record |
| PUT | `/api/medical/patients/[patientId]/record` | medical: edit | Save medical details |

## Database

- New collection: `patientmedicalrecords`
- One document per patient, indexed by `patientId`
- No migration needed — records created on first save
