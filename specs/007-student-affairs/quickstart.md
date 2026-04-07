# Quickstart: شئون الطلبة (Student Affairs)

## Setup Steps

### 1. Update Student Model
Add `status` field to existing `next/lib/db/models/Student.ts`:
- Add enum field: `active`, `graduated`, `inactive`, `withdrawn`
- Default value: `active`
- Add index on `status` for filtering

### 2. Create Zod Validation Schemas
Create `next/lib/validations/student.ts` with schemas for:
- CreateStudent (studentId, fullName, enrollDate, notes)
- UpdateStudent (fullName?, enrollDate?, notes?)
- UploadDocument (name, file validation)
- DeleteDocument (fileUrl)

### 3. Create API Routes
Create under `next/app/api/students/`:
- `route.ts` — GET (list/search), POST (create)
- `[id]/route.ts` — GET (profile), PATCH (edit), DELETE (deactivate)
- `[id]/documents/route.ts` — POST (upload), DELETE (remove)

### 4. Generate UI via Stitch MCP
Generate 2 screens:
- Student List page with search bar and add button
- Student Profile page with document upload section

### 5. Create Dashboard Pages
Create under `next/app/(dashboard)/students/`:
- `page.tsx` — Student list (from Stitch output)
- `[id]/page.tsx` — Student profile (from Stitch output)
- `layout.tsx` — Students section layout with RBAC

### 6. Create Module Components
Create under `next/components/students/`:
- `StudentList.tsx` — Table with search, filter, pagination
- `StudentProfile.tsx` — Profile view with documents
- `StudentForm.tsx` — Add/Edit form modal
- `DocumentUpload.tsx` — File upload component

### 7. Create Upload Directory
Ensure `public/uploads/students/` exists (create if missing).

## Verification Checklist

- [x] `npm run build` passes with zero errors
- [x] `npm run lint` passes with zero warnings
- [ ] Student list loads and displays correctly in Arabic RTL
- [ ] Search by name and student ID filters results correctly
- [ ] New student can be created via the add form
- [ ] Existing student information can be edited
- [ ] Document can be uploaded (PDF, JPEG, PNG, max 10MB)
- [ ] Document can be downloaded from profile
- [ ] Student deactivation sets status to inactive and removes documents
- [ ] Inactive students are hidden by default; toggle shows them
- [ ] Unauthorized users are denied access to student pages
- [ ] All CRUD operations are logged to AuditLog
- [ ] Status filter works (active/graduated/inactive/withdrawn/all)
