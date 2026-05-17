# Database Setup — Sprint Party

## Overview

Sprint Party uses [Supabase](https://supabase.com) (Postgres + Realtime) as its backend. The app connects via the anon key — no Supabase Auth is used. Authentication is handled entirely by Clerk, and Clerk user IDs are stored as plain `text` in both tables.

---

## Tables

### `rooms`

Represents a game room/race session.

| Column        | Type        | Notes                                            |
| ------------- | ----------- | ------------------------------------------------ |
| `id`          | uuid        | PK, auto-generated                               |
| `name`        | text        | Display name for the room                        |
| `code`        | text        | Unique 6-char invite code                        |
| `created_by`  | text        | Clerk user ID of the creator                     |
| `players`     | text[]      | Array of Clerk user IDs in the room              |
| `status`      | text        | `"lobby"` \| `"active"` \| `"finished"`          |
| `week_start`  | timestamptz | Monday 00:00 of the race week                    |
| `week_end`    | timestamptz | Sunday 23:59 of the race week                    |
| `events`      | jsonb       | `Event[]` — fired events for the week            |
| `settings`    | jsonb       | `{ maxPlayers, eventsEnabled, powerUpsEnabled }` |
| `created_at`  | timestamptz | Auto-set on insert                               |

### `players`

One row per player per room (composite PK: `user_id` + `room_id`).

| Column               | Type    | Notes                                 |
| -------------------- | ------- | ------------------------------------- |
| `user_id`            | text    | Clerk user ID                         |
| `room_id`            | uuid    | FK → `rooms.id`                       |
| `display_name`       | text    | Pulled from Clerk on join             |
| `tasks`              | jsonb   | `Task[]` — see schema below           |
| `points`             | integer | Current point total                   |
| `power_ups`          | jsonb   | `string[]` of active power-up names   |

---

## JSONB Schemas

### Task (stored in `players.tasks`)

```json
{
  "id": "uuid",
  "title": "string",
  "difficulty": 1 | 2 | 3,
  "completed": false,
  "completedAt": "ISO string | null",
  "addedAt": "ISO string",
  "originPlayerId": "clerk-user-id",
  "bonusApplied": "string | null"
}
```

Difficulty maps to points: `1` = 100, `2` = 200, `3` = 300.

### Event (stored in `rooms.events`)

```json
{
  "id": "string",
  "type": "task_swap | double_or_nothing | sabotage | mystery_bonus | point_heist | freeze",
  "triggeredAt": "ISO string",
  "targetPlayers": ["clerk-user-id"],
  "resolved": false,
  "data": {}
}
```

---

## SQL Setup

Run this once in the Supabase SQL Editor after creating the tables:

```sql
-- Disable RLS so the anon key can read/write
-- (app uses Clerk for auth, not Supabase Auth — no JWT policies configured)
alter table rooms disable row level security;
alter table players disable row level security;

-- Enable Realtime for live leaderboard and event feed
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- GIN index for efficient .contains() queries on rooms.players (text[])
create index if not exists rooms_players_gin on rooms using gin (players);
```

### Why each step

- **RLS disabled** — Supabase enables RLS by default. Without policies the anon key returns 0 rows on every query with no error, which is very hard to debug. Since this app uses Clerk (not Supabase Auth), there are no JWT claims for RLS policies to act on.
- **Realtime** — `Room.jsx` subscribes to `postgres_changes` on both tables for live leaderboard and event feed updates. Tables must be added to the `supabase_realtime` publication for this to work.
- **GIN index** — `Dashboard.jsx` queries rooms using `.contains('players', [userId])` on a `text[]` column. Without a GIN index Postgres does a full table scan.

---

## Realtime

Realtime subscriptions are set up in `src/pages/Room.jsx`. The app subscribes to `postgres_changes` on both `rooms` and `players` filtered by `room_id`. Any update to the room (status change, event fired) or any player (task completed, points update) triggers a re-fetch and re-render of the game board.

---

## Auth & Security Note

The app uses the Supabase **anon key** for all database access. This key is safe to expose in the browser as long as RLS policies are in place — but for this MVP, RLS is disabled. This is acceptable for a closed friend-group game. If opened to the public, RLS policies should be added and a Clerk → Supabase JWT template configured so policies can reference the authenticated user's Clerk ID.
