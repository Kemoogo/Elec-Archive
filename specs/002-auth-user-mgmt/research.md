# Research: Auth & User Management

## Decision 1: JWT Storage Strategy

**Decision**: Store JWT in HttpOnly, Secure, SameSite=Strict cookies  
**Rationale**: The constitution mandates HttpOnly cookies to prevent XSS and CSRF. HttpOnly prevents JavaScript access (blocks XSS token theft), SameSite=Strict prevents cross-site request forgery. This is the security-first approach required for a military archive system.  
**Alternatives considered**:
- LocalStorage: Rejected — vulnerable to XSS attacks, no automatic cookie sending
- SessionStorage: Rejected — cleared on tab close, still XSS-vulnerable
- Bearer token in Authorization header: Rejected — requires client-side JS to manage, exposes token to XSS

## Decision 2: Password Hashing

**Decision**: Use bcrypt with 10 salt rounds  
**Rationale**: bcrypt is the industry standard for password hashing, provides built-in salt generation, and is resistant to brute-force attacks via adjustable work factor. 10 rounds provides a good balance between security and performance for 10-30 users.  
**Alternatives considered**:
- argon2: Rejected — stronger but adds native dependency complexity; bcrypt is sufficient for this scale
- scrypt: Rejected — less widely audited than bcrypt for password hashing specifically
- SHA-256 with salt: Rejected — not designed for password hashing, too fast for brute-force resistance

## Decision 3: Rate Limiting Strategy

**Decision**: In-memory counter per username, reset after admin unlock  
**Rationale**: The spec requires admin-only unlock (no auto-unlock). An in-memory approach is simple, works offline, and sufficient for 10-30 users. The counter tracks consecutive failed attempts per username and locks the account when the threshold is reached.  
**Alternatives considered**:
- Redis-based rate limiting: Rejected — adds infrastructure dependency, violates offline-first principle
- IP-based rate limiting: Rejected — local network means all users share similar IPs; username-based is more appropriate
- Database-stored counters: Considered but in-memory is simpler for this scale; can migrate if needed

## Decision 4: Session Management

**Decision**: Stateless JWT sessions with 8-hour expiry, stored in HttpOnly cookies  
**Rationale**: JWT is self-contained (no server-side session store needed), works well offline, and the 8-hour expiry matches a typical workday as specified in assumptions. The JWT payload contains userId and role for quick RBAC checks without database lookups on every request.  
**Alternatives considered**:
- Server-side sessions (MongoDB store): Rejected — adds database load on every request; JWT is sufficient for stateless auth
- Session store in memory: Rejected — lost on server restart; JWT in cookies persists across restarts

## Decision 5: RBAC Enforcement Pattern

**Decision**: Middleware layer for API routes + Server Component guards for pages  
**Rationale**: The constitution requires RBAC at both API Route and Server Layout level. Middleware checks the JWT cookie, extracts the role, and validates against required permissions. Server layouts check auth state and redirect unauthorized users. This dual-layer approach ensures no bypass path exists.  
**Alternatives considered**:
- Decorator pattern: Rejected — not idiomatic for Next.js App Router
- Client-side only guards: Rejected — insecure, easily bypassed
- Database permission check on every request: Considered as supplement to JWT claims for permission changes, but JWT refresh on permission update is sufficient

## Decision 6: Zod Schema Organization

**Decision**: One schema file per domain module in `validations/` directory  
**Rationale**: Keeps validation logic centralized and importable by both API routes and client forms. Each schema file exports request/response types inferred from Zod schemas, ensuring type safety end-to-end.  
**Alternatives considered**:
- Inline schemas in route handlers: Rejected — harder to reuse and maintain
- Single monolithic schema file: Rejected — grows unwieldy as modules are added
