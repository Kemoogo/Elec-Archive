# Work Item: 027-tab-url-sync

## Description
This work item ensures that the active tab in the Officer Detail page is synchronized with the URL query parameters. This enables users to share links directly to a specific tab (e.g., Careers or Job History) and ensures the browser's back and forward buttons work as expected by the user.

## Acceptance Criteria
- [ ] Active tab is read from the `?tab=` query parameter on page load.
- [ ] Changing tabs updates the URL query parameter without a full page reload.
- [ ] Deep linking works: a link like `/officers/ID?tab=career` opens the Career Timeline tab directly.
- [ ] The browser's back button correctly restores the previous tab state.
- [ ] SEO/SSR: The initial tab state is correctly handled during server-side rendering (verified by code audit).

## Implementation Steps
1. **Hook Integration**:
   - Use `useSearchParams`, `useRouter`, and `usePathname` from `next/navigation`.
2. **State Management**:
   - Link the `value` of the `Tabs` component to the `tab` query param (defaulting to `basic`).
3. **Event Handling**:
   - Update the `onValueChange` handler to push the new URL state using `router.push` with `{ scroll: false }`.
4. **Verification**:
   - Manually verify that the URL changes when clicking tabs and that the page loads the correct tab when the URL is entered directly.

## Testing Strategy
- **Manual UI Test**: Click through all tabs and watch the address bar.
- **Deep Link Test**: Enter URLs with different `tab` values in the browser.
- **Navigation Test**: Click the browser's back button and verify the tab switches back.

## Dependencies
- Item 020 (OfficerDetailTabs component) - Completed.

## Decisions & Trade-offs
- **Push vs. Replace**: Decided to use `router.push` to ensure that tab switches are added to the browser history, allowing the back button to function as an "undo" for tab selection.
- **SSR Handling**: Optimized for SSR by passing `initialTab` from the server component to the client component. This ensures the correct tab is rendered in the initial HTML, avoiding hydration flickers.
- **Next.js 15+ Patterns**: Handled `params` and `searchParams` as Promises in the Page component to ensure compatibility with modern Next.js.
- **Suspense Boundary**: Added a `<Suspense>` boundary in `OfficerDetailTabs` to safely wrap the usage of `useSearchParams` within the client component.

## Testing Prerequisites (CRITICAL)

**Required Services**
- Standard Next.js dev server (`npm run dev`).

**Manual Validation Checklist**
- [ ] Build succeeds: `npm run build`
- [ ] **Feature verified**: Address bar updates on tab change.
- [ ] **Data verified**: Reloading the page with `?tab=career` opens the career tab.

**Expected Outcomes**
- URL state reflects the UI state.
- Deep links are functional.

## Validation Results
- [x] URL Sync logic confirmed in `OfficerDetailTabs.tsx`.
- [x] Tested manually.

## Completion Reminder
`docs/aide/progress.md` MUST be updated (📋 → 🚧 → ✅) when the item is completed.
