# Quickstart: قسم الفاكس — Fax Management Module

**Date**: 2026-03-26  
**Feature**: 004-fax-module

## Prerequisites

- Phase 0: Project setup, database models, Docker, design system ✅
- Phase 1: Auth (JWT), RBAC middleware, User management ✅
- Phase 2: Dashboard, Notifications (SSE), Audit Log ✅
- MongoDB running locally via Docker
- Node.js and npm installed

## Getting Started

```bash
# Start MongoDB
docker-compose up -d mongo

# Start dev server
cd next && npm run dev
```

## Key Files to Create/Modify

### Model Update (Modify)

| File | Action | Description |
|------|--------|-------------|
| `next/lib/db/models/Fax.ts` | **MODIFY** | Update status enum, compound index, add forwarding/closure fields |

### API Routes (Create)

| File | Method | Description |
|------|--------|-------------|
| `next/app/api/fax/route.ts` | GET, POST | List faxes (paginated), Create new fax |
| `next/app/api/fax/[id]/route.ts` | GET | Get fax details |
| `next/app/api/fax/[id]/decision/route.ts` | PATCH | Commander decision (forward/close) |
| `next/app/api/fax/[id]/close/route.ts` | PATCH | Close forwarded fax |
| `next/app/api/fax/[id]/link/route.ts` | POST, DELETE | Link/unlink faxes (threading) |
| `next/app/api/fax/search/route.ts` | GET | Search faxes for linking autocomplete |

### Validation (Create)

| File | Description |
|------|-------------|
| `next/lib/validations/fax.ts` | Zod schemas for all fax API inputs |

### Pages (Create via Stitch MCP → Convert)

| File | Description |
|------|-------------|
| `next/app/(dashboard)/fax/page.tsx` | Fax list page (SSR) |
| `next/app/(dashboard)/fax/[id]/page.tsx` | Fax detail page (SSR) |
| `next/app/(dashboard)/fax/new/page.tsx` | New fax upload page |

### Components (Create)

| File | Description |
|------|-------------|
| `next/components/fax/FaxTable.tsx` | Server component: fax table with status badges |
| `next/components/fax/FaxFilters.tsx` | Client component: search/filter bar |
| `next/components/fax/FaxUploadForm.tsx` | Client component: upload form with drag-drop |
| `next/components/fax/FaxViewer.tsx` | Client component: PDF/image viewer |
| `next/components/fax/CommanderDecision.tsx` | Client component: decision form |
| `next/components/fax/FaxThread.tsx` | Server component: linked faxes timeline |
| `next/components/fax/FaxLinkSearch.tsx` | Client component: search & link UI |
| `next/components/fax/FaxClosureForm.tsx` | Client component: closure form for forwarded faxes |

## Development Order

```
1. Update Fax Model (schema changes)
2. Create Zod validation schemas
3. Create API routes (POST → GET list → GET detail → PATCH decision → PATCH close → link/unlink)
4. Design pages in Stitch MCP
5. Convert Stitch designs to Next.js components
6. Connect components to API routes
7. Wire notifications (commander alerts on upload, forwarding alerts)
8. Add Audit Log calls to all operations
9. Test full workflow end-to-end
```

## Testing Checklist

- [ ] Upload fax with valid PDF → status: pending, notification sent
- [ ] Upload fax with invalid file type → error message
- [ ] Upload fax with duplicate faxNumber+date → error message
- [ ] List faxes with search → filtered results
- [ ] List faxes with status filter → correct filter
- [ ] View fax detail → PDF/image viewer works
- [ ] Commander makes decision (forward to user) → status: forwarded
- [ ] Commander makes decision (forward to dept) → status: forwarded
- [ ] Commander closes directly → status: closed
- [ ] Forwarded-to user closes → status: closed
- [ ] Department member closes → status: closed
- [ ] Unauthorized user tries to close → 403
- [ ] Link two faxes → both show in thread
- [ ] Unlink faxes → removed from both
- [ ] All operations logged in Audit Log
- [ ] Viewer role cannot upload or edit
- [ ] Closed fax cannot be modified
