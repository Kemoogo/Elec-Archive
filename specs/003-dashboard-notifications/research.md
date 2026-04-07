# Research: Dashboard & Notifications

**Date**: 2026-03-26
**Feature**: Dashboard & Notifications (Phase 2)

## Research Tasks

### 1. SSE Implementation in Next.js App Router

**Decision**: Use Next.js Route Handlers with a ReadableStream for SSE
**Rationale**: Next.js App Router supports SSE via Route Handlers that return a `ReadableStream`. This avoids external dependencies (no Socket.io, no external pub/sub). The server maintains a Map of connected clients keyed by userId. When a notification is created, the emitter pushes events to the relevant client's stream.
**Alternatives considered**:
- WebSocket (Socket.io): More complex, bidirectional not needed for notifications. Rejected as over-engineering for one-way push.
- Polling from client: Higher latency, wastes bandwidth. Rejected per spec requirement (3-second delivery).
- Server-Sent Events via dedicated server: Adds infrastructure complexity. Rejected in favor of in-process SSE via Route Handlers.

### 2. SSE Client Reconnection Strategy

**Decision**: Use `EventSource` API with exponential backoff reconnection
**Rationale**: `EventSource` natively reconnects on connection loss. We add a custom retry mechanism with exponential backoff (1s → 2s → 4s → 8s → max 30s) and a visible reconnection indicator in the UI. On reconnect, the client fetches missed notifications via a GET endpoint.
**Alternatives considered**:
- Manual `fetch` with streaming: More control but loses native `EventSource` auto-reconnect. Rejected.
- Third-party SSE libraries: Unnecessary for this use case. Rejected to avoid dependencies.

### 3. Dashboard Data Aggregation Strategy

**Decision**: Server-side aggregation in the dashboard page's Server Component using Mongoose aggregate queries
**Rationale**: Since the dashboard is an SSR page, summary counts are computed server-side on each request. This avoids client-side data fetching for initial load and ensures accurate counts. Each card's data is fetched via a separate lightweight query for resilience (one failure doesn't break all cards).
**Alternatives considered**:
- Single aggregation pipeline: Faster but one failure breaks the entire dashboard. Rejected for resilience.
- Client-side fetching with `'use client'`: Violates SSR-first principle. Rejected.
- Cached summaries (pre-computed): Adds complexity for a 10-30 user system. Rejected as over-engineering.

### 4. Audit Log Implementation Pattern

**Decision**: Middleware-based audit logging triggered after each API route handler completes
**Rationale**: A shared utility function `logAuditEntry()` is called at the end of each API route's successful operation. It captures userId, userName, action, module, targetId, description, and ipAddress from the request. This follows the project's API conventions (verify auth → check RBAC → validate → operate → audit log → respond).
**Alternatives considered**:
- Mongoose middleware (post hooks): Would catch direct model saves but not API-level context (IP, user info). Rejected.
- Separate audit microservice: Adds infrastructure complexity. Rejected for offline single-server deployment.

### 5. Notification Creation Trigger Points

**Decision**: Notifications are created inline at the specific API route where the triggering event occurs
**Rationale**: Each triggering event has a known API route:
- New fax uploaded → `POST /api/fax` creates notification
- Rollcall submitted → `POST /api/officers/rollcall` creates notification
- Medicine below threshold → `POST /api/medical/medicine` (on stock update) creates notification

The notification creation is a simple `Notification.create()` call after the main operation succeeds.
**Alternatives considered**:
- Event bus / pub-sub pattern: Adds abstraction for 3 event types. Rejected as over-engineering.
- Database change streams (MongoDB watch): Adds complexity and latency. Rejected for this scale.

### 6. Role-Based Dashboard Card Visibility

**Decision**: Server Component checks user role from JWT session and conditionally renders cards
**Rationale**: The dashboard page is a Server Component that reads the user session. Based on the role:
- Commander / Admin: All 5 department cards rendered
- Employee: Only the card matching their `department` field rendered

This is handled server-side with no client-side conditional logic needed.
**Alternatives considered**:
- Client-side role check with API fetching: Adds unnecessary client JS. Rejected per SSR-first principle.
- Separate dashboard pages per role: Code duplication. Rejected.
