# Sprint Party

Your real tasks. A real leaderboard. Actual chaos.

Sprint Party turns your weekly to-do list into a multiplayer race. Submit your tasks, mark them complete, and outscore your friends — while random events and power-ups keep things unpredictable.

---

## How it works

1. **Create or join a room** using a 6-character invite code.
2. **Submit your tasks** for the race. Rate each one: Easy (100 pts), Medium (200 pts), or Hard (300 pts).
3. **Complete tasks** throughout the week. Every completion earns points based on difficulty — plus bonuses for speed and consistency.
4. **Watch the leaderboard** update in real time as your friends grind alongside you.
5. **Race ends** when the timer runs out. Final standings are locked in.

---

## Scoring

| Action                     | Points |
| -------------------------- | ------ |
| Easy task                  | 100    |
| Medium task                | 200    |
| Hard task                  | 300    |
| Speed Boost Power-up Bonus | +100   |

---

## Events

On Tuesday, Thursday, and Saturday, a random event fires for everyone in the room:

- **Blitz** — every completed task earns +50 pts for the rest of the day
- **Bounty** — beat the target player's task count to steal 200 pts from them
- **Team Up** — the room splits into two teams; winning team earns 300 pts each
- **Task Swap** — two players swap one incomplete task with each other
- **Mystery Bonus** — a specific task difficulty earns bonus points for the day

---

## Power-ups

Each player gets a random power-up daily (max 2 at a time):

- **Shield** — auto-blocks the next attack targeting you
- **Freeze** — your target's next task completion earns 0 pts
- **Sabotage** — your target must complete a specific task before any others
- **Point Heist** — steal points directly from another player
- **Double or Nothing** — double a task's points if you finish it in time, or lose them if you don't

---

## Tech stack

React, Supabase (Postgres + Realtime), Clerk auth, deployed on Vercel.

---

## Demo

<!-- Screenshots coming soon -->

---

## Setup

```bash
git clone <repo>
cd sprint-party
npm install
```

Create a `.env` file:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
VITE_CLERK_PUBLISHABLE_KEY=...
```

```bash
npm run dev
```

---

## Architecture

Single-page React app. All game state lives in two Supabase tables — `rooms` and `players`. The leaderboard and events update in real time via Supabase Realtime channels. Game logic (scoring, power-up state, event resolution) runs in `src/lib/gameLogic.js`. Auth is handled entirely by Clerk.

---

## Challenges

The trickiest part was event resolution — deciding which client should write the outcome back to the database without causing double-fires or race conditions. The current approach designates the room creator's browser as the resolver, with a `resolved` flag on each event to prevent duplicate writes.

Power-up state also required careful encoding: simple power-ups are stored as plain strings, while stateful ones (like freeze markers that need to track their source) are stored as JSON-stringified objects in the same array.

---

## Future improvements

- Move cross-player writes (power-up attacks, event resolution) to server-side edge functions
- Persistent player profiles with lifetime stats and win/loss history
- Mobile layout
- Room history and replays
