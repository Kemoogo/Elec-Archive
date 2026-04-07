# Implementation Plan: Auth & User Management

**Branch**: `002-auth-user-mgmt` | **Date**: 2026-03-23 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-auth-user-mgmt/spec.md`

## Summary

Implement a complete authentication and user management system for the Elec Archive military archive application. This includes JWT-based login/logout, admin-only user CRUD with per-module permissions (fax, officers, medical, students, education), role-based access control (admin/commander/employee/viewer), account lockout with admin-only unlock, audit logging, and Arabic RTL login and user management UI pages generated via Stitch MCP.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode, no `any`)  
**Primary Dependencies**: Next.js 14+ (App Router), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod, bcrypt  
**Storage**: MongoDB 7 via Mongoose ODM (local Docker)  
**Testing**: Jest + React Testing Library  
**Target Platform**: Docker Compose on Windows (local server)  
**Project Type**: Web application (Next.js fullstack — App Router with API routes)  
**Performance Goals**: Login completes in <10 seconds (SC-002), user creation in <3 minutes (SC-001), audit log writes within 1 second (SC-005)  
**Constraints**: Fully offline, Arabic RTL throughout, 10-30 users, SSR-first, no `any` types, Zod validation on all inputs  
**Scale/Scope**: 10-30 users, 4 roles, 5 permission modules, ~4 pages (login, user list, user create/edit modal, dashboard shell)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ Pass | JWT in HttpOnly cookies, RBAC at API + layout level, no self-registration, audit logging, rate limiting, input sanitization |
| II. SSR-First | ✅ Pass | Pages server-rendered by default; `'use client'` only on login form and user management interactive components |
| III. Offline-First | ✅ Pass | No external dependencies, MongoDB via local Docker, local file storage |
| IV. Type Safety & Validation | ✅ Pass | TypeScript strict, Zod schemas for all API inputs/outputs, no `any` |
| V. Quality Gates | ✅ Pass | ESLint + Prettier enforced, `npm run build` must pass with zero errors/warnings, edge cases handled |
| VI. Design-Driven UI via Stitch MCP | ✅ Pass | Login page and user management page generated via Stitch MCP workflow referencing DESIGN.md |

No violations detected. All gates pass.

### Post-Design Re-Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Security-First | ✅ Pass | Contracts and data model enforce admin-only account management, lock/unlock flow, audit logging, and protected auth routes |
| II. SSR-First | ✅ Pass | Planned UI keeps server-rendered pages with only form interactions using client components |
| III. Offline-First | ✅ Pass | Research decisions avoid external services and keep auth/session behavior local-only |
| IV. Type Safety & Validation | ✅ Pass | Contracts and data model use explicit schemas and typed entities for all auth flows |
| V. Quality Gates | ✅ Pass | Quickstart includes verification for build, RBAC, rate limiting, and audit logging |
| VI. Design-Driven UI via Stitch MCP | ✅ Pass | UI work remains explicitly tied to Stitch-generated login and user management pages |

Post-design review passes with no constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-user-mgmt/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
next/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page (Stitch Generated)
│   │   └── layout.tsx            # Auth layout (no sidebar)
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Protected layout with RBAC checks
│   │   ├── page.tsx              # Dashboard home (role-based redirect)
│   │   └── admin/
│   │       └── users/
│   │           └── page.tsx      # User management page (Stitch Generated)
│   └── api/
│       └── auth/
│           ├── login/route.ts    # POST login
│           ├── logout/route.ts   # POST logout
│           ├── me/route.ts       # GET current user
│           └── users/
│               ├── route.ts      # GET list, POST create
│               └── [id]/route.ts # GET, PATCH, DELETE user
├── lib/
│   ├── db/
│   │   ├── connect.ts            # Mongoose connection
│   │   └── models/
│   │       └── user.ts           # User model
│   └── auth/
│       ├── jwt.ts                # JWT sign/verify helpers
│       ├── middleware.ts         # Auth + RBAC middleware
│       └── types.ts              # Auth-related TypeScript types
├── components/
│   └── ui/
│       └── shared/               # Shared shadcn/ui components
└── validations/
    └── auth.ts                   # Zod schemas for auth APIs
```

**Structure Decision**: Option 2 — Web application (Next.js fullstack with App Router). All backend logic in API routes, all frontend in App Router pages. Models in `lib/db/models/`, auth utilities in `lib/auth/`, Zod schemas in `validations/`.

## Complexity Tracking

No violations. Constitution Check passes fully.

## Implementation Phases

### Phase A: Auth Core
- Mongoose User model with password hashing (bcrypt)
- JWT helper functions (sign, verify, extract from cookies)
- Login API route (`POST /api/auth/login`)
- Logout API route (`POST /api/auth/logout`)
- Current user API route (`GET /api/auth/me`)
- Auth middleware for API routes and server layouts

### Phase B: User Management API
- User CRUD API routes (`/api/auth/users`)
- Zod validation schemas for create/update user
- Audit logging on all user operations
- Admin-only RBAC enforcement

### Phase C: UI Pages
- Login page (Stitch MCP generated, Arabic RTL)
- User management page (Stitch MCP generated, Arabic RTL)
- Dashboard layout with sidebar and role-based navigation
- Form data persistence on session expiry (localStorage)

### Phase D: Integration & Edge Cases
- Rate limiting on login attempts (account lockout)
- Admin unlock of locked accounts
- Self-deactivation guard (last admin protection)
- DB unreachable error page
- Session expiry form preservation
