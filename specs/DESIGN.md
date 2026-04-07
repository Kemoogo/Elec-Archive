# Design System — الأرشيف אלקטרוני

**Generated via**: Stitch MCP (Phase 0)
**Status**: Placeholder — to be populated via Stitch MCP workflow

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#0f172a` | Main background (deep navy) |
| `--foreground` | `#f8fafc` | Primary text |
| `--primary` | `#1e293b` | Cards, panels |
| `--primary-foreground` | `#f8fafc` | Text on primary |
| `--secondary` | `#334155` | Borders, dividers |
| `--accent` | `#d4a843` | Gold accent — highlights, active states |
| `--accent-foreground` | `#0f172a` | Text on accent |
| `--muted` | `#475569` | Muted backgrounds |
| `--muted-foreground` | `#94a3b8` | Muted text |
| `--destructive` | `#ef4444` | Error, delete actions |
| `--border` | `#334155` | Default border color |

## Typography

- **Primary Font**: System stack — Segoe UI, Tahoma, Arial, Noto Sans Arabic
- **Monospace**: Cascadia Code, Fira Code, Consolas
- **Heading Scale**: 4xl (2.25rem) → 3xl (1.875rem) → 2xl (1.5rem) → xl (1.25rem) → lg (1.125rem)
- **Body**: base (1rem) with 1.625 line height
- **Small**: sm (0.875rem) for captions and metadata

## Spacing Scale

Based on Tailwind's default 4px grid: `0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24`

## Border Radius

- `--radius-sm`: 0.125rem (2px)
- `--radius-md`: 0.25rem (4px)
- `--radius-lg`: 0.5rem (8px)
- `--radius-xl`: 0.75rem (12px)

## Component Patterns

- **Sidebar**: Fixed right side (RTL), dark navy background, gold accent on active items
- **Cards**: Primary background, subtle border, rounded-lg
- **Tables**: Striped rows with muted background alternation
- **Status Badges**: Rounded-full pills with semantic colors (green=active, red=closed, yellow=pending)
- **Forms**: Full-width inputs with border focus ring in accent color
- **Modals**: Centered overlay with primary background

## RTL Rules

- Layout direction: RTL (dir="rtl" on html element)
- All margins/paddings use logical properties (ms/me instead of ml/mr)
- Sidebar on the right side
- Text alignment: right by default
- Icons mirrored where directional (arrows, etc.)
