# Sprint Party — Art Direction

## Design Philosophy

Sprint Party should feel like a neal.fun game that happens to be multiplayer. The guiding principle is **simplicity that feels alive**. Every screen should be immediately understandable with zero onboarding. The interface should feel like you're playing a game in a browser tab, not using a SaaS product. Strip away everything that doesn't serve the experience, then make what's left feel delightful.

Neal.fun's core design DNA: minimal chrome, tons of whitespace, one clear interaction per screen, playful personality through small details rather than visual complexity. Sprint Party inherits all of this but adds a competitive multiplayer energy through color, motion, and sound.

---

## Visual Identity

### The Feel

Clean, digital, slightly retro. Imagine a Game Boy Advance UI rebuilt for modern browsers. Flat colors, crisp edges, pixel-perfect spacing. Nothing glossy, nothing with depth/shadows/gradients pretending to be 3D. The aesthetic is confident and flat.

Think: the crispness of Wordle's grid, the playfulness of neal.fun's layouts, the competitive energy of Mario Party's UI, the satisfying feedback of Duolingo.

### What This Is NOT

- Not a productivity app (no Notion/Linear/Todoist energy)
- Not a mobile game with gem currencies and progress bars everywhere
- Not a dark dashboard with glassmorphism and blur effects
- Not a corporate SaaS tool with a sidebar nav and breadcrumbs
- Not over-designed or visually noisy

---

## Color System

### Background

