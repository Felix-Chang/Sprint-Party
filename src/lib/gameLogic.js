export const PLAYER_COLORS = [
  "#FF6B6B",
  "#4ECDC4",
  "#FFD93D",
  "#6C5CE7",
  "#FF8A5C",
  "#2ECC71",
];

export function getPlayerColor(userId, roomPlayers = []) {
  const idx = roomPlayers.indexOf(userId);
  return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0];
}

export const DIFFICULTY_ICON = {
  1: new URL("../assets/icons/easy.png", import.meta.url).href,
  2: new URL("../assets/icons/medium.png", import.meta.url).href,
  3: new URL("../assets/icons/hard.png", import.meta.url).href,
};

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
    icon: new URL("../assets/icons/swap.png", import.meta.url).href,
  },
  {
    type: "mystery_bonus",
    name: "Mystery Bonus",
    description:
      "One difficulty tier is randomly selected. All tasks completed at that difficulty today earn +100 bonus points.",
    icon: new URL("../assets/icons/mystery.png", import.meta.url).href,
  },
  {
    type: "team_up",
    name: "Team Up",
    description:
      "The lobby splits into two teams. The team that completes the most tasks by end of day earns 300 points per member.",
    icon: new URL("../assets/icons/team.png", import.meta.url).href,
  },
  {
    type: "blitz",
    name: "Blitz",
    description:
      "For the rest of the day, every task completed by anyone in the lobby earns +50 bonus points.",
    icon: new URL("../assets/icons/blitz.png", import.meta.url).href,
  },
  {
    type: "bounty",
    name: "Bounty",
    description:
      "A random player is the target. Finish more tasks than them today to steal 200 pts. If they survive, they earn +200.",
    icon: new URL("../assets/icons/bounty.png", import.meta.url).href,
  },
];

export const POWER_UPS = {
  shield: {
    name: "Shield",
    icon: new URL("../assets/icons/shield.png", import.meta.url).href,
    description:
      "Block the next sabotage, point heist, or freeze targeting you. Auto-activates.",
  },
  freeze: {
    name: "Freeze",
    icon: new URL("../assets/icons/freeze.png", import.meta.url).href,
    description:
      "Pick one opponent. Their next task completion awards 0 points. Blocked by Shield.",
  },
  double_or_nothing: {
    name: "Double or Nothing",
    icon: new URL("../assets/icons/dice.png", import.meta.url).href,
    description:
      "Pick a task. Finish within the time limit (1hr Easy, 2hr Medium, 4hr Hard) for 2x points or lose base points.",
    timeLimits: {
      1: 60 * 60 * 1000,
      2: 2 * 60 * 60 * 1000,
      3: 4 * 60 * 60 * 1000,
    },
  },
  reroll: {
    name: "Reroll",
    icon: new URL("../assets/icons/reroll.png", import.meta.url).href,
    description:
      "Force the lobby to reroll for a different event. Usable once per week.",
  },
  ghost_mode: {
    name: "Ghost Mode",
    icon: new URL("../assets/icons/ghost.png", import.meta.url).href,
    description:
      'Hide your points and completions for 12 hours. You stay on the leaderboard but your score shows as "???".',
    duration: 12 * 60 * 60 * 1000,
  },
  sabotage: {
    name: "Sabotage",
    icon: new URL("../assets/icons/bomb.png", import.meta.url).href,
    description:
      "Pick one of an opponent's Easy tasks. They must finish it before completing any other task. Blocked by Shield.",
    targetDifficulty: 1,
  },
  point_heist: {
    name: "Point Heist",
    icon: new URL("../assets/icons/coin.png", import.meta.url).href,
    description: "Steal 150 points from any player. Blocked by Shield.",
    stealAmount: 150,
  },
  sprint_boost: {
    name: "Sprint Boost",
    icon: new URL("../assets/icons/rocket.png", import.meta.url).href,
    description:
      "Your next 3 task completions today each earn +50 bonus points.",
    bonusPerTask: 50,
    maxTasks: 3,
  },
};

export const BONUS_STARS = [
  {
    id: "grinder",
    name: "Grinder",
    emoji: "⚙️",
    description: "Most total tasks completed.",
  },
  {
    id: "consistent",
    name: "Consistent",
    emoji: "📅",
    description: "Checked in every single day.",
  },
  {
    id: "overachiever",
    name: "Overachiever",
    emoji: "🚀",
    description: "Completed more tasks than originally submitted.",
  },
  {
    id: "clutch_king",
    name: "Clutch King",
    icon: new URL("../assets/icons/star.png", import.meta.url).href,
    description: "Most points earned on the final day.",
  },
  {
    id: "saboteur",
    name: "Saboteur",
    icon: new URL("../assets/icons/bomb.png", import.meta.url).href,
    description: "Successfully sabotaged the most opponents.",
  },
];

export function getStreakMultiplier(streak) {
  if (streak >= 7) return 1.5;
  if (streak >= 5) return 1.4;
  if (streak >= 3) return 1.2;
  return 1.0;
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
