# Quickstart: التعليم (Education & Courses)

## Setup Steps

### 1. Create Zod Validation Schemas
Create `next/lib/validations/education.ts` with schemas for:
- CreateCourse (title, description, startDate, endDate, participantModel)
- UpdateCourse (title?, description?, startDate?, endDate?, status?)
- CourseListQuery (status, search, page, limit)
- AddParticipant (participantId)
- RemoveParticipant (participantId)
- UploadDocument (name)

### 2. Create API Routes
Create under `next/app/api/education/`:
- `route.ts` — GET (list/filter) + POST (create)
- `[id]/route.ts` — GET (detail) + PATCH (edit) + DELETE (delete)
- `[id]/participants/route.ts` — POST (add) + DELETE (remove)
- `[id]/documents/route.ts` — POST (upload) + DELETE (remove)

### 3. Create Dashboard Layout
Create `next/app/(dashboard)/education/layout.tsx` with RBAC permission check.

### 4. Generate UI via Stitch MCP
Generate 2 screens:
- Course catalog page with card grid and status filter
- Course detail page with participant list and document section

### 5. Create Dashboard Pages
Create under `next/app/(dashboard)/education/`:
- `page.tsx` — Course catalog
- `[id]/page.tsx` — Course detail

### 6. Create Module Components
Create under `next/components/education/`:
- `CourseGrid.tsx` — Card grid layout
- `CourseCard.tsx` — Individual course card
- `CourseDetail.tsx` — Detail view with tabs
- `CourseForm.tsx` — Create/edit form
- `ParticipantPicker.tsx` — Searchable participant selector
- `CourseDocumentUpload.tsx` — File upload component

### 7. Create Upload Directory
Ensure `public/uploads/courses/` exists.

## Verification Checklist

- [x] `npm run build` passes with zero errors
- [x] `npm run lint` passes with zero warnings
- [ ] Course catalog loads and displays correctly in Arabic RTL
- [ ] Status filter works (upcoming/ongoing/completed/all)
- [ ] New course can be created via the add form
- [ ] Course information can be edited including status
- [ ] Participants can be added (with duplicate prevention)
- [ ] Participants can be removed
- [ ] Document can be uploaded (PDF, JPEG, PNG, max 10MB)
- [ ] Document can be downloaded from course detail
- [ ] Course deletion is blocked when participants are enrolled
- [ ] Unauthorized users are denied access to education pages
- [ ] All CRUD and enrollment operations are logged to AuditLog
