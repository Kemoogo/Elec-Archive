# Research: Phase 0 — Setup & Design System

**Date**: 2026-03-23
**Feature**: Phase 0 — Setup & Design System

## Research Questions

### 1. Testing Framework for Next.js + Mongoose

**Question**: Which testing framework should be used for a Next.js fullstack application with Mongoose?

**Decision**: Vitest + React Testing Library

**Rationale**:
- Vitest is the recommended testing framework for Next.js projects (faster than Jest, native ESM support, Vite-compatible)
- React Testing Library for component testing
- Supertest or direct handler testing for API routes
- MongoDB Memory Server for isolated database tests (no Docker dependency for unit tests)

**Alternatives considered**:
- Jest: Slower, requires more configuration for ESM/TypeScript, but battle-tested
- Playwright: Good for E2E but overkill for Phase 0; can be added later in Phase 8
- Cypress: Same as Playwright — E2E focused, not needed for setup phase

---

### 2. Mongoose Connection Strategy for Offline/Local Deployment

**Question**: What is the best connection pattern for Mongoose in a fully offline, local Docker deployment?

**Decision**: Singleton connection pool with retry logic

**Rationale**:
- Singleton pattern prevents multiple connection instances during hot reloads in development
- Retry logic with exponential backoff handles MongoDB container startup delays
- Connection string via environment variable (`MONGODB_URI`) with fallback to `mongodb://localhost:27017/elec-archive`
- Graceful degradation: API routes return 503 if database is unreachable

**Alternatives considered**:
- Direct connection per request: Too much overhead, connection churn
- Connection without retry: Fails on first request if MongoDB isn't ready yet

---

### 3. ESLint + Prettier Configuration for Next.js + TypeScript Strict Mode

**Question**: What is the optimal linting configuration for strict TypeScript with Next.js?

**Decision**: ESLint with `@typescript-eslint`, `eslint-config-next`, and Prettier integration

**Rationale**:
- `eslint-config-next` includes Next.js-specific rules (Image optimization, Link components, etc.)
- `@typescript-eslint/recommended` enforces strict TypeScript rules
- `@typescript-eslint/no-explicit-any` set to `error` (constitution prohibits `any`)
- Prettier via `eslint-config-prettier` to avoid conflicts
- Pre-commit hook via `husky` + `lint-staged` to enforce on commit

**Alternatives considered**:
- Biome: Newer, faster, but less ecosystem support for Next.js-specific rules
- Standard JS: Not compatible with TypeScript strict mode requirements

---

### 4. shadcn/ui Initialization with RTL Support

**Question**: How should shadcn/ui be configured to support Arabic RTL layout?

**Decision**: Initialize shadcn/ui with Tailwind CSS, add `dir="rtl"` at root layout, use `tailwindcss-rtl` plugin

**Rationale**:
- shadcn/ui components are Tailwind-based and RTL-compatible with the right plugin
- `tailwindcss-rtl` provides `ms-*`/`me-*` (margin-start/margin-end) utilities
- Root layout sets `dir="rtl"` and `lang="ar"` on `<html>`
- Component-level RTL handled automatically by Tailwind logical properties

**Alternatives considered**:
- Manual RTL via CSS `transform: scaleX(-1)`: Breaks text rendering
- `rtl-css-js`: Runtime overhead, not needed with Tailwind logical properties

---

### 5. Docker Compose for Windows Local Development

**Question**: What is the optimal Docker Compose configuration for local development on Windows?

**Decision**: Two-service compose (app + mongo) with volume mounts for hot reload and data persistence

**Rationale**:
- App service: Node.js image, source code mounted as volume for hot reload, port 3000 exposed
- MongoDB service: Official mongo:7 image, named volume for data persistence
- `depends_on` ensures MongoDB starts before app
- Environment variables via `.env` file, not hardcoded
- `restart: unless-stopped` for production-like behavior

**Alternatives considered**:
- Single container with embedded MongoDB: Not production-realistic
- Kubernetes: Overkill for 10-30 user local deployment
- Podman: Less common on Windows, Docker Desktop is standard

---

### 6. Stitch MCP Design System Extraction Workflow

**Question**: What is the most effective workflow for extracting a reusable design system from Stitch MCP?

**Decision**: Generate one reference screen (dashboard), extract Design DNA, document in DESIGN.md

**Rationale**:
- Single reference screen ensures consistency (no conflicting designs)
- `extract_design_context` captures: colors, fonts, spacing, border-radius, shadows
- `fetch_screen_code` provides the base HTML/CSS for conversion to Tailwind + shadcn/ui
- DESIGN.md becomes the single source of truth referenced by all future screens
- Fallback: If Stitch MCP is unavailable, manually define design tokens based on the master plan's "deep navy + gold accent" specification

**Alternatives considered**:
- Generate multiple screens and average: Risk of inconsistency
- Use a Figma-based design system: Adds external tool dependency (violates offline-first principle)
