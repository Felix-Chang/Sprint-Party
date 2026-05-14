# Handoff — Events & Power-ups Feature

## What's been built

### New components
- `src/components/Modal.jsx` — base modal (overlay, close on backdrop/Escape, X button, slide-up animation)
- `src/components/EventModal.jsx` — event announcement popup, shown once per event via localStorage tracking. Personalized per event type (task_swap, mystery_bonus, team_up, blitz, bounty).
- `src/components/PowerUpModal.jsx` — power-up use dialog. Target picker for freeze/sabotage/point_heist. Task picker for double_or_nothing. Confirmation for shield/reroll/ghost_mode/sprint_boost.
- `src/components/IncomingEffectModal.jsx` — popup shown to the VICTIM when freeze or sabotage is applied to them. Detected via `useRef` diff of `myPlayer` in `Room.jsx`.

### Modified components
- `src/components/PowerUpInventory.jsx` — clicking a power-up now opens `PowerUpModal` instead of silently acting. Accepts `players`, `roomPlayers`, `activeEvent` props.
- `src/components/TaskList.jsx` — freeze visual (blue border + ❄️ banner). `markComplete` honors freeze: 0 pts, writes negative `player.points` offset, removes freeze marker from `power_ups`.
- `src/pages/Room.jsx` — detects new events (localStorage), shows `EventAnnouncementModal`. Detects incoming freeze/sabotage/point_heist via `prevMyPlayer` ref diff, shows `IncomingEffectModal` or toast.
- `src/lib/gameLogic.js` — added `isPlayerFrozen(player)`, `isGhostMode(player)`, `parsePowerUpMarker` helper.
- `src/index.css` — added `animate-modal-in`, `animate-overlay-in`, `animate-ice-shimmer`.

### Power-up effect writes (what gets saved to DB on confirm)
| Power-up | What's written |
|---|---|
| freeze | Stringified `{type:'freeze',sourceId}` appended to target's `power_ups` |
| sabotage | `taskConstraint:'easy_first'` + `sabotagedBy` on target's Easy task |
| point_heist | target.points -= 150, attacker.points += 150 |
| double_or_nothing | `doubleOrNothingActive:true` + `doubleOrNothingExpiresAt` on selected task |
| ghost_mode | `ghost_mode_until: ISO timestamp` on player row |
| sprint_boost | `sprint_boost_remaining: 3` on player row |
| reroll | removes from inventory only (reroll logic not wired to server) |
| shield | removes from inventory only (auto-activates on incoming attack — not yet enforced) |

---

## In progress — ghost mode leaderboard

**What's done:**
- `isGhostMode(player)` added to `gameLogic.js` — checks `player.ghost_mode_until > now`
- `isGhostMode` imported into `Leaderboard.jsx`

**What still needs to be done in `Leaderboard.jsx`:**

1. **Sort** — push ghost players to the bottom:
```js
const ranked = [...players].sort((a, b) => {
  const aGhost = isGhostMode(a)
  const bGhost = isGhostMode(b)
  if (aGhost && !bGhost) return 1
  if (!aGhost && bGhost) return -1
  return calcPoints(b) - calcPoints(a)
})
```

2. **Pass ghost props to `PlayerRow`** — in both the normal render and team_up render:
```jsx
<PlayerRow
  ...
  isGhost={isGhostMode(player)}
  isYouGhost={isGhostMode(players.find(p => p.user_id === currentUserId))}
/>
```

3. **Update `PlayerRow`** to accept `isGhost` and `isYouGhost`:

- If `isGhost && player.user_id !== currentUserId` (others viewing a ghost):
  - Row: `opacity-40` + `grayscale` filter
  - Points: render `???` instead of `<SlotCounter>`
  - Rank: show `🕵️` instead of medal/number

- If `isGhost && player.user_id === currentUserId` (ghost viewing themselves):
  - Row: gray left border (`borderLeft: '3px solid #9CA3AF'`)
  - Points: show real pts (they see their own score)
  - Rank: show `🕵️`
  - Add small `(ghost)` label next to name

```jsx
const ghost = isGhost
const viewerIsGhost = isYouGhost

// in the rank span:
{ghost ? '🕵️' : rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}`}

// in the pts span:
{ghost && player.user_id !== currentUserId
  ? <span className="font-black text-lg text-[#9CA3AF]">???</span>
  : <SlotCounter value={pts.toLocaleString()} />
}
```

- The `<li>` className/style for ghost rows:
  - Others viewing ghost: add `opacity-40` class + `filter: grayscale(1)` inline style
  - Ghost viewing self: add `borderLeft: '3px solid #9CA3AF'` to existing style

---

## Known gaps / not yet implemented
- **Shield** — stored in inventory but not checked when freeze/sabotage/point_heist is applied. Need to check target's `power_ups` for `shield` before writing the effect, remove shield if blocked.
- **Sabotage enforcement** — `taskConstraint: 'easy_first'` is written to the target's task but `TaskList.markComplete` doesn't block completing other tasks while the constraint is active.
- **Double or nothing enforcement** — `doubleOrNothingActive` flag is written to the task but the expiry isn't checked on completion; 2x points and failure penalty not implemented.
- **Sprint boost enforcement** — `sprint_boost_remaining` written to player but `TaskList.markComplete` doesn't check it.
- **Reroll** — removes from inventory but doesn't actually reroll the room event.
- **Ghost mode leaderboard** — `isGhostMode` helper exists, import added to Leaderboard, but the sort/render changes above haven't been written yet.
