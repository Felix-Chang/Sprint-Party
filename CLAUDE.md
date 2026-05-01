# Productivity Race — Design Document

## What This Is

A browser-based competitive productivity game. Players submit their real tasks for the week, race to complete them, and deal with Mario Party-style events and power-ups along the way. Each "race" runs Monday through Sunday. Players work asynchronously on their own schedules but interact through a shared game board with daily check-ins, events, and a live leaderboard.

Think Mario Party meets a to-do list. The tasks are real. The competition is real. The chaos is designed.

---

## Core Loop

1. **Monday: Race Starts** — All players submit their tasks for the week and self-rate each task's difficulty.
2. **Tuesday–Saturday: The Grind** — Players complete tasks, check in daily, trigger/receive events, and use power-ups.
3. **Sunday Night: Race Ends** — Final scores tallied. Bonus stars awarded. Winner declared.

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
  bonus_stars: jsonb,
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
  avatar: text (emoji),
  tasks: jsonb (Task[]),
  points: integer,
  streak: integer,
  streak_multiplier: numeric,
  power_ups: jsonb (string[]),
  check_ins: jsonb (ISO timestamp string[]),
  bonus_stars_earned: jsonb (string[])
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
- Epic (500 pts) — major deliverables, multi-day grind

### Completion Bonuses
- **Speed Bonus (+100 pt):** Finish a task within 24 hours of adding it.
- **Front-loader (+200 pts):** Complete your hardest task before Wednesday midnight.
- **Clean Sweep (+500 pts):** Finish ALL submitted tasks before Sunday.
- **Early Bird (+300 pts):** Finish all tasks before Saturday.

### Streak Multiplier
Consecutive daily check-ins multiply ALL points earned:
- 3-day streak: 1.2x
- 5-day streak: 1.4x
- 7-day streak (full week): 1.5x

A check-in is just confirming you're active for the day. One button press. Low friction.

---

## Event System

Events inject randomness and keep the game dynamic. They fire on **Tuesday, Thursday, and Saturday** (3 fixed event days per week). Each event day, one event is randomly selected from the pool and applied.

### Event Pool

| Event | Description |
|---|---|
| **Task Swap** | Two random players each swap one incomplete task with each other. Swapped tasks keep their original difficulty. |
| **Double or Nothing** | Each player picks one incomplete task. Finish it within 24 hours for 2x points. Fail and lose the base points entirely. |
| **Sabotage** | Each player can assign a small bonus task to one other player (e.g., "organize your desktop," "do 20 pushups," "clean your desk"). Worth 1 point if completed. |
| **Mystery Bonus** | A hidden scoring condition is revealed at end of week. Examples: "most tasks completed on a single day," "first to finish a task after the event fired," "completed a task between midnight and 6am." Worth +5 pts. |
| **Point Heist** | Each player can steal 2 points from any other player. Shields block this. |
| **Freeze** | Pick one opponent. Their next task completion awards 0 points. |

### Power-Ups
Players earn power-ups through gameplay (e.g., completing 3 tasks in one day, checking in 3 days straight). Each player can hold a max of 2 power-ups at a time.

| Power-Up | Effect |
|---|---|
| **Shield** | Block the next sabotage, point heist, or freeze targeting you. Auto-activates. |
| **Double Down** | Apply 2x multiplier to your next completed task. |
| **Reroll** | When an event fires, force a reroll to a different event. Usable once per week. |
| **Ghost Mode** | Hide your progress from the leaderboard for 24 hours. Other players can't see your score or completed tasks. |

---

## Comeback Mechanics

To prevent players from giving up mid-week:

- **Underdog Boost:** Player in last place at Thursday midnight gets a free power-up (random).
- **Clutch Bonus (+3 pts):** Complete 3 or more tasks on the final day (Sunday).
- **Bonus Stars (end of week):** Awarded after the race ends, just like Mario Party. Each worth +3 pts.
  - **Grinder:** Most total tasks completed.
  - **Consistent:** Checked in every single day.
  - **Overachiever:** Completed more tasks than originally submitted (added tasks mid-week and finished them).
  - **Clutch King:** Most points earned on the final day.
  - **Saboteur:** Successfully sabotaged the most opponents.

Bonus stars can flip the final standings. This is intentional.

---

## Pages and UI

### 1. Landing / Auth
- Sign in via Google OAuth (Clerk). One button, redirects through `/sso-callback`.
- Clean, game-themed aesthetic. Not corporate. Think bright, bold, competitive energy.

### 2. Dashboard (Home)
- Active races you're in.
- Quick stats: current streak, lifetime wins, total tasks completed.
- Create or join a room (via invite code).

### 3. Room Lobby
- Shows all players who've joined.
- Room creator can start the race when ready.
- Share invite link/code.

### 4. Race Setup (Monday)
- Each player adds their tasks for the week.
- For each task: title + difficulty selector (1/2/3/5 with labels: Easy/Medium/Hard/Epic).
- Confirm and lock in. Players can add more tasks mid-week but can't remove submitted ones.

### 5. Game Board (the main view during an active race)
- **Leaderboard** showing all players, their points, streak status, and completion progress (e.g., "4/7 tasks done").
- **Your Task List** with checkboxes to mark complete.
- **Event Feed** showing recent events and their outcomes.
- **Power-Up Inventory** showing your held power-ups with buttons to activate.
- **Daily Check-In Button** (prominent, one tap).

### 6. End of Week Summary
- Final standings with points breakdown.
- Bonus stars awarded with animations.
- Final leaderboard after bonus stars applied.
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
- Daily check-in with streak tracking
- End of week summary with final standings

**Phase 2 — The Fun Stuff:**
- Event system (Tuesday/Thursday/Saturday events)
- Power-ups (earn and use)
- Bonus stars at end of week
- Comeback mechanics (underdog boost, clutch bonus)
- Notifications/toasts for events and rival activity

**Phase 3 — Polish:**
- Animations (task completion, leaderboard shifts, bonus star reveals)
- Sound effects
- Persistent player profiles with lifetime stats
- Room history and win/loss records
- Mobile responsiveness

---

## Notes

- Players should be able to add tasks mid-week (life happens) but not delete submitted ones (no gaming the system).
- Task difficulty is self-assessed and honor-based. This works in friend groups. If you want to cheat, you're only cheating yourself and your friends will roast you.
- Room size capped at 6 players to keep the leaderboard tight and events impactful.
- The streak multiplier applies to your total points at the end of the week, not per-task. This makes the final day check-in actually matter.
- All times should be in the player's local timezone.
