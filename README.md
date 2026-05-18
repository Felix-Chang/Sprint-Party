# Sprint Party

Your real tasks. A real leaderboard. Actual chaos.

Sprint Party turns your weekly to-do list into a multiplayer race. Submit your tasks, mark them complete, and outscore your friends — while random events and power-ups keep things unpredictable.

---

## How it works

1. **Create or join a room** using a 6-character invite code.
2. **Submit your tasks** for the race. Rate each one: Easy (100 pts), Medium (200 pts), or Hard (300 pts).
3. **Complete tasks** throughout the week. Every completion earns points based on difficulty — plus bonuses from events and power-ups.
4. **Watch the leaderboard** update in real time as your friends grind alongside you.
5. **Race ends** when the timer runs out. Final standings are locked in.

---

## Scoring

| Action                            | Points   |
| --------------------------------- | -------- |
| Easy task                         | 100      |
| Medium task                       | 200      |
| Hard task                         | 300      |
| Sprint Boost (next 3 completions) | +50 each |

---

## Events

On Tuesday, Thursday, and Saturday, a random event fires for everyone in the room:

- **Blitz** — every completed task earns +50 pts for the rest of the day
- **Bounty** — beat the target player's task count to steal 200 pts; if they survive, they earn +300
- **Team Up** — the room splits into two teams; winning team earns 300 pts each
- **Task Swap** — players swap one incomplete task with each other
- **Mystery Bonus** — one difficulty tier is randomly chosen; all tasks of that tier earn +100 pts today

---

## Power-ups

Each player gets a random power-up daily (max 2 at a time):

- **Shield** 🛡️ — auto-blocks the next freeze, sabotage, or point heist targeting you
- **Freeze** 🧊 — your target's next task completion earns 0 pts
- **Sabotage** 💣 — your target must complete one of their Easy tasks before anything else
- **Point Heist** 🏴‍☠️ — steal 150 pts from any player
- **Double or Nothing** 🎲 — pick a task; finish it within the time limit for 2x points, or lose the base points if you don't (1h Easy / 2h Medium / 4h Hard)
- **Incognito** 🕵️ — your score shows as "???" on the leaderboard for 12 hours
- **Sprint Boost** 🚀 — your next 3 task completions each earn +50 bonus pts

---

## Tech stack

React, Supabase (Postgres + Realtime), Clerk auth, deployed on Vercel.

---

## Demo

### Landing Page

![Landing page](screenshots/Landing%20Page.png)

### Room Lobby

![Room lobby](screenshots/Room%20Lobby.png)

### Active Race

![Active race](screenshots/Room%20View.png)

### Final Standings

![Final standings](screenshots/Final%20Standings.png)

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

Power-up state also required careful encoding: simple power-ups are stored as plain strings, while stateful ones (like freeze markers that track their source) are stored as JSON-stringified objects in the same array.

---

## Future improvements

- Move cross-player writes (power-up attacks, event resolution) to server-side edge functions
- Persistent player profiles with lifetime stats and win/loss history
- Mobile layout
- Room history and replays
