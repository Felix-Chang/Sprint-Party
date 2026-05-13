# End Screen Handoff

This document captures everything about the race end screen as built. Read this before touching anything in the finished/winner flow.

---

## How it triggers

`room.status` is a Supabase column that progresses `"lobby" → "active" → "finished"`.

Two things can set it to `"finished"`:
1. **Auto-close** — a `setInterval` in `Room.jsx` (line ~168) checks every 60 s. If `Date.now() >= new Date(room.week_end)`, it updates Supabase. The `.eq("status", "active")` guard makes it idempotent so multiple clients firing simultaneously is safe.
2. **Manual** — set it directly in Supabase for testing (see below).

When the Realtime subscription in `Room.jsx` receives the status change, `setRoom(payload.new)` triggers a re-render and the end screen mounts.

---

## File map

| File | Role |
|------|------|
| `src/components/WinnerReveal.jsx` | The full-screen podium component — dark stage, spotlights, confetti, staggered podium reveal |
| `src/index.css` | CSS keyframes: `podium-rise`, `winner-bounce`, `spotlight-open`, `crown-drop`, `shine-sweep`, `confetti-fall` — added at the bottom |
| `src/pages/Room.jsx` | Mounts `WinnerReveal` + the leaderboard/bonus-stars/new-race section when `room.status === "finished"` |
| `src/lib/gameLogic.js` | `calcPoints(player)`, `getPlayerColor(userId, roomPlayers)`, `BONUS_AWARDS` — all imported by WinnerReveal |

---

## WinnerReveal component

**Props:**
```js
WinnerReveal({
  players,          // full array from Supabase — component sorts internally
  currentUserId,    // Clerk user ID — used to show "(you)" label
  roomPlayers,      // room.players string[] — used for color index mapping
  onViewLeaderboard // callback — sets showLeaderboard=true in Room.jsx
})
```

**Internal structure (z-index layers):**
```
z-0  ConfettiLayer     — 24 absolutely-positioned spans, confetti-fall keyframe
z-1  SpotlightLayer    — 3 radial-gradient divs, spotlight-open keyframe
z-2  Stage content     — flex column, centered; contains PodiumStage + button
```

**Podium display order:** `[2nd, 1st, 3rd]` left-to-right. Items are bottom-aligned (`items-end`) so shorter blocks create the stepped look naturally.

**Missing players:** If fewer than 3 players exist, null slots are filtered out. 1 player = only 1st centered. 2 players = 2nd + 1st.

---

## Animation timing chain

All pure CSS — no framer-motion or react-spring installed.

| What | Keyframe | Delay | Duration |
|------|----------|-------|----------|
| 3rd podium rise | `podium-rise` | 0.4s | 0.8s |
| 3rd spotlight | `spotlight-open` | 0.4s | 0.6s |
| 2nd podium rise | `podium-rise` | 1.0s | 0.8s |
| 2nd spotlight | `spotlight-open` | 1.0s | 0.6s |
| 1st podium rise | `podium-rise` | 1.7s | 0.8s |
| 1st spotlight | `spotlight-open` | 1.7s | 0.7s |
| Crown drop (👑) | `crown-drop` | 2.2s | 0.5s |
| Shine sweep | `shine-sweep` | 2.4s | 0.7s |
| Winner bounce | `winner-bounce` | 2.5s | 0.6s |

`podium-rise` easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` — spring overshoot then settle.

All elements start `opacity: 0` and use `animation-fill-mode: forwards` so they hold their end state.

---

## Podium metadata (`PODIUM_META` constant in WinnerReveal.jsx)

```js
{
  1: { height: 160px, gradient: gold,   label: "1st" }
  2: { height: 112px, gradient: silver, label: "2nd" }
  3: { height: 80px,  gradient: bronze, label: "3rd" }
}
```

Gold: `linear-gradient(160deg, #FFD700 0%, #B8860B 100%)`  
Silver: `linear-gradient(160deg, #D8D8D8 0%, #888 100%)`  
Bronze: `linear-gradient(160deg, #CD7F32 0%, #7B4510 100%)`

1st place extras: gold glow ring on avatar (`box-shadow: 0 0 0 3px #FFD700, 0 0 24px ...`), shine sweep pseudo-div on block, `winner-bounce` secondary animation.

---

## How Room.jsx wires it

```jsx
{/* Content div only renders for lobby/active — NOT for finished */}
{room.status !== "finished" && (
  <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
    {isLobby && (...)}
    {isActive && (...)}
  </div>
)}

{/* Finished — sits directly after header with no gap */}
{room.status === "finished" && (
  <>
    <WinnerReveal
      players={players}
      currentUserId={user?.id}
      roomPlayers={room.players}
      onViewLeaderboard={() => setShowLeaderboard(true)}
    />
    {showLeaderboard && (
      <div className="max-w-[680px] mx-auto px-6 pb-16 pt-10">
        <Leaderboard ... />
        {/* Bonus stars skeleton */}
        {/* Start new race button (isCreator only) */}
      </div>
    )}
  </>
)}
```

`showLeaderboard` state lives in `Room.jsx` and resets to `false` inside `resetRace()`.

---

## What's real vs. skeleton

| Feature | Status |
|---------|--------|
| Podium with 1st/2nd/3rd | ✅ Done |
| Staggered animations | ✅ Done |
| Confetti + spotlights | ✅ Done |
| Final standings leaderboard | ✅ Done (reuses existing `Leaderboard` component) |
| "Start new race" (creator) | ✅ Done — resets all player rows + room back to lobby |
| Bonus stars | ⚠️ Skeleton only — 5 rows render with pulsing placeholder pills, no computation |

**Bonus stars not yet implemented:** `BONUS_AWARDS` (exported from `gameLogic.js`) defines the 5 categories (Grinder, Consistent, Overachiever, Clutch King, Saboteur) but nothing computes or awards them. The skeleton just renders the names/descriptions with an `animate-pulse` pill where the winner would appear.

---

## How to test without waiting for the timer

Run this in Supabase SQL editor:

```sql
UPDATE rooms SET status = 'finished' WHERE code = 'YOUR6CODE';
```

Realtime pushes the change instantly — all connected clients switch to the end screen within ~1 second.

To reset back:

```sql
UPDATE rooms SET status = 'lobby', week_start = now(), week_end = now() + interval '7 days', events = '[]' WHERE code = 'YOUR6CODE';
```

---

## Known rough edges / next session notes

- **Bonus stars need real computation.** The tally logic would run at race end: query all players, compute each award winner, write results to `rooms.bonus_stars` (jsonb). Currently that column exists but is never written by the app.
- **Confetti doesn't loop.** `confetti-fall` runs once (`forwards`). After ~6s all pieces have fallen and it goes still. If you want continuous confetti, switch to `infinite` and remove `forwards`, but you'll need to reset the Y position in the keyframe (start from `translateY(-20px)` each cycle via `animation-direction: normal`).
- **"View Full Leaderboard" doesn't scroll.** Clicking it reveals content below the fold but doesn't auto-scroll. Adding `window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })` in the `onViewLeaderboard` handler would fix this.
- **Header stays white on the end screen.** The sticky header doesn't adapt to the dark stage background. A future pass could hide it or make it transparent when finished.
- **`resetRace()` doesn't reset streaks or check-ins.** The current impl only resets `tasks` and `points`. If you want a full clean slate, also reset `streak`, `streak_multiplier`, `check_ins`, `bonus_stars_earned`, and `power_ups`.
