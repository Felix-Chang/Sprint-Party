export const PLAYER_COLORS = [
  "#FF6B6B",
  "#4A90E2",
  "#FFD93D",
  "#6C5CE7",
  "#FF8A5C",
  "#2ECC71",
  "#FF69B4",
  "#4ECDC4",
];

export function getPlayerColor(userId, roomPlayers = []) {
  const idx = roomPlayers.indexOf(userId);
  if (idx >= 0) return PLAYER_COLORS[idx % PLAYER_COLORS.length];
  const usedColors = new Set(
    roomPlayers.map((_, i) => PLAYER_COLORS[i % PLAYER_COLORS.length])
  );
  return PLAYER_COLORS.find((c) => !usedColors.has(c)) ?? PLAYER_COLORS[0];
}

export const DIFFICULTY_EMOJI = { 1: "🟢", 2: "🟡", 3: "🔴" };

export const DIFFICULTY = {
  1: { label: "Easy", points: 100 },
  2: { label: "Medium", points: 200 },
  3: { label: "Hard", points: 300 },
};

export const EVENTS = [
  {
    type: "task_swap",
    name: "Task Swap",
    description:
      "Players pick one of their incomplete tasks and swap its difficulty with another player's task.",
    emoji: "🔀",
  },
  {
    type: "mystery_bonus",
    name: "Mystery Bonus",
    description:
      "One difficulty tier is randomly selected. All tasks completed today of that difficulty earn +100 bonus pts.",
    emoji: "🔮",
  },
  {
    type: "team_up",
    name: "Team Up",
    description:
      "The lobby splits into two teams. The team that completes the most tasks by end of day earns 300 pts per member.",
    emoji: "⚔️",
  },
  {
    type: "blitz",
    name: "Blitz",
    description:
      "For the rest of the day, every completed task in the lobby earns +50 bonus pts.",
    emoji: "⚡",
  },
  {
    type: "bounty",
    name: "Bounty",
    description:
      "A random player is the target. Finish more tasks than them today to steal 200 pts. If they survive, they earn +300 pts.",
    emoji: "☠️",
  },
];

export const POWER_UPS = {
  shield: {
    name: "Shield",
    emoji: "🛡️",
    description:
      "Block the next sabotage, point heist or freeze targeting you.",
  },
  freeze: {
    name: "Freeze",
    emoji: "🧊",
    description:
      "Pick one opponent. Their next task completion awards 0 points. Blocked by Shield.",
  },
  double_or_nothing: {
    name: "Double or Nothing",
    emoji: "🎲",
    description:
      "Pick a task. Finish within the time limit (1hr Easy, 2hr Medium, 4hr Hard) for 2x points or lose base points.",
    timeLimits: {
      1: 60 * 60 * 1000,
      2: 2 * 60 * 60 * 1000,
      3: 4 * 60 * 60 * 1000,
    },
  },
  ghost_mode: {
    name: "Incognito",
    emoji: "🕵️",
    description:
      'Hide your pts and completions for 12 hours. You stay on the leaderboard but your score shows as "???".',
    duration: 12 * 60 * 60 * 1000,
  },
  sabotage: {
    name: "Sabotage",
    emoji: "💣",
    description:
      "Pick one of an opponent's Easy tasks. They must finish it before completing any other task. Blocked by Shield.",
    targetDifficulty: 1,
  },
  point_heist: {
    name: "Point Heist",
    emoji: "🏴‍☠️",
    description: "Steal 150 pts from any player. Blocked by Shield.",
    stealAmount: 150,
  },
  sprint_boost: {
    name: "Sprint Boost",
    emoji: "🚀",
    description: "Your next 3 task completions today each earn +50 bonus pts.",
    bonusPerTask: 50,
    maxTasks: 3,
  },
};

function parsePowerUpMarker(p) {
  if (p && typeof p === "object") return p;
  try {
    return JSON.parse(p);
  } catch {
    return null;
  }
}

export function isGhostMode(player) {
  if (!player?.ghost_mode_until) return false;
  return new Date(player.ghost_mode_until) > new Date();
}

export function isPlayerFrozen(player) {
  return (player?.power_ups ?? []).some(
    (p) => parsePowerUpMarker(p)?.type === "freeze",
  );
}

export function isEventActive(event) {
  if (!event || event.resolved) return false;
  if (!event.data?.expiresAt) return true;
  return new Date(event.data.expiresAt) > new Date();
}

export function calcBasePoints(player) {
  return (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + DIFFICULTY[t.difficulty]?.points ?? 0, 0);
}

export function generateRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

export function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { weekStart: monday, weekEnd: sunday };
}

export function computeRaceBounds(raceDuration) {
  const raceStart = new Date();
  const raceEnd = new Date(raceStart);
  raceEnd.setDate(raceStart.getDate() + raceDuration);
  raceEnd.setHours(23, 59, 59, 999);
  return { raceStart, raceEnd };
}

export function calcPoints(player) {
  const base = (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (DIFFICULTY[t.difficulty]?.points ?? 0), 0);
  return base + (player.points || 0);
}

export function countUsablePowerUps(powerUpsArray) {
  return (powerUpsArray ?? []).filter((p) => {
    try {
      const m = typeof p === "object" && p !== null ? p : JSON.parse(p);
      return m?.type !== "freeze";
    } catch {
      return true;
    }
  }).length;
}

export const MAX_POWER_UPS = 2;
