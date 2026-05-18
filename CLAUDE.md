# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

See also: @DATABASE.md for the full schema, JSONB shapes, RLS policies, and edge function details. @ART-DIRECTION.md for the visual design system, color palette, typography, animation curves, and component patterns.

## Commands

```bash
npm run dev       # start Vite dev server
npm run build     # production build
npm run lint      # ESLint
npm run preview   # preview production build locally
```

No test suite exists yet.

For Supabase edge functions (Deno, in `supabase/functions/`), deploy with:
```bash
supabase functions deploy fire-events
```

## Architecture

**Single-page React 19 app** with no SSR. Four routes: `/` (Landing), `/dashboard`, `/room/:roomId`, `/sso-callback`.

### Auth & identity
Clerk owns all auth state. Use `useUser()` / `useAuth()` from `@clerk/clerk-react`. Clerk user IDs are the primary key for players in Supabase — never generate your own user IDs.

### Data layer
All reads and writes go through the singleton `supabase` client (`src/lib/supabase.js`). No ORM or abstraction layer — direct Supabase SDK calls from components and pages. Real-time updates use Supabase Realtime channels subscribed in `Room.jsx`.

Two tables:
- **`rooms`** — race config, status, events (JSONB array), settings
- **`players`** — per-user-per-room state: tasks (JSONB array), points, power_ups (JSONB array)

`points` in the players table stores only **bonus/event points**. Base task points are calculated on the fly via `calcPoints()` in `gameLogic.js`, which adds task completion points on top of `player.points`. Never read `player.points` alone as the player's score.

### Game logic
`src/lib/gameLogic.js` is the single source of truth for:
- `DIFFICULTY` — point values per difficulty level
- `POWER_UPS` / `EVENTS` — canonical definitions with metadata
- `calcPoints(player)` — the authoritative scoring function
- `isEventActive(event)` — checks `event.resolved` and `event.data.expiresAt`
- `isPlayerFrozen(player)` / `isGhostMode(player)` — power-up state checks
- `calcBasePoints(player)` — task completion points only (excludes `player.points` bonus)
- `computeRaceBounds(raceDuration)` — returns `{ raceStart, raceEnd }` derived from duration
- `getPlayerColor(userId, roomPlayers)` — maps a userId to a deterministic display color
- `countUsablePowerUps(powerUpsArray)` — counts held power-ups excluding active freeze markers
- `MAX_POWER_UPS` — constant (2); maximum power-ups a player can hold

### State management
Zustand (`src/store/useGameStore.js`) holds only three things: `room`, `playerData`, and the global `toast`. All other state lives in React `useState` inside components. Auth state always comes from Clerk hooks, never from Zustand.

### Power-up encoding
Plain power-up keys (`"shield"`, `"sabotage"`, etc.) are stored as strings in the `power_ups` array. Active freeze markers are stored as JSON-stringified objects `{"type":"freeze","sourceId":"..."}` in the same array. Ghost mode is **not** stored in `power_ups` — it uses a dedicated `ghost_mode_until` timestamp column on the player row. `isGhostMode(player)` checks that field, not the power-ups array.

`src/lib/sounds.js` exports sound helpers: `playStart`, `playPop`, `playScribble`, `playSuccess`, `playSlots`, `playWhoosh`, `playError`.

### Event lifecycle
Events are fired by the `fire-events` Supabase edge function (scheduled cron). Each event is appended to `rooms.events` (JSONB array). Resolution logic runs client-side in `Room.jsx` — the room creator's browser detects expired events and writes `resolved: true` back to Supabase, then applies point changes.

### Env vars required
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_CLERK_PUBLISHABLE_KEY
```
Edge function needs `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and optionally `CRON_SECRET`.

---

# Productivity Race — Design Document

## What This Is

A browser-based competitive productivity game called Sprint Party. Players submit their real tasks for the week, race to complete them, and deal with Mario Party-style events and power-ups along the way. Each "race" runs Monday through Sunday. Players work asynchronously on their own schedules but interact through a shared game board with events, power-ups, and a live leaderboard.

