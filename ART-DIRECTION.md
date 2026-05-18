# Sprint Party — Art Direction

## Design Philosophy

Sprint Party should feel like a neal.fun game that happens to be multiplayer. The guiding principle is **simplicity that feels alive**. Every screen should be immediately understandable with zero onboarding. The interface should feel like you're playing a game in a browser tab, not using a SaaS product. Strip away everything that doesn't serve the experience, then make what's left feel delightful.

The app has two distinct visual modes that deliberately coexist:
- **Work mode** (Landing, Dashboard, Room active): clean, minimal, near-flat. Restrained whitespace, white cards, navy text. Calm and readable.
- **Celebration mode** (WinnerReveal): a full theatrical break — dark stage, spotlight beams, curtain reveal, confetti, bronze/silver/gold podiums. Disproportionately dramatic by design.

---

## Visual Identity

### The Feel

Clean, digital, slightly retro. Flat colors, crisp edges, pixel-perfect spacing. Nothing glossy. The aesthetic is confident and flat in everyday use, then erupts into esports-broadcast energy at the finish line.

Think: the crispness of Wordle's grid, the playfulness of neal.fun's layouts, the competitive energy of Mario Party's UI, the satisfying feedback of Duolingo.

### What This Is NOT

- Not a productivity app (no Notion/Linear/Todoist energy)
- Not a mobile game with gem currencies and progress bars everywhere
- Not a dark dashboard with glassmorphism and blur effects
- Not a corporate SaaS tool with a sidebar nav and breadcrumbs
- Not over-designed or visually noisy

---

## Color System

### Global Foundations

| Role | Hex |
|---|---|
| Page background | `#FAFAFA` (off-white, with `dotted-bg.png` texture tiled at 445px) |
| Primary text | `#1A1A2E` (deep navy-black) |
| Hover on primary text | `#2D2D4A` |
| Muted / secondary text | `#6B7280` |
| Faint labels / disabled | `#9CA3AF` |
| Borders / dividers | `#E5E7EB` |
| Card / input fill | `#FFFFFF` / `#FAFAFA` |
| Light gray fill | `#F3F4F6` |
| Success toast | `#10B981` |
| Error | `#EF4444` |
| Warning / bounty accent | `#F59E0B` |

### Player Colors

Eight slots, assigned in join order. These are the primary visual identifiers throughout — avatars, leaderboard accents, team highlights, confetti, overtake flashes. They should pop hard against the white background.

```
0: #FF6B6B  coral red
1: #4A90E2  sky blue
2: #FFD93D  golden yellow
3: #6C5CE7  indigo violet
4: #FF8A5C  warm orange
5: #2ECC71  emerald green
6: #FF69B4  hot pink
7: #4ECDC4  teal
```

### Team Event Colors (team_up event)

- Magenta team: `#E91E8A`
- Lime team: `#7ED321`
- Team section backgrounds: `${color}0d` (6% fill) / `${color}22` (13% border)

### WinnerReveal Palette

- Page: deep space purple gradient over dotted-bg texture
- Curtain left: warm coral-to-yellow gradient
- Curtain right: cool violet-to-teal gradient
- 1st place podium: gold (`#FFD700` → `#B8860B`)
- 2nd place podium: silver (`#D8D8D8` → `#888`)
- 3rd place podium: bronze (`#CD7F32` → `#7B4510`)
- 1st place avatar ring: gold glow halo (`0 0 0 3px #FFD700, 0 0 24px rgba(255,215,0,0.45)`)
- Confetti: player color palette + `#FFD700` + `#FFFFFF`

---

## Typography

### Fonts in Use

- **Primary:** `"Nunito"` (Google Font) — rounded sans-serif, friendly and game-adjacent. Applied globally.
- **Monospace accent:** `font-['JetBrains_Mono']` — used for room codes and invite codes only, giving them a terminal/game-code identity.

No `tailwind.config.js` exists. All theming is done via inline utility classes and `src/index.css` keyframes.

### Weight Usage

| Weight | Class | Usage |
|---|---|---|
| 900 | `font-black` | H1 titles, scores, rank numbers, room names, avatar initials |
| 700 | `font-bold` | Card section labels, button text, player names |
| 600 | `font-semibold` | Subtitles, nav links |

### Scale Patterns

- Landing H1: `text-[72px] leading-none tracking-tight font-black`
- Section labels: `text-xs font-bold uppercase tracking-widest text-[#6B7280]`
- Room code (large): `font-['JetBrains_Mono'] text-4xl font-bold tracking-[0.25em]`
- Scores: `text-lg font-black tabular-nums`

---

## Layout

### Page Containers

Each page uses a different max-width:

| Page | Max-width | Notes |
|---|---|---|
| Landing | `max-w-lg` (512px) | Narrow centered column |
| Dashboard | `max-w-3xl` (768px) | Two-column create/join grid |
| Room | `max-w-5xl` (1024px) | Two-column game board (lg breakpoint) |

All use `mx-auto px-6`. Sticky header at `h-14` with `border-b border-[#E5E7EB]`.

### Room Game Board Grid

```
grid-cols-1 lg:grid-cols-2 gap-4
Left:  Leaderboard + EventFeed
Right: TaskList + PowerUpInventory
```

