-- Enable Row Level Security on both tables
alter table rooms enable row level security;
alter table players enable row level security;

-- Clerk user ID comes from the JWT 'sub' claim as a string (e.g. "user_xxxx").
-- auth.uid() returns UUID type which won't match, so use auth.jwt()->>'sub' throughout.

-- ── ROOMS ─────────────────────────────────────────────────────────────────────

-- Any signed-in user can read rooms (needed to look up a room by invite code)
create policy "rooms_select" on rooms
  for select
  to authenticated
  using (true);

-- Only the creator can insert a room
create policy "rooms_insert" on rooms
  for insert
  to authenticated
  with check ((auth.jwt()->>'sub') = created_by);

-- Room members can update room state (event resolution, joins, status changes)
-- startRace / resetRace are also guarded in application code as defense-in-depth
create policy "rooms_update" on rooms
  for update
  to authenticated
  using ((auth.jwt()->>'sub') = any(players));

-- ── PLAYERS ───────────────────────────────────────────────────────────────────

-- Users can read all players in rooms they belong to
create policy "players_select" on players
  for select
  to authenticated
  using (
    exists (
      select 1 from rooms r
      where r.id = room_id
        and (auth.jwt()->>'sub') = any(r.players)
    )
  );

-- Users can only insert their own player row
create policy "players_insert" on players
  for insert
  to authenticated
  with check ((auth.jwt()->>'sub') = user_id);

-- Any room member can update any player row in their room.
-- Intentionally permissive so power-up effects (freeze, sabotage, heist)
-- and event resolution can write to other players' rows from the client.
create policy "players_update" on players
  for update
  to authenticated
  using (
    exists (
      select 1 from rooms r
      where r.id = room_id
        and (auth.jwt()->>'sub') = any(r.players)
    )
  );
