# Quickstart: Dashboard & Notifications

**Date**: 2026-03-26
**Feature**: Dashboard & Notifications (Phase 2)

## Prerequisites

- Phase 0 (Setup & Design System) completed
- Phase 1 (Auth & User Management) completed — JWT auth, user roles, RBAC middleware working
- MongoDB running locally via Docker
- `Notification` and `AuditLog` Mongoose models created

## Implementation Order

### Step 1: Audit Log Foundation (supporting all modules)

1. Create `lib/audit/logAuditEntry.ts` utility function
   - Takes: userId, userName, action, module, targetId, description, ipAddress
   - Creates AuditLog document in MongoDB
   - Called at the end of every API route's successful operation

2. Create `GET /api/audit` route handler
   - Parses query filters (user, action, module, date range)
   - Returns paginated results with Zod-validated query params
   - RBAC: Admin and Commander only

3. Create `app/(dashboard)/audit-log/page.tsx`
   - Server Component that fetches audit data
   - Filter bar with dropdowns and date pickers
   - Paginated table display

### Step 2: Dashboard Summary

1. Create `GET /api/dashboard` route handler
   - Aggregates counts from Fax, DailyRollcall, Medicine, Course, Student models
   - Returns structured summary data
   - Role-based: Employee sees only their department

2. Create `app/(dashboard)/page.tsx` (Commander Dashboard)
   - Server Component that fetches dashboard data
   - Renders 5 summary cards in a grid
   - Click-through navigation to filtered module pages
   - Empty state Arabic messages per card

3. Generate Dashboard UI via Stitch MCP
   - Use DESIGN.md context for consistent styling
   - Arabic RTL layout with summary cards

### Step 3: Notifications System

1. Create `Notification` model operations
   - `createNotification(userId, type, title, body, refId, refModel)` utility
   - Called by fax, rollcall, medicine API routes on triggering events

2. Create SSE infrastructure
   - `lib/notifications/emitter.ts` — in-memory event emitter
   - `GET /api/notifications/stream` — SSE Route Handler
   - Heartbeat every 30 seconds
   - Auto-cleanup on client disconnect

3. Create `GET /api/notifications` route handler
   - Paginated notification list with unread count

4. Create `PATCH /api/notifications` route handler
   - Mark individual or all notifications as read

5. Create notification UI components
   - `NotificationBell.tsx` — `'use client'` component with SSE connection
   - `NotificationPanel.tsx` — slide-in panel with notification list
   - Unread count badge on bell icon
   - Reconnection indicator on SSE disconnect

### Step 4: Integration

1. Add audit logging calls to all existing API routes
   - Fax, Officers, Medical, Students, Education, Users routes

2. Add notification triggers to specific API routes
   - `POST /api/fax` → notify Commander (new_fax)
   - `POST /api/officers/rollcall` → notify Commander (rollcall_submitted)
   - `PATCH /api/medical/medicine` → notify Commander if below threshold (medicine_expiry)

3. Add NotificationBell to dashboard layout navbar

## Testing Checklist

- [ ] Login as Commander → dashboard shows all 5 cards with counts
- [ ] Login as Employee → dashboard shows only assigned department card
- [ ] Upload a fax → Commander receives SSE notification within 3 seconds
- [ ] Click notification → navigates to fax detail, notification marked as read
- [ ] Click "mark all as read" → all notifications marked read, badge resets
- [ ] View Audit Log → shows entries from previous operations
- [ ] Filter Audit Log by module → only matching entries shown
- [ ] Kill SSE connection → reconnection indicator appears, reconnects automatically
- [ ] Dashboard card click → navigates to filtered module page
- [ ] Empty dashboard state → Arabic empty messages displayed