White or very light off-white (#FAFAFA or #FFFFFF). Like neal.fun, the background is quiet and the content does the talking.

### Player Colors

Each player in a room gets assigned a bold, saturated color. These are the primary visual identifiers throughout the game (leaderboard bars, task cards, avatars).

```
Player 1: #FF6B6B (coral red)
Player 2: #4A90E2 (light blue)
Player 3: #FFD93D (golden yellow)
Player 4: #6C5CE7 (purple)
Player 5: #FF8A5C (warm orange)
Player 6: #2ECC71 (green)
Player 7: #FF69B4 (pink)
Player 8: #4ECDC4 (teal)
```

These should feel like Mario Party character colors: immediately distinguishable, bright, and fun. They pop hard against the white background.

### UI Colors

```
Text primary: #1A1A2E (near-black, slightly warm)
Text secondary: #6B7280 (medium gray)
Borders/dividers: #E5E7EB (light gray)
Success/complete: #10B981 (green, used for task checkmarks)
Danger/warning: #EF4444 (red, used for sabotage, point loss)
Event highlight: #F59E0B (amber, used for event notifications)
```

### Dark Mode

Not for MVP. If added later, invert to a deep navy (#0F0F23) background with the same player colors. Neal.fun doesn't do dark mode either.

---

## Typography

### Primary Font: A rounded, geometric sans-serif

Use something with personality but high readability. Recommendations (pick one):

- **Nunito** — rounded, friendly, great for a game
- **Quicksand** — slightly more geometric, clean
- **Fredoka** — rounder and more playful, leans younger

Avoid: Inter, Roboto, system fonts, anything that looks like a tech company.

### Usage

- **Page titles and big numbers (scores, points):** Bold, large (32-48px). Points and scores should feel BIG.
- **Section headers:** Semi-bold, medium (18-24px).
- **Body text and task names:** Regular, readable (14-16px).
- **Small labels and metadata:** Light, small (12px), secondary color.

### Monospace Accent

For invite codes, event names, and game-mechanic text, use a clean monospace like **JetBrains Mono** or **Space Mono**. This creates a subtle "digital/computer game" feel for system-level information.

Example: an invite code displayed as `SPRINT-7K3X` in monospace on a light gray pill badge.

---

## Layout Principles

### Whitespace is Gameplay

Follow neal.fun's generous spacing. Elements should breathe. The game board should never feel cramped or information-dense. If a screen feels busy, remove something.

### One Focus Per View

Each screen has one primary action. The task submission screen is about adding tasks. The game board is about checking your progress and the leaderboard. Don't combine flows or stack panels.

### Center-Aligned, Narrow Container

Like neal.fun, content lives in a centered column (max 640-720px wide). No full-width layouts, no sidebars, no complex grids. The game should feel like a single vertical stream you scroll through.

### Card-Based Elements

Tasks, events, and power-ups are all cards with:

- Light border (1px solid #E5E7EB)
- Subtle border-radius (8-12px)
- No drop shadows (stay flat)
- Generous internal padding (16-20px)

---

## Iconography and Visual Elements

### Icons

Follow neal.fun's approach: use native emoji for icons.

```
Tasks:        ✅ (complete) / ⬜ (incomplete)
Difficulty:   🟢 Easy / 🟡 Medium / 🔴 Hard
Events:       🔀 Task Swap / 🔮 Mystery Bonus / ⚔️ Team Up / ⚡ Blitz / ☠️ Bounty
Power-ups:    🛡️ Shield / 🧊 Freeze / 🎲 Double or Nothing / 🔄 Reroll / 🕵 Incognito / 💣 Sabotage / 🏴‍☠️ Point Heist / 🚀 Sprint Boost
Streak:       🔥
```

### Player Avatars

Simple colored circles with the player's first initial inside, using their assigned player color. No uploaded photos, no avatar builders. Like a board game piece.

---

## Animation and Motion

### Core Principle: Small, Fast, Satisfying

Animations should feel like tactile feedback, not decoration. Every animation should be under 300ms. Nothing should bounce, wobble, or overshoot. Clean eases only.

### Required Animations

**Task Completion**
When a player checks off a task: the checkbox fills with a quick scale-up (0 to 1, 150ms, ease-out), the task text gets a strikethrough that draws left to right (200ms), and a small "+X pts" label floats up from the task and fades out (400ms, ease-out). This should feel like popping bubble wrap.

**Points Counter**
The player's point total should count up numerically (like an odometer rolling) whenever points are added. Never jump instantly to the new number. The count-up duration scales with the point amount (100pts = 300ms, 500pts = 600ms).

**Leaderboard Position Changes**
When rankings shift, player rows slide smoothly to their new position (300ms, ease-in-out). The player who moved up gets a brief green pulse on their row. The player who moved down gets a brief subtle red pulse.

**Event Reveal**
When an event fires, it should feel like an interruption. A card slides in from the top of the screen or expands from center with the event emoji large and centered, then the event description fades in below it. The whole sequence takes about 800ms. This is the one place where animation can be slightly more dramatic.

**Bonus Star Awards (End of Week)**
Each bonus star is revealed one at a time with a 1-second pause between them. The star emoji scales up with a slight rotation, the category name fades in, then the recipient's name appears with their player color. If a bonus star changes the final standings, the leaderboard re-sorts with the position change animation.

### Easing

Use `cubic-bezier(0.25, 0.46, 0.45, 0.94)` as the default ease for most transitions. For bouncy/playful interactions (task completion), use `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot).

### What NOT to Animate

- Page transitions (instant, no fades or slides between routes)
- Typing or text input
- Static content loading (no skeleton screens, just show content when ready)
- Hover states on non-interactive elements

---

## Sound Design

### Core Principle: Tiny, Cute, Optional

Sounds should be short (under 500ms), 8-bit/chiptune-inspired, and low in the mix. They're seasoning, not the meal. Always include a mute toggle visible on every screen.

### Sound Map

| Action              | Sound Description                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Task complete       | Short rising two-note chime, like a coin pickup in a retro game. Bright and quick.                                |
| Points awarded      | Soft ascending arpeggio (3-4 notes), slightly longer than task complete.                                          |
| Event fires         | A short alert jingle, 4-5 notes, slightly ominous/playful. Think the "something happened" sound from Mario Party. |
| Power-up earned     | A sparkly ascending tone, like finding an item in Zelda.                                                          |
| Power-up used       | A whoosh or activation sound, quick and punchy.                                                                   |
| Sabotage received   | A comedic "bonk" or descending tone. Should feel funny, not punishing.                                            |
| Bonus star awarded  | A celebratory short fanfare, like winning a mini-game.                                                            |
| Race start (Monday) | A starting pistol or countdown beep sequence.                                                                     |
| Race end (Sunday)   | A finish-line fanfare, slightly longer (1-2 seconds).                                                             |

### Sound Sources

Use royalty-free 8-bit/chiptune sound packs. Good sources: freesound.org (filter by chiptune), SFXR/JSFXR (generate custom retro sounds), or Kenney.nl game assets.

### Implementation

- Sounds play on user-initiated actions only (never autoplay on page load)
- Global mute toggle stored in localStorage
- Volume should be set low by default (0.3 out of 1.0)
- Use the Web Audio API or Howler.js for reliable playback

---

## Component Reference

### Task Card

```
┌─────────────────────────────────────────┐
│  ⬜  Write essay outline          🔴 3  │
│                                         │
└─────────────────────────────────────────┘
```

- Left: checkbox (emoji-style)
- Center: task title (primary text)
- Right: difficulty badge (colored dot + point value)
- Border: 1px light gray
- On complete: checkbox becomes ✅, text gets strikethrough, row fades to 60% opacity

### Leaderboard Row

```
┌─────────────────────────────────────────┐
│  1.  🔴 F  Felix       850 pts   5/7 🔥│
└─────────────────────────────────────────┘
```

- Rank number (bold)
- Player color circle with initial
- Display name
- Point total (bold, large)
- Task progress (secondary text)
- Streak fire if active

### Event Card

```
┌─────────────────────────────────────────┐
│              🎲                         │
│       DOUBLE OR NOTHING                 │
│                                         │
│   Pick one task. Finish it in 24hrs     │
│   for 2x points. Fail and lose it all. │
│                                         │
│          [ Choose a Task ]              │
└─────────────────────────────────────────┘
```

- Centered layout
- Large emoji at top
- Event name in monospace, uppercase
- Description in body text
- Action button at bottom

### Power-Up Badge

```
  ┌──────────┐
  │ 🛡️ Shield │
  └──────────┘
```

- Small pill-shaped badge
- Emoji + name
- Player-color border when held
- Tap/click to activate (with confirmation)

---

## Summary

Sprint Party's visual identity in three words: **clean, colorful, clicky.**

Every design decision should pass this test: "Would this feel at home on neal.fun?" If it feels like it belongs in a Figma design system showcase or a Y Combinator demo day, strip it back. If it feels like something you'd send to a friend and say "check this out," ship it.
