export const PLAYER_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#FFD93D',
  '#6C5CE7',
  '#FF8A5C',
  '#2ECC71',
]

export function getPlayerColor(userId, roomPlayers = []) {
  const idx = roomPlayers.indexOf(userId)
  return PLAYER_COLORS[idx >= 0 ? idx % PLAYER_COLORS.length : 0]
}

export const DIFFICULTY_ICON = {
  1: new URL('../assets/icons/easy.png', import.meta.url).href,
  2: new URL('../assets/icons/medium.png', import.meta.url).href,
  3: new URL('../assets/icons/hard.png', import.meta.url).href,
}

export const DIFFICULTY = {
  1: { label: 'Easy', points: 100 },
  2: { label: 'Medium', points: 200 },
  3: { label: 'Hard', points: 300 },
}

export const EVENTS = [
  {
    type: 'task_swap',
    name: 'Task Swap',
    description: 'Two random players swap one incomplete task with each other.',
    icon: new URL('../assets/icons/swap.png', import.meta.url).href,
  },
  {
    type: 'double_or_nothing',
    name: 'Double or Nothing',
    description: 'Pick a task — finish in 24h for 2x points or lose the base points.',
    icon: new URL('../assets/icons/dice.png', import.meta.url).href,
  },
  {
    type: 'sabotage',
    name: 'Sabotage',
    description: 'Assign a small bonus task to any opponent.',
    icon: new URL('../assets/icons/bomb.png', import.meta.url).href,
  },
  {
    type: 'mystery_bonus',
    name: 'Mystery Bonus',
    description: 'A hidden scoring condition will be revealed at end of week.',
    icon: new URL('../assets/icons/mystery.png', import.meta.url).href,
  },
  {
    type: 'point_heist',
    name: 'Point Heist',
    description: 'Steal 2 points from any opponent. Shields block this.',
    icon: new URL('../assets/icons/coin.png', import.meta.url).href,
  },
  {
    type: 'freeze',
    name: 'Freeze',
    description: "Pick one opponent — their next task completion awards 0 points.",
    icon: new URL('../assets/icons/freeze.png', import.meta.url).href,
  },
]

export const POWER_UPS = {
  shield: { name: 'Shield', icon: new URL('../assets/icons/shield.png', import.meta.url).href, description: 'Block the next sabotage, heist, or freeze. Auto-activates.' },
  double_down: { name: 'Double Down', icon: new URL('../assets/icons/fire.png', import.meta.url).href, description: '2x multiplier on your next completed task.' },
  reroll: { name: 'Reroll', icon: new URL('../assets/icons/dice.png', import.meta.url).href, description: 'Force a reroll when the next event fires. Once per week.' },
  ghost_mode: { name: 'Ghost Mode', emoji: '👻', description: 'Hide your progress from the leaderboard for 24 hours.' },
}

export const BONUS_STARS = [
  { id: 'grinder', name: 'Grinder', emoji: '⚙️', description: 'Most total tasks completed.' },
  { id: 'consistent', name: 'Consistent', emoji: '📅', description: 'Checked in every single day.' },
  { id: 'overachiever', name: 'Overachiever', emoji: '🚀', description: 'Completed more tasks than originally submitted.' },
  { id: 'clutch_king', name: 'Clutch King', icon: new URL('../assets/icons/star.png', import.meta.url).href, description: 'Most points earned on the final day.' },
  { id: 'saboteur', name: 'Saboteur', icon: new URL('../assets/icons/bomb.png', import.meta.url).href, description: 'Successfully sabotaged the most opponents.' },
]

export function getStreakMultiplier(streak) {
  if (streak >= 7) return 1.5
  if (streak >= 5) return 1.4
  if (streak >= 3) return 1.2
  return 1.0
}

export function calcBasePoints(player) {
  return (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + DIFFICULTY[t.difficulty]?.points ?? 0, 0)
}

export function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export function getWeekBounds() {
  const now = new Date()
  const day = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { weekStart: monday, weekEnd: sunday }
}