### Card Base Pattern

All standard cards:
```
bg-white border border-[#E5E7EB] rounded-2xl
```
Hover: `hover:border-[#1A1A2E] hover:shadow-sm active:scale-[0.99]`

No drop shadows in normal mode — borders carry all the hierarchy. Shadows appear only on toast (`shadow-lg`) and WinnerReveal podiums (dramatic theatrical shadows).

### Internal Dividers

Cards use `border-b border-[#E5E7EB] last:border-0` rather than gutters between rows.

### Avatar Pattern

Used in three sizes across the app:
1. **Small cluster dots:** `w-5 h-5 rounded-full border-2 border-white`
2. **Leaderboard rows:** `w-9 h-9 rounded-full` — initial in `font-black text-sm`
3. **Lobby:** `w-16 h-16 rounded-full` — initial in `text-xl font-black`

---

## Iconography

Use native emoji for icons throughout. No icon library.

```
Difficulty:  🟢 Easy / 🟡 Medium / 🔴 Hard
Events:      🔀 Task Swap / 🔮 Mystery Bonus / ⚔️ Team Up / ⚡ Blitz / ☠️ Bounty
Power-ups:   🛡️ Shield / 🧊 Freeze / 🎲 Double or Nothing / 🕵 Incognito / 💣 Sabotage / 🏴‍☠️ Point Heist / 🚀 Sprint Boost
```

---

## Animation and Motion

### Core Easing

Two curves dominate:

| Curve | Usage |
|---|---|
| `cubic-bezier(0.34, 1.56, 0.64, 1)` | Spring with overshoot — task completion, modal entry, checkbox bounce, leaderboard overtaker, crown drop, podium rise |
| `cubic-bezier(0.25, 0.46, 0.45, 0.94)` | Standard ease — toast slide-in, float-up point labels, general transitions |

The spring curve is the app's personality — nearly every discrete user action snaps with a slight overshoot and settle.

### CSS Keyframes (defined in `src/index.css`)

| Class | Effect | Duration |
|---|---|---|
| `animate-pop` | Scale 1→1.2→1 (spring) | 0.3s |
| `animate-check` | Scale 0→1.15→1 (spring) | 0.2s |
| `animate-float-up` | Translate up + fade | 1.5s |
| `animate-slide-in` | Toast entry from right | 0.35s |
| `animate-fade-out` | Toast dismissal | 0.4s |
| `animate-modal-in` | Modal entry (translateY + scale) | 0.25s |
| `animate-overlay-in` | Backdrop fade | 0.2s |
| `animate-field-error` | Red box-shadow pulse | 1s |
| `animate-ice-shimmer` | Opacity loop (freeze state) | 2s infinite |

### Leaderboard FLIP Animation

JavaScript-driven via `useLayoutEffect`. Not a CSS class.

- Overtaker (moving up): spring curve, 0.55s + player color flash via `--overtake-color` CSS custom property
- Displaced (moving down): standard ease, 0.55s
- Score display: `react-slot-counter` rolling-digit animation

### WinnerReveal Sequence (~4.4s total)

Choreographed entirely with inline style `transition`/`animation` delays:
1. Curtain panels slide off screen (1.1s, ease-out)
2. "Race Complete" title bursts in (0.6s delay 1.2s)
3. 3rd place podium rises (delay 1.7s), 2nd (2.3s), 1st (3.0s)
4. Spotlights open in sync with podiums
5. Crown drop + gold shine sweep (delay 3.5–3.7s)
6. Winner bounce loop begins (delay 3.8s)
7. Confetti falls throughout (24 pieces, staggered 0–3.25s)
8. "View Leaderboard" button fades in (delay 4.0s)

---

## Sound Design

Sound helpers live in `src/lib/sounds.js`. All are short and low in the mix.

| Function | Trigger |
|---|---|
| `playStart()` | Race start |
| `playPop()` | Task checked off |
| `playScribble()` | Task added |
| `playSuccess()` | Points/bonus awarded (synthesized via Web Audio API, no file) |
| `playSlots()` | Power-up earned |
| `playWhoosh()` | Power-up activated |
| `playError()` | Error state |

Sounds play on user-initiated actions only. No autoplay on page load.

---

## Component Reference

### Task Card

```
┌─────────────────────────────────────────┐
│  ⬜  Write essay outline          🔴 3  │
└─────────────────────────────────────────┘
```

On complete: checkbox → ✅, text strikethrough, row fades, "+Xpts" floats up.

### Leaderboard Row

```
┌─────────────────────────────────────────┐
│  1.  🔴 F  Felix       850 pts   5/7    │
└─────────────────────────────────────────┘
```

3px left border in player color during bounty/team events.

### Power-Up Badge

```
  ┌──────────┐
  │ 🛡️ Shield │
  └──────────┘
```

Pill-shaped, click to open `PowerUpModal` for activation.

---

## Summary

Sprint Party's visual identity in three words: **clean, colorful, clicky.**

Every design decision should pass this test: "Would this feel at home on neal.fun?" If it feels like it belongs in a Figma design system showcase or a Y Combinator demo day, strip it back. If it feels like something you'd send to a friend and say "check this out," ship it.
