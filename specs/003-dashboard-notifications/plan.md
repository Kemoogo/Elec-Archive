# Implementation Plan: Dashboard & Notifications

**Branch**: `003-dashboard-notifications` | **Date**: 2026-03-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-dashboard-notifications/spec.md`

## Summary

Implement the Commander Dashboard with department summary cards, a real-time Notification system using Server-Sent Events (SSE) for the Commander role, and a filterable Audit Log page for Admin and Commander roles. The dashboard aggregates data from existing models (Fax, DailyRollcall, Medicine, Course, Student), notifications are triggered by key events (fax upload, rollcall submission, medicine expiry), and audit logging captures all CRUD operations across all modules.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)
**Primary Dependencies**: Next.js 14+ (App Router, React Server Components), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod
**Storage**: MongoDB 7 via Mongoose ODM (local Docker)
**Testing**: ESLint + Prettier (linting), `npm run build` (build validation)
**Target Platform**: Local server — Windows + Docker (production)
**Project Type**: Web application (Next.js fullstack — App Router)
**Performance Goals**: Dashboard loads within 5 seconds; notifications delivered within 3 seconds via SSE; audit log filters return results within 2 seconds for up to 10,000 entries
**Constraints**: Completely offline (no internet), Arabic RTL throughout, 10-30 concurrent users on local network, SSR-first with minimal `'use client'`
**Scale/Scope**: 10-30 users, 5 dashboard cards, 3 notification types, 6 audit log modules, ~3 new pages

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ Pass | RBAC enforced on dashboard (role-based card visibility), notifications (Commander only), audit log (Admin/Commander only). JWT auth on all API routes. Audit logging for all CRUD. |
| II. SSR-First | ✅ Pass | Dashboard page is Server Component. Notification bell and panel are small `'use client'` leaf components (SSE requires client-side). Audit log table with filters is Server Component with server actions. |
| III. Offline-First | ✅ Pass | No external dependencies. SSE runs on local server. MongoDB local via Docker. |
| IV. Type Safety & Validation | ✅ Pass | TypeScript strict mode. Zod schemas for all API inputs. No `any` usage. |
| V. Quality Gates | ✅ Pass | ESLint/Prettier enforced. `npm run build` must pass. Edge cases handled: DB failures, empty states, SSE reconnection. |
| VI. Design-Driven UI via Stitch MCP | ✅ Pass | Dashboard, notification panel, and audit log pages will be generated via Stitch MCP referencing `DESIGN.md`. Arabic RTL throughout. |

**Gate Result**: PASS — No violations. All principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/003-dashboard-notifications/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-routes.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + Navbar (existing)
│   │   ├── page.tsx                # Commander Dashboard (new)
│   │   ├── audit-log/
│   │   │   └── page.tsx            # Audit Log page (new)
│   │   └── ...existing modules...
│   │
│   └── api/
│       ├── notifications/
│       │   ├── route.ts            # GET notifications, POST mark-as-read
│       │   └── stream/
│       │       └── route.ts        # SSE endpoint for real-time notifications
│       ├── dashboard/
│       │   └── route.ts            # GET dashboard summary data
│       └── audit/
│           └── route.ts            # GET audit log with filters
│
├── lib/
│   ├── db/
│   │   └── models/
│   │       ├── Notification.ts     # (exists from master plan)
│   │       └── AuditLog.ts         # (exists from master plan)
│   └── notifications/
│       └── emitter.ts              # SSE event emitter utility (new)
│
├── components/
│   └── dashboard/
│       ├── DashboardCard.tsx       # Summary card component (new)
│       ├── NotificationBell.tsx    # Bell icon + badge (new)
│       └── NotificationPanel.tsx   # Slide-in panel (new)
```

**Structure Decision**: Next.js fullstack application using App Router. Dashboard page at `(dashboard)/page.tsx`, notification SSE at `api/notifications/stream/`, audit log at `(dashboard)/audit-log/page.tsx`.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — Constitution Check passed all gates.

## Stitch MCP Design Tasks

### 1. Commander Dashboard Page
```
Prompt for Stitch:
"Using DESIGN.md context, generate an Arabic RTL commander dashboard page.
Summary cards in a grid: فاكسات معلقة (pending faxes), تمام اليوم (daily
rollcall), أدوية منتهية (expired medicines), الدورات (courses), الطلبة
(students). Each card shows a count, icon, and color-coded status indicator.
Recent faxes list below with status badges. Dark sidebar navigation."
```

### 2. Notification Bell & Panel
```
Prompt for Stitch:
"Using DESIGN.md context, generate an Arabic RTL slide-in notification panel.
Bell icon in top navbar with unread count badge. Panel slides from right (RTL)
showing notification items: icon, title, body, timestamp, read/unread styling.
Mark all as read button at top. Empty state with Arabic message."
```

### 3. Audit Log Page
```
Prompt for Stitch:
"Using DESIGN.md context, generate an Arabic RTL audit log page. Filterable
table with columns: المستخدم, العملية, الوحدة, الهدف, الوصف, التاريخ.
Filter bar on top with dropdowns for user, action type, module, and date
range picker. Paginated table with 20 entries per page."
```
