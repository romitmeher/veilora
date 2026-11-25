# Veilora Design System

## Logo Colour Extraction
Measured from opaque pixels (`A > 200`) of `assets/brand/veilora.png` (`1254×1254`):
- Mint teal ribbon: `#10E8A8` / `#10E8B0` (~42.4%)
- Deep emerald fold: `#007858` / `#007058` / `#007860` (~20.8%)
- Mid transition teal: `#00A880` / `#00A078` (~3.7%)

## Semantic Tokens (`frontend/src/styles/tokens.css` & `frontend/src/App.css`)

| Token | Light Theme | Dark Theme | Purpose |
|---|---|---|---|
| `--canvas` | `#F4F6F4` | `#121715` | Main content background |
| `--rail` | `#EAEFEB` | `#171D1A` | Header & navigation sidebar |
| `--surface` | `#FFFFFF` | `#1D2521` | Cards, inputs, status panel |
| `--raised` | `#E2E9E4` | `#26312B` | Secondary buttons & icon badges |
| `--line` | `#D8E0DA` | `#303B35` | 1px hairline borders & dividers |
| `--ink` | `#202C26` | `#E3EAE6` | Primary text |
| `--muted` | `#55665D` | `#98A8A0` | Secondary text (WCAG AA >= 4.5:1) |
| `--accent` | `#187D61` | `#57D6AE` | Primary actions & active indicators |
| `--accent-hover` | `#105C47` | `#6CE0BC` | Primary hover state |
| `--accent-ink` | `#FFFFFF` | `#0B1A14` | Text on `--accent` |
| `--positive` | `#187D61` | `#57D6AE` | Connected / active / low ping |
| `--warning` | `#B36B19` | `#E09F4C` | Connecting / fair ping / advanced border |
| `--danger` | `#B43232` | `#E26D6D` | Error / slow ping / cancel |

## Motion & Radii
- `--fast: 80ms`, `--moderate: 160ms`, `--slow: 240ms`, `--ease: cubic-bezier(0.2, 0.8, 0.2, 1)`
- `--radius-sm: 4px`, `--radius-md: 6px`
- `StatusText` (`torph/react` `TextMorph`) is used for state labels, Connect/Disconnect labels, and server count; continuous timers use plain `font-variant-numeric: tabular-nums`.
