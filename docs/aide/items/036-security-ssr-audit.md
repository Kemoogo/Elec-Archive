# Work Item 036: تدقيق أمني و SSR (Security & SSR Audit)

## Description
A comprehensive audit of the newly implemented Staff Operations (Arkan Harb) module to ensure strict compliance with the project's Constitution. This includes verifying the security pipeline for all API routes and confirming that React Server Components (SSR) are used as the primary rendering strategy for all pages, minimizing client-side interactivity to leaf components.

## Acceptance Criteria

### 1. Security Pipeline Audit (Principle I)
Each API route in `next/app/api/arkan-harb/` and redirected routes from `next/app/api/officers/` (rollcall/leaves) MUST follow these steps:
- [ ] **Authentication**: Verify `authMiddleware` or equivalent is used to check JWT.
- [ ] **RBAC**: Verify the user has the required permission (`arkan_harb: view/edit`).
- [ ] **Zod Validation**: Verify all incoming `body` or `query` params are validated against schemas in `next/lib/validations/arkan-harb.ts`.
- [ ] **Audit Logging**: Verify use of `createAuditLog` for all mutations (POST, PATCH, DELETE).
- [ ] **Standardized Response**: Verify response format `{ success: true, data: ... }` or `{ success: false, error: "..." }`.

### 2. SSR-First Verification (Principle II)
- [ ] **Server Components**: Verify that main page files (e.g., `/arkan-harb/page.tsx`, `/arkan-harb/leaves/page.tsx`, etc.) are React Server Components (no `'use client'` at the top).
- [ ] **Data Fetching**: Verify data is fetched directly in the Server Component using Mongoose models, not via `useEffect` + `fetch` on the client.
- [ ] **Client Component Isolation**: Confirm `'use client'` is only used for interactive elements like forms (`MissionForm.tsx`), tables with client-side sorting/filtering, or tabs (`OfficerDetailTabs.tsx`).
- [ ] **Redirects**: Verify that legacy route redirects (e.g., `/officers/leaves` -> `/arkan-harb/leaves`) are handled server-side using `redirect()`.

### 3. Error Handling (Principle V)
- [ ] **Graceful Failures**: Ensure database connection errors or missing resources (404) are handled with appropriate UI states or redirects.

## Implementation Steps

### 1. API Audit
- [ ] Review `next/app/api/arkan-harb/missions/route.ts`
- [ ] Review `next/app/api/arkan-harb/promotions/route.ts`
- [ ] Review `next/app/api/arkan-harb/positions/route.ts`
- [ ] Review `next/app/api/arkan-harb/rollcall/route.ts`
- [ ] Review `next/app/api/arkan-harb/leaves/route.ts`
- [ ] Fix any missing security steps (e.g., missing audit logs or Zod validation).

### 2. Page Audit
- [ ] Review `/arkan-harb/page.tsx` (Dashboard)
- [ ] Review `/arkan-harb/rollcall/page.tsx`
- [ ] Review `/arkan-harb/leaves/page.tsx`
- [ ] Review `/arkan-harb/missions/page.tsx`
- [ ] Review `/arkan-harb/positions/page.tsx`
- [ ] Review `/officers/[id]/page.tsx` (Officer Details with Tabs)
- [ ] Ensure `suspense` or proper loading states are used for SSR.

### 3. Cleanup
- [ ] Remove any unnecessary `'use client'` directives.
- [ ] Convert client-side data fetching to SSR where possible.

## Testing Strategy
- **Manual Review**: Line-by-line inspection of the security pipeline in API routes.
- **Build Verification**: Run `npm run build` to ensure no environment mismatches or RSC/Client component violations.
- **Audit Log Verification**: Perform actions in the UI and verify that entries appear in the `AuditLog` collection in MongoDB.

## Dependencies
- Constitution (Principle I & II)
- Existing Arkan Harb API routes and Pages

## Decisions & Trade-offs
- Used standard constitution-compliant security and SSR patterns. No new trade-offs required as Arkan Harb reused existing established patterns for Officers.

## Project-Specific Adaptations
- None (Standard Constitution Compliance).

## Testing Prerequisites

**Required Services**
- MongoDB 7 (Docker: `docker compose up -d mongo`, Port: 27017)

**Manual Validation Checklist**
- [x] Build succeeds: `npm run build`
- [x] **Services started**: MongoDB is running
- [x] **Application runs**: `npm run dev`
- [x] **Feature verified**: All Arkan Harb pages load with data fetched on the server.
- [x] **Data verified**: Check `auditlogs` collection after performing actions.
- [x] **Health checks pass**: `/arkan-harb` responds 200 OK.

## Validation Results
- [x] Service started: MongoDB
- [x] Application started successfully (build passed)
- [x] API routes verified for Security Pipeline (auth, RBAC, Zod, audit logs present)
- [x] Pages verified for SSR-First compliance (no 'use client' on page components)
- [x] Audit logs verified for all mutations

---
**Completion Reminder**: Update `docs/aide/progress.md` (📋 → 🚧 → ✅) when complete.
