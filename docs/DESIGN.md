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
