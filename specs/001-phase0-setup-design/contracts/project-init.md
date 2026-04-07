# Project Initialization Contract

**Date**: 2026-03-23
**Phase**: 0 — Setup & Design System

## Overview

Phase 0 has no external API contracts. This document defines the expected project initialization workflow and the file structure contract that all subsequent phases MUST follow.

## Initialization Workflow

```
1. Initialize Next.js project in `next/` directory
2. Install dependencies (Mongoose, Tailwind CSS, shadcn/ui, Zod, ESLint, Prettier)
3. Configure TypeScript strict mode
4. Configure ESLint + Prettier with `any` prohibition
5. Create directory structure per Project Structure contract
6. Define all 11 Mongoose models in `next/lib/db/models/`
7. Create database connection utility in `next/lib/db/connect.ts`
8. Create `.env.local` template with required variables
9. Create `docker-compose.yml` and `Dockerfile`
10. Generate design system via Stitch MCP → `DESIGN.md`
11. Verify: `npm run build` passes with zero errors/warnings
```

## File Structure Contract

The following directory structure MUST exist after Phase 0:

```
elec-archive/
├── .specify/                           # Spec Kit (existing)
├── specs/                              # Specifications
│   ├── CONSTITUTION.md                 # Project governance
│   ├── DESIGN.md                       # Design system from Stitch
│   └── 001-phase0-setup-design/       # This feature's specs
├── next/                               # Application code
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (RTL, Arabic)
│   │   ├── page.tsx                    # Home/placeholder page
│   │   └── api/                        # API routes (empty, for Phase 1+)
│   ├── lib/
│   │   ├── db/
│   │   │   ├── connect.ts              # Mongoose singleton
│   │   │   └── models/                 # All 11 Mongoose models
│   │   │       ├── User.ts
│   │   │       ├── Fax.ts
│   │   │       ├── Officer.ts
│   │   │       ├── Leave.ts
│   │   │       ├── Assignment.ts
│   │   │       ├── DailyRollcall.ts
│   │   │       ├── Patient.ts
│   │   │       ├── Medicine.ts
│   │   │       ├── Student.ts
│   │   │       ├── Course.ts
│   │   │       ├── Notification.ts
│   │   │       └── AuditLog.ts
│   │   └── uploads/                    # File upload handler
│   ├── components/
│   │   └── ui/                         # shadcn/ui components
│   ├── public/
│   │   └── uploads/                    # Uploaded files storage
│   ├── .env.local                      # Environment variables
│   ├── .env.example                    # Template (no secrets)
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── package.json
│   └── postcss.config.mjs
├── docker-compose.yml
├── Dockerfile
└── .gitignore
```

## Environment Variables Contract

`.env.local` MUST contain:

```
MONGODB_URI=mongodb://localhost:27017/elec-archive
JWT_SECRET=<generated-secret>
UPLOAD_PATH=./public/uploads
NEXT_PUBLIC_APP_NAME=الأرشيف الإلكتروني
```

## Docker Contract

`docker-compose.yml` MUST define:
- `app` service: builds from Dockerfile, exposes port 3000, depends on mongo
- `mongo` service: mongo:7 image, named volume for data persistence

`Dockerfile` MUST:
- Use Node.js LTS base image
- Install dependencies
- Build the Next.js application
- Expose port 3000