Think Mario Party meets a to-do list. The tasks are real. The competition is real. The chaos is designed.

---

## Core Loop

1. **Race Starts** — All players submit their tasks for the week and self-rate each task's difficulty.
2. **The Grind** — Players complete tasks, trigger/receive events, and use power-ups.
3. **Race Ends** — Final scores tallied. Bonus awards. Winner declared.

---

## Tech Stack

- **Frontend:** React 19 (Vite), Tailwind CSS v4
- **Auth:** Clerk (`@clerk/clerk-react`) — Google OAuth, auth state owned by Clerk hooks
- **Backend/Realtime:** Supabase (`@supabase/supabase-js`) — Postgres + Realtime channels
- **Hosting:** Vercel
- **State Management:** Zustand — room, playerData, toast only (auth state via Clerk)

This should be a single-page app. No SSR needed. Real-time updates are important for the leaderboard and events.

---

## Data Model

Data lives in two Supabase (Postgres) tables. Timestamps are ISO 8601 strings. User IDs are Clerk user IDs.

### `rooms` table

```
{
  id: uuid (PK, auto-generated),
  name: text,
  code: text (unique, 6-char invite code),
  created_by: text (Clerk user id),
  players: text[] (array of Clerk user ids),
  status: "lobby" | "active" | "finished",
  week_start: timestamptz (Monday 00:00),
  week_end: timestamptz (Sunday 23:59),
  events: jsonb (Event[]),
  settings: jsonb {
    maxPlayers: number (default 6),
    eventsEnabled: boolean,
    powerUpsEnabled: boolean
  },
  created_at: timestamptz
}
```

### `players` table (PK: user_id + room_id)

```
{
  user_id: text (Clerk user id),
  room_id: uuid (FK → rooms.id),
  display_name: text,
  tasks: jsonb (Task[]),
  points: integer,
  power_ups: jsonb (string[])
}
```

### Task (stored as JSONB in `players.tasks`)

```
{
  id: string (UUID),
  title: string,
  difficulty: 1 | 2 | 3,
  completed: boolean,
  completedAt: ISO string | null,
  addedAt: ISO string,
  originPlayerId: string (Clerk user id, for swapped tasks),
  bonusApplied: string | null
}
```

### Event (stored as JSONB in `rooms.events`)

```
{
  id: string,
  type: string (see Event System below),
  triggeredAt: ISO string,
  targetPlayers: string[] (Clerk user ids),
  resolved: boolean,
  data: object (event-specific payload)
}
```

---

## Points System

### Base Points

Each completed task awards points equal to its difficulty rating:

- Easy (100 pts) — quick wins, takes under 30 min
- Medium (200 pts) — standard tasks, an hour or two
- Hard (300 pts) — significant effort, half a day

### Completion Bonuses

- **Speed Bonus (+100 pt):** Finish a task within 24 hours of adding it.
- **Front-loader (+200 pts):** Complete your hardest task before Wednesday midnight.
- **Clean Sweep (+500 pts):** Finish ALL submitted tasks before Sunday.
- **Early Bird (+300 pts):** Finish all tasks before Saturday.

---

## Event System

Events inject randomness and keep the game dynamic. They fire on odd-numbered days from the race start (handled by the `fire-events` edge function cron). Each event day, one event is randomly selected from the pool and applied.

### Event Pool

| Event             | Description                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| **Task Swap**     | Two random players each swap one incomplete task with each other. Swapped tasks keep their original difficulty.                                                                                                     |
| **Mystery Bonus** | A random difficulty tier is secretly chosen; completing a task of that tier earns +100 pts bonus. Revealed at resolution.                                                                                           |
| **Bounty**        | A random player is the target. Finish more tasks than them today to steal 200 pts. If they survive, they earn +300 pts.                                                                                             |
| **Blitz**         | For the rest of the day, every completed task in the lobby earns +50 bonus pts.                                                                                                                                     |
| **Team Up**       | The lobby splits into two teams. The team that completes the most tasks by end of day earns 300 pts per member.                                                                                                     |

