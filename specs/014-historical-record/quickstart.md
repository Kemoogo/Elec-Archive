# Quickstart & Verification Guide: منظومة السجل التاريخي للوحدة

**Feature Branch**: `014-historical-record`  
**Date**: 2026-11-15

## 1. Local Development & Quality Checks

```bash
# 1. Start local MongoDB container (if not running)
podman-compose up -d mongo

# 2. TypeScript strict check (must return 0 errors)
cd next && npx tsc --noEmit

# 3. Lint check
cd next && npm run lint

# 4. Run dev server
cd next && npm run dev

# 5. Refresh graphify AST index after code edits
graphify auto-update .
```

## 2. End-to-End Verification Scenarios

### Scenario A: RBAC & Navigation Isolation
1. Log in as **Employee with `historical_record: "none"`**:
   - Confirm "السجل التاريخي" link does NOT appear in `AuthenticatedNavbar`.
   - Navigating directly to `/historical-record` redirects to `/`.
   - `GET /api/historical-record/visits` returns HTTP `403`.
2. Log in as **Admin** (`/admin/users`):
   - Create/edit an Employee user and assign `historical_record: "view"` or `"edit"`.
   - Create a Commander user and confirm `historical_record` defaults to `"edit"` (full add access).

### Scenario B: Separation of Add vs. Admin-Only Edit/Delete (`FEAT-HIS-04`)
1. Log in as **Commander** or **Employee with `historical_record: "edit"`**:
   - Navigate to `/historical-record`.
   - Confirm "إضافة زيارة" / "إضافة قائد" / "إضافة محطة" buttons are visible.
   - Confirm NO Edit (`تعديل`) or Delete (`حذف`) buttons appear on any saved Visit, Commander, Milestone, or the Unit Profile card.
   - Attempt direct `PATCH` or `DELETE` to `/api/historical-record/visits/[id]` via curl/fetch → confirm HTTP `403`.
2. Log in as **Admin**:
   - Edit or Delete a saved Visit/Commander/Milestone:
     - Confirm `ModalShell` opens with double-confirmation + mandatory reason input.
     - Attempting submit without reason is blocked.
     - After confirming with a reason, record updates/deletes and appears in `/audit-log` under module `السجل التاريخي` with valid `targetId` and the entered reason.

### Scenario C: Important Visits Timeline & Lightbox (`FEAT-HIS-01`)
1. Add two visits with different dates (e.g., `2024-05-10` and `2026-02-14`) and upload JPG/PNG/WebP images.
2. Verify files saved locally under `next/public/uploads/historical-record/visits/`.
3. Verify timeline renders newest-first by default (`2026-02-14` above `2024-05-10`), and toggles to oldest-first on button click.
4. Click a thumbnail → Lightbox modal opens with navigation across visit photos.
5. Type >= 2 chars in search (450ms debounce) or press Enter, and filter by year.

### Scenario D: Commanders, Atomic Closure & Snapshot Isolation (`FEAT-HIS-02`)
1. Open "قادة المركز والوحدة" → "إضافة قائد".
2. Verify `CustomSelect` lists BOTH active (`isInUnit: true`) and archived (`isInUnit: false`) officers from `/officers`.
3. Add Officer A with `startDate = 2022-01-01`, `isCurrent = true` (using Officer's photo).
   - Verify Officer A's photo is physically copied to `next/public/uploads/historical-record/commanders/`.
4. Add Officer B with `startDate = 2025-07-01`, `isCurrent = true`:
   - Verify the modal requires `previousCommanderEndDate` for Officer A (pre-filled as `2025-07-01`).
   - Save and verify Officer A now shows `endDate = 2025-07-01`, `isCurrent = false`, and calculated duration; Officer B shows "حتى الآن".
5. Attempt adding another commander with overlapping dates → confirm HTTP `409` error.
6. Go to `/officers`, modify Officer A's name/rank/photo OR delete Officer A via `DELETE /api/officers/[id]`.
7. Return to `/historical-record?tab=commanders`:
   - Confirm Officer A's historical record, snapshot fields (`fullName`, `rank`, `militaryId`, `seniorityNumber`), and copied photo remain 100% intact (`No Cascading Delete`).

### Scenario E: Unit Profile & Milestones (`FEAT-HIS-03`)
1. As `Admin`, initialize the Unit Profile card (`PUT /api/historical-record/unit-profile` → `CREATE` in AuditLog, no reason required on first creation).
2. Edit the Unit Profile card a second time → verify double confirmation + mandatory reason (`UPDATE` in AuditLog).
3. Add milestones across categories (`founding`, `upgrade`, `mission`, `honor`) with optional photos, test timeline sort toggle, category filter, year filter, and Lightbox.
