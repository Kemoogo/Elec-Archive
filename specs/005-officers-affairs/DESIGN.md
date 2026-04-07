# Design System — Officers Affairs Module

**Reference**: `specs/DESIGN.md` (project-wide design tokens)

## Module-Specific Overrides

- Layout: Arabic RTL throughout
- Color scheme: Inherit from project design system
- Typography: Arabic-first, RTL text alignment
- Components: shadcn/ui base with officer-specific extensions

## Screen Inventory

1. Officers List (`/officers`) — searchable, filterable table
2. Officer Detail (`/officers/[id]`) — profile card + documents + timeline
3. Daily Rollcall (`/officers/rollcall`) — status sheet per officer
4. Leave Register (`/officers/leaves`) — leave/absence list + create form