### Power-Ups

Each player receives a random power-up once per day (midnight UTC). Max 2 power-ups at a time — if a player holds 2, the daily power-up doesn't award until they use one.

| Power-Up               | Key                  | Effect                                                                                                      |
| ---------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Shield**             | `shield`             | Block the next sabotage, point heist, or freeze targeting you. Auto-activates.                              |
| **Double or Nothing**  | `double_or_nothing`  | Double a task's reward points. Must complete within time limit (Easy 1hr / Medium 2hr / Hard 4hr) or points are deducted. |
| **Incognito**          | `ghost_mode`         | Hide your score from the leaderboard for 12 hours. Stored as `ghost_mode_until` timestamp on player row, not in `power_ups` array. |
| **Sabotage**           | `sabotage`           | Pick an opponent's Easy task. They must finish it before completing any other task.                         |
| **Freeze**             | `freeze`             | Pick one opponent. Their next task completion awards 0 points. Stored as a JSON marker in `power_ups` array.|
| **Point Heist**        | `point_heist`        | Steal 150 pts from a chosen opponent. Shield blocks it.                                                     |
| **Sprint Boost**       | `sprint_boost`       | Your next 3 task completions earn +50 bonus pts each.                                                       |

---

## Pages and UI

### 1. Landing / Auth

- Sign in via Google OAuth (Clerk). One button, redirects through `/sso-callback`.
- Clean, game-themed aesthetic. Not corporate. Think bright, bold, competitive energy.

### 2. Dashboard (Home)

- Active races you're in.
- Quick stats: lifetime wins, total tasks completed.
- Create or join a room (via invite code).

### 3. Room Lobby

- Shows all players who've joined.
- Room creator can start the race when ready.
- Share invite link/code.

### 4. Race Setup

- Each player adds their tasks for the week.
- For each task: title + difficulty selector (1/2/3 with labels: Easy/Medium/Hard).
- Confirm and lock in. Players can add more tasks mid-week but can't remove submitted ones.

### 5. Game Board (the main view during an active race)

- **Leaderboard** showing all players, their points, and completion progress (e.g., "4/7 tasks done").
- **Your Task List** with checkboxes to mark complete.
- **Event Feed** showing recent events and their outcomes.
- **Power-Up Inventory** showing your held power-ups with buttons to activate.

### 6. End of Week Summary

- Final standings with points breakdown.
- Option to start a new race in the same room.

---

## Design Direction

This should feel like a **game**, not a productivity app. Visual references: Mario Party's board UI, Duolingo's reward animations, Habitica's RPG layer. Use bold colors, playful typography, satisfying animations on task completion and point gains. The leaderboard should feel alive (real-time updates, position change animations). Events should feel like they "happen to you" with notification-style popups and sound cues.

Avoid: corporate SaaS aesthetic, muted colors, Notion/Linear vibes. This is meant to be fun.

---

## MVP Scope (Build This First)

**Phase 1 — Core Loop:**

- Auth (Clerk Google sign-in)
- Create/join room with invite code
- Submit tasks with difficulty ratings
- Mark tasks complete, earn base points
- Live leaderboard
- End of week summary with final standings

**Phase 2 — The Fun Stuff:**

- Event system (fires on odd-numbered days from race start)
- Power-ups (earn and use)
- Comeback mechanics (underdog boost, clutch bonus)
- Notifications/toasts for events and rival activity

**Phase 3 — Polish:**

- Animations (task completion, leaderboard shifts)
- Sound effects
- Persistent player profiles with lifetime stats
- Room history and win/loss records
- Mobile responsiveness

---

## Notes

- Players should be able to add tasks mid-week (life happens) but not delete submitted ones (no gaming the system).
- Task difficulty is self-assessed and honor-based. This works in friend groups. If you want to cheat, you're only cheating yourself and your friends will roast you.
- Room size capped at 6 players to keep the leaderboard tight and events impactful.
- All times should be in the player's local timezone.
