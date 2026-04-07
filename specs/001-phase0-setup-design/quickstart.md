# Quickstart: Phase 0 — Setup & Design System

**Date**: 2026-03-23
**Feature**: Phase 0 — Setup & Design System

## Prerequisites

- Node.js 20+ LTS installed
- Docker Desktop installed and running (for MongoDB)
- Git installed

## Quick Setup (15 minutes or less)

### 1. Clone and Navigate

```bash
git clone <repository-url>
cd elec-archive
```

### 2. Start MongoDB

```bash
docker-compose up -d mongo
```

Wait for MongoDB to be ready (check with `docker-compose logs mongo`).

### 3. Install Dependencies

```bash
cd next
npm install
```

### 4. Configure Environment

```bash
cp .env.example .env.local
# Edit .env.local with your JWT_SECRET (generate with: openssl rand -base64 32)
```

### 5. Verify Database Connection

```bash
npm run dev
# Open http://localhost:3000 — should load without errors
# Check terminal for "MongoDB connected" message
```

### 6. Run Build Validation

```bash
npm run build
# Must complete with zero errors and zero warnings
```

### 7. Run Linting

```bash
npm run lint
# Must pass with zero violations
```

## Full Docker Setup

```bash
docker-compose up --build
# Application available at http://localhost:3000
# MongoDB data persists in Docker volume
```

## Verification Checklist

After setup, verify:

- [ ] Application loads at http://localhost:3000
- [ ] MongoDB connection is established (check logs)
- [x] `npm run build` passes with zero errors
- [x] `npm run lint` passes with zero violations
- [x] All 11 model files exist in `next/lib/db/models/`
- [x] `DESIGN.md` exists in `specs/` with design tokens
- [x] `.specify/memory/constitution.md` exists with governance rules
- [ ] Docker Compose starts both services successfully

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB connection refused | Ensure Docker is running and `docker-compose up -d mongo` completed |
| Build fails with TypeScript errors | Run `npx tsc --noEmit` to see all type errors |
| ESLint errors on `any` usage | Replace `any` with proper types — `any` is prohibited |
| Port 3000 already in use | Change port in `next.config.ts` or stop conflicting service |
| Docker build fails | Check Docker Desktop is running with WSL2 backend on Windows |
