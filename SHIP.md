# Sprint Party — Ship Checklist

## Priority 1 — Broken Game Mechanics

- [ ] **Reroll power-up does nothing** — `src/components/PowerUpModal.jsx:271–272`
  - On activate: set current active event to `resolved: true`, pick a new event of a different type, upsert into `rooms.events`

- [ ] **Sprint Boost has no effect on task completion** — `src/components/TaskList.jsx` (absent)
  - In `markComplete`: check `player.sprint_boost_remaining > 0`, add +50 pts, decrement `sprint_boost_remaining` in same DB update

- [ ] **Team Up bonus points never awarded** — no file, entirely absent
  - In `Room.jsx` realtime UPDATE handler: when `team_up` event transitions active → expired, compare team task counts, update winning team's `points`

- [ ] **Bounty steal/survival points never awarded** — no file, entirely absent
  - Same pattern as Team Up: on expiry, compare target vs challengers' completed counts, award 200-pt steal or 300-pt survival bonus

---

## Priority 2 — Security

- [ ] **Enable RLS with Clerk JWT integration**
  - Clerk dashboard: create JWT template named `supabase`, set audience to Supabase project URL
  - Supabase dashboard: Auth → JWT Settings → set JWKS URL to Clerk's JWKS endpoint
  - `src/lib/supabase.js`: replace singleton with `useSupabaseClient()` hook that injects `Authorization: Bearer <clerk-token>` header
  - Update all call sites in `Room.jsx`, `Dashboard.jsx`, `PowerUpModal.jsx`, `TaskList.jsx`
  - Re-enable RLS: `ALTER TABLE rooms ENABLE ROW LEVEL SECURITY; ALTER TABLE players ENABLE ROW LEVEL SECURITY;`
  - Write policies using `auth.jwt() ->> 'sub'` as Clerk user ID:
    - `rooms SELECT`: user is in `players[]` array
    - `rooms INSERT`: `created_by = user_id`
    - `rooms UPDATE`: `created_by = user_id` (creator only)
    - `players SELECT`: user is in the same room
    - `players INSERT/UPDATE`: `user_id = auth user` (own row only)
  - Move cross-player power-up writes (freeze, sabotage, point_heist) to Edge Function (uses service role key, bypasses RLS safely)

- [ ] **Edge Function env var name mismatch** — `supabase/functions/.env` vs `fire-events/index.ts:162`
  - Rename `SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_ROLE_KEY` in `.env` and Supabase project secrets

- [ ] **Cron secret check skips auth when secret unset** — `supabase/functions/fire-events/index.ts:150–153`
  - Change `if (cronSecret && ...)` → `if (!cronSecret || ...)` to reject requests when secret is missing

- [ ] **No input limits on task creation** — `src/components/TaskList.jsx:addTask`
  - Cap title at 200 chars
  - Cap tasks per player at 20
  - Validate difficulty is in `[1, 2, 3]`

---

## Priority 3 — Missing End Screen

- [ ] **BONUS_AWARDS never computed or shown**
  - Write `computeBonusAwards(allPlayers)` in `src/lib/gameLogic.js` (data is already defined at lines 122–153)
  - Call it in `Room.jsx` when `room.status === "finished"`
  - Render award badges in `WinnerReveal.jsx` alongside the podium

---

## Priority 4 — Production Hardening

- [ ] **No security headers** — create `vercel.json` at project root
  ```json
  {
    "headers": [{ "source": "/(.*)", "headers": [
      { "key": "X-Frame-Options", "value": "DENY" },
      { "key": "X-Content-Type-Options", "value": "nosniff" },
      { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
    ]}]
  }
  ```

- [ ] **`dist/` committed to repo** — add `dist/` to `.gitignore`, run `git rm -r --cached dist/`

- [ ] **Daily power-up grant bypassed via localStorage** — `src/pages/Room.jsx:130–143`
  - Write `last_daily_powerup` timestamp to `players` row, check it server-side before granting

---

## Priority 5 — Cleanup

- [ ] Remove dead export `calcBasePoints` — `src/lib/gameLogic.js:181–185` (unused, has operator precedence bug)
- [ ] Remove unused `VITE_SUPABASE_PUBLISHABLE_KEY` from `.env`
- [ ] Fix `maxPlayers` hardcoded to `8` in `Dashboard.jsx` create-room insert — design doc says `6`

---

## Deferred (post-ship)

- Lifetime stats on Dashboard (requires schema changes)
- Monday task lock-in ceremony
- Sound effects
- Mobile responsiveness
