# Productivity Race — Design Document

## What This Is

A browser-based competitive productivity game called Sprint Party. Players submit their real tasks for the week, race to complete them, and deal with Mario Party-style events and power-ups along the way. Each "race" runs Monday through Sunday. Players work asynchronously on their own schedules but interact through a shared game board with events, power-ups, and a live leaderboard.

Think Mario Party meets a to-do list. The tasks are real. The competition is real. The chaos is designed.

---

## Core Loop

1. **Monday: Race Starts** — All players submit their tasks for the week and self-rate each task's difficulty.
2. **Tuesday–Saturday: The Grind** — Players complete tasks, trigger/receive events, and use power-ups.
3. **Sunday Night: Race Ends** — Final scores tallied. Bonus awards. Winner declared.

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
  difficulty: 1 | 2 | 3 | 5,
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

Events inject randomness and keep the game dynamic. They fire on **Tuesday, Thursday, and Saturday** (3 fixed event days per week). Each event day, one event is randomly selected from the pool and applied.

### Event Pool

| Event             | Description                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --- |
| **Task Swap**     | Two random players each swap one incomplete task with each other. Swapped tasks keep their original difficulty.                                                                                                     |     |     |
| **Mystery Bonus** | A hidden scoring condition is revealed at end of week. Examples: "most tasks completed on a single day," "first to finish a task after the event fired," "completed a task between midnight and 6am." Worth +5 pts. |
| **Point Heist**   | Each player can steal 2 points from any other player. Shields block this.                                                                                                                                           |
| **Bounty**        | A random player is the target. Finish more tasks than them today to steal 200 pts. If they survive, they earn +300 pts.                                                                                             |
| **Blitz**         | For the rest of the day, every completed task in the lobby earns +50 bonus pts.                                                                                                                                     |
| **Team Up**       | The lobby splits into two teams. The team that completes the most tasks by end of day earns 300 pts per member.                                                                                                     |

### Power-Ups

Each player receives a random power-up once per day (midnight UTC). Max 2 power-ups at a time — if a player holds 2, the daily power-up doesn't award until they use one.

| Power-Up        | Effect                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| **Shield**      | Block the next sabotage, point heist, or freeze targeting you. Auto-activates.                               |
| **Double Down** | Double a task's reward points. Complete task within time limit, or else those points are deducted.           |
| **Incognito**   | Hide your progress from the leaderboard for 24 hours. Other players can't see your score or completed tasks. |
| **Sabotage**    | Pick one of an opponent's Easy tasks. They must finish it before completing any other task.                  |
| **Freeze**      | Pick one opponent. Their next task completion awards 0 points.                                               |

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
- For each task: title + difficulty selector (1/2/3/5 with labels: Easy/Medium/Hard/Epic).
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

- Event system (Tuesday/Thursday/Saturday events)
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
