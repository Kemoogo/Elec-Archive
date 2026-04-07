# Elec-Archive Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-03-28

## Active Technologies
- TypeScript 5.x (strict mode, no `any`) + Next.js 14+ (App Router), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod, bcrypt (002-auth-user-mgmt)
- MongoDB 7 via Mongoose ODM (local Docker) (002-auth-user-mgmt)
- TypeScript 5.x (strict mode, no `any`) + Next.js 14+ (App Router, React Server Components), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod (003-dashboard-notifications)
- TypeScript 5.x (strict mode, no `any`) + Next.js 14+ (App Router), Mongoose 8.x, Tailwind CSS, shadcn/ui, Zod, bcryptjs (004-fax-module)
- MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/fax/`) (004-fax-module)
- TypeScript 5.x (strict mode, no `any`) + Next.js 16 App Router, React 19, Mongoose 9.x, Tailwind CSS 4, Zod 4, jsonwebtoken, bcryptjs (005-officers-affairs)
- MongoDB 7 via Mongoose ODM (local Docker), local filesystem uploads for officer documents under `public/uploads/officers/` (005-officers-affairs)
- TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4 (006-medical-point)
- TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs (007-student-affairs)
- MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/students/`) (007-student-affairs)
- MongoDB 7 via Mongoose ODM (local Docker), local filesystem for file uploads (`public/uploads/courses/`) (008-education)

- TypeScript 5.x (strict mode, no `any`)
- Next.js 14+ (App Router, React Server Components)
- Mongoose 8.x + MongoDB 7
- Tailwind CSS + shadcn/ui
- Zod (validation)
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
- 008-education: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4
- 007-student-affairs: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4, bcryptjs
- 006-medical-point: Added TypeScript 5.x (strict mode, no `any`) + Next.js 16 (App Router, React 19), Mongoose 9.x, Tailwind CSS 4, shadcn/ui, Zod 4


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
