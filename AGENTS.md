# Elec-Archive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-04-12

## Active Technologies
- TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4 (009-arkan-harb)
- MongoDB 7 via Mongoose ODM (local Docker) (009-arkan-harb)

- TypeScript 5.x (strict mode, no `any`)
- Next.js 16+ (App Router, React 19, Server Components)
- Mongoose 9.x + MongoDB 7
- Tailwind CSS 4 + shadcn/ui
- Zod 4 (validation)
- ESLint + Prettier
- Docker Compose (app + MongoDB)

## Project Structure

```text
next/
├── app/                 # Next.js App Router (pages + API routes)
├── lib/db/              # Mongoose connection + models
├── components/ui/       # shadcn/ui components
└── public/uploads/      # Local file storage

specs/                   # Spec Kit documents
docker-compose.yml       # App + MongoDB
```

## Commands

```bash
cd next && npm run dev        # Start dev server
cd next && npm run build      # Build for production (must pass with 0 errors)
cd next && npm run lint       # Run ESLint
docker-compose up --build     # Full Docker setup
docker-compose up -d mongo    # Start MongoDB only
```

## Code Style

- TypeScript strict mode — `any` is PROHIBITED
- React Server Components by default; `'use client'` only when necessary
- Arabic RTL layout throughout
- All API routes: verify auth → check RBAC → validate with Zod → operate → audit log → respond
- Models in `next/lib/db/models/`, shared UI in `next/components/ui/`
- Zod schemas for all form inputs and API request/response bodies

## Recent Changes
- 005-officers-affairs: Officers Registry module with Search, Detailed Records, Daily Rollcall with local storage recovery, Leave tracking, Assignments timeline, and Commander overview mode.
- 008-education: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 007-student-affairs: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs
- 006-medical-point: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 009-arkan-harb (COMPLETED): Staff Operations module with Rollcall, Leaves, Missions, and Position Assignments. Migrated legacy Assignment records to new specialized models.


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
