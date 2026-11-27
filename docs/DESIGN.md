# Save Fit design system

Built on **HeroUI Native** (free, Apache-2.0) with **Uniwind** (Tailwind v4 for React Native). HeroUI Native supplies Button, Card, Chip, Tabs, Switch, TextField/Input/TextArea, ListGroup, Accordion, Dialog, Toast and PressableFeedback. Components HeroUI Native doesn't have yet are built from the **same semantic tokens**, so they read as part of the kit.

## Tokens (`apps/mobile/global.css`)

HeroUI's semantic tokens are re-skinned rather than replaced:

| Token | Light | Dark | Use |
|---|---|---|---|
| `background` | cool off-white | near-black | screens |
| `surface` / `surface-secondary` | white / grey | graphite | cards, rows, steppers |
| `accent` | electric lime + ink text | same | primary actions, timer ring, active filter |
| `violet` | violet | lighter violet | rest phase, tips, links |
| `cat-*` / `cat-*-ink` | pastels / saturated inks | deep tints / bright inks | workout cards by type (strength, HIIT, cardio, mobility, core, mixed) |

- **Radius**: `--radius: 0.75rem` (rounder than stock HeroUI). Cards use 28–30 px, buttons and pills are fully round.
- **Type**: Bricolage Grotesque ExtraBold for headings and big numbers (`hero`, `display`, `title`, `number` variants of `AppText`), Inter for everything people read.
- Icons: Lucide, 2.2 stroke, coloured from tokens through `<Icon color="token">`.

## 4px grid

Every spacing, size, radius, icon size and line height is a multiple of 4px.

- **Spacing and sizes:** use Tailwind steps (1 step = 4px). Don't use half steps (`gap-1.5`, `py-2.5`, `mt-0.5`). Arbitrary values must be multiples of 4 (`rounded-[32px]`).
- **Computed sizes:** pass them through `grid()` from `src/lib/grid.ts` (icon inside a round button, player ring, video height).
- **Icons:** 16, 20, 24, 32 and larger multiples of 4.
- **Radii:** HeroUI's derived radii are pinned to 4, 8, 8, 12, 20, 24, 36 and 48px in `global.css`. Cards use 24 or 32px.
- **Type:** font sizes follow the scale below, and every line height is on the grid.

| Variant | Size / line height |
|---|---|
| hero | 40 / 44 |
| display | 32 / 36 |
| title | 24 / 28 |
| headline | 18 / 24 |
| body | 16 / 24 |
| label | 14 / 20 |
| caption, overline | 12 / 16 |

- **Exceptions:** hairline borders (1–2px) and letter spacing.
- **HeroUI internals:** HeroUI uses some half steps internally (6px gaps, 3px tab padding). These are overridden at the end of `global.css`.
- **Guard:** `npm test` runs `grid.test.mjs`, which fails on any off-grid value in `src/`.

## Custom components (`src/components/ui`)

`AppText`, `Icon`, `Tappable` (HeroUI PressableFeedback + haptics), `RoundButton`, `Stepper`, `Stat`, `ProgressRing`, `Choice`, `EmptyState`, `Confetti`, `Screen`.

## Motion (`src/lib/motion.ts`)

Following Emil Kowalski's design-engineering skills:

- Enter/exit: strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`. Movement on screen: `cubic-bezier(0.77, 0, 0.175, 1)`. Never ease-in.
- UI animations under 300 ms; press feedback 140 ms at scale 0.97; nothing scales up from 0.
- List entrances: 8 px rise + fade, 40 ms stagger capped at 8 items, never blocking taps.
- Timer ring moves linearly (constant motion).
- Reduced motion keeps fades and drops movement; confetti is skipped.
- Delight is saved for rare moments: finishing a workout (springy trophy + confetti).

## Workout ergonomics

- Player is always dark for contrast and calm.
- Main control 104 pt, prev/next 72 pt; the whole timer ring is a pause/resume target, the whole rep circle is a "done" target.
- Sounds on the last 3 seconds and on "go", haptic on every transition, screen kept awake.
