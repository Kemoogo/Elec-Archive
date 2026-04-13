# Item 004: Export New Models

## Description
Update the `next/lib/db/models/index.ts` file to export the three newly created Mongoose data models (`PositionAssignment`, `Promotion`, `Mission`). This is a crucial step to ensure the models are properly registered with Mongoose and accessible throughout the application via the standard import pattern.

## Acceptance Criteria
- [ ] `PositionAssignment`, `Promotion`, and `Mission` are imported in `next/lib/db/models/index.ts`.
- [ ] The three models are correctly exported alongside existing models.
- [ ] Existing model exports remain intact and functional.
- [ ] The application builds without TypeScript errors or ESLint warnings related to these exports.

## Implementation Steps
1. Open the file `next/lib/db/models/index.ts`.
2. Add imports for the three new models:
   - `import { PositionAssignment } from './PositionAssignment';`
   - `import { Promotion } from './Promotion';`
   - `import { Mission } from './Mission';`
3. Add these models to the export statement (either named exports or export object, matching the existing pattern).
4. Run `npm run build` and `npm run lint` from the `next` directory to verify code health.

## Testing Strategy
- Compile-time Verification: Use TypeScript compiler and ESLint to verify structural correctness.
- Mongoose Registration: The standard pattern in `index.ts` ensures Mongoose compiles the schemas into models exactly once.

## Dependencies
- Item 001: PositionAssignment Model (Completed)
- Item 002: Promotion Model (Completed)
- Item 003: Mission Model (Completed)

## Decisions & Trade-offs
- **Export Pattern**: Validated that all shared schemas utilize the same explicit export patterns in `index.ts`, confirming that models compile correctly exactly once preventing OverwriteModelError cases.
- **Linter Cleanup**: Resolved legacy unrelated `any` type violations across modals (`OfficersTable`, `LeaveAddModal`, `OfficerPromoteModal`, etc.) rather than leaving them broken to ensure `npm run lint` perfectly passes with 0 errors per project Constitution.

## Testing Prerequisites (CRITICAL)

**Required Services**
- None required for this structural change. (A local MongoDB instance is not strictly necessary just to verify TypeScript compilation, but good for running the dev server).
- If starting dev server is desired for sanity check: PostgreSQL/MongoDB (Docker: `docker-compose up -d mongo`, Port: 27017)

**Environment Configuration**
- Base Next.js configuration

**Manual Validation Checklist**
- [ ] Build succeeds: `cd next && npm run build`
- [ ] Linter passes: `cd next && npm run lint`
- [ ] **Code inspected**: Verify `index.ts` exports follow the project convention.

**Expected Outcomes**
- The project builds seamlessly. The three new models are fully integrated into the project's data layer exports.

## Validation Documentation Template
```markdown
## Validation Results
- [x] Modified `next/lib/db/models/index.ts` successfully
- [x] Build verified (`npm run build` passed)
- [x] Linting verified (`npm run lint` passed)
```

## Completion Reminder
Remember to update `docs/aide/progress.md` to reflect the status of this item (change item `1.4` from 📋 Planned to 🚧 In Progress, and then to ✅ Complete when done).
