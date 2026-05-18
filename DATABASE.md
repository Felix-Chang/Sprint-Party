# Database Setup — Sprint Party

## Overview

Sprint Party uses [Supabase](https://supabase.com) (Postgres + Realtime) as its backend. Authentication is handled by Clerk. The Supabase client (`src/lib/supabase.js`) injects the user's Clerk-issued JWT via a custom `accessToken()` callback registered by `setGetToken()`. Supabase's `auth.jwt()->>'sub'` returns the Clerk user ID string (`user_xxxx`), which all RLS policies use for identity checks.

Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.

---

## Tables

### `rooms`

Represents a game room/race session.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `name` | text | Display name for the room (max 60 chars) |
| `code` | text | Unique 6-char invite code (uppercase alphanumeric) |
| `created_by` | text | Clerk user ID of the creator |
| `players` | text[] | Ordered array of Clerk user IDs; join order determines player color index |
| `status` | text | `"lobby"` \| `"active"` \| `"finished"` |
| `week_start` | timestamptz | Race start time — set to `now()` when the creator starts the race |
| `week_end` | timestamptz | Set to `now() + raceDuration days` at race start |
| `events` | jsonb | `Event[]` — fired game events (see schema below) |
| `settings` | jsonb | Room config (see schema below) |
| `created_at` | timestamptz | Auto-set on insert |

### `players`

One row per player per room (composite PK: `user_id` + `room_id`).

| Column | Type | Notes |
|---|---|---|
| `user_id` | text | Clerk user ID |
| `room_id` | uuid | FK → `rooms.id` |
| `display_name` | text | Pulled from Clerk on join (max 15 chars) |
| `tasks` | jsonb | `Task[]` — see schema below |
| `points` | integer | **Bonus/event points only.** Base task points are calculated on the fly via `calcPoints()`. Never read this field alone as the player's score. |
| `power_ups` | jsonb | Mixed string/marker array — see power-up encoding below |
| `ghost_mode_until` | timestamptz | Set when Incognito (`ghost_mode`) power-up is activated; `isGhostMode(player)` checks this field |

---

## JSONB Schemas

### `rooms.settings`

```json
{
  "maxPlayers": 8,
  "eventsEnabled": true,
  "powerUpsEnabled": true,
  "raceDuration": 7
}
```

`raceDuration` options: 1, 3, 5, 7, 14 (days).

### `rooms.events` — `Event[]`

```json
{
  "id": "uuid-string",
  "type": "task_swap | mystery_bonus | team_up | blitz | bounty",
  "triggeredAt": "ISO 8601 string",
  "targetPlayers": ["clerk-user-id"],
  "resolved": false,
  "data": { ... }
}
```

Per-type `data` shapes:

| Type | `data` fields |
|---|---|
| `task_swap` | `choices: {}`, `expiresAt: ISO string` (now + 24h) |
| `mystery_bonus` | `difficulty: 1\|2\|3`, `bonusPoints: 100`, `expiresAt: ISO string` (end of UTC day) |
| `team_up` | `teams: { magenta: [user_id, ...], lime: [user_id, ...] }`, `bonusPoints: 300`, `expiresAt: ISO string` |
| `blitz` | `bonusPoints: 50`, `expiresAt: ISO string` |
| `bounty` | `targetPlayerId: clerk-user-id`, `stealPoints: 200`, `bonusPoints: 300`, `expiresAt: ISO string` |

All events include a `note: string` field with a human-readable description.

### `players.tasks` — `Task[]`

```json
{
  "id": "uuid",
  "title": "string",
  "difficulty": 1 | 2 | 3,
  "completed": false,
  "completedAt": "ISO string | null",
  "addedAt": "ISO string",
  "originPlayerId": "clerk-user-id",
  "bonusApplied": "string | null",
  "taskConstraint": "easy_first | null",
  "sabotagedBy": "clerk-user-id | null"
}
```

Difficulty → points: `1` = 100, `2` = 200, `3` = 300.

`taskConstraint: "easy_first"` and `sabotagedBy` are written by the sabotage power-up. `Room.jsx` reads these to enforce the constraint before allowing other completions.

### `players.power_ups` — mixed array

Each element is one of two forms:

**Plain string** (a held usable power-up):
```
"shield" | "freeze" | "double_or_nothing" | "ghost_mode" | "sabotage" | "point_heist" | "sprint_boost"
```

**JSON-encoded marker object** (an effect placed on this player by another):
```json
{"type": "freeze", "sourceId": "clerk-user-id"}
```

`ghost_mode` is the exception — activating it does NOT add an entry to `power_ups`. Instead it sets `ghost_mode_until` on the player row directly.

---

## SQL Setup

Run once in the Supabase SQL Editor:

```sql
-- Enable Realtime for live leaderboard and event feed
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;

-- GIN index for efficient .contains() queries on rooms.players (text[])
create index if not exists rooms_players_gin on rooms using gin (players);
```

### RLS Policies

RLS is **enabled** on both tables. All policies use `auth.jwt()->>'sub'` (the Clerk user ID) rather than `auth.uid()`, since Supabase Auth is not used.

```sql
-- rooms
create policy "rooms_select" on rooms for select to authenticated using (true);
create policy "rooms_insert" on rooms for insert to authenticated
  with check (auth.jwt()->>'sub' = created_by);
create policy "rooms_update" on rooms for update to authenticated
  using (auth.jwt()->>'sub' = any(players));

-- players
create policy "players_select" on players for select to authenticated
  using (exists (
    select 1 from rooms r where r.id = room_id and auth.jwt()->>'sub' = any(r.players)
  ));
create policy "players_insert" on players for insert to authenticated
  with check (auth.jwt()->>'sub' = user_id);
create policy "players_update" on players for update to authenticated
  using (exists (
    select 1 from rooms r where r.id = room_id and auth.jwt()->>'sub' = any(r.players)
  ));
```

The `players_update` policy is intentionally permissive for room members — this allows cross-player power-up effects (freeze, sabotage) to write to another player's row without a service-role key.

---

## Realtime

`Room.jsx` subscribes to `postgres_changes` on both tables filtered by room:
- `rooms` filtered by `id=eq.{roomId}`
- `players` filtered by `room_id=eq.{roomId}`

Any room or player update triggers a re-fetch and re-render of the game board.

---

## Edge Function: `fire-events`

- **Location:** `supabase/functions/fire-events/index.ts`
- **Trigger:** Scheduled cron; requires `Bearer CRON_SECRET` header
- **Client:** Uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- **Reads:** `rooms` — selects active rooms with `eventsEnabled: true`
- **Writes:** Appends a new `Event` to `rooms.events`
- **Firing logic:** Fires on odd-numbered days elapsed since `week_start` (days 1, 3, 5, …), at most once per calendar day per room
- **Event pool:** `task_swap`, `mystery_bonus`, `team_up`, `blitz`, `bounty`
