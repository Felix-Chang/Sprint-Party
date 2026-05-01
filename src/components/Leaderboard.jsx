import { DIFFICULTY, getStreakMultiplier } from '../lib/gameLogic'

function calcPoints(player) {
  const base = (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (DIFFICULTY[t.difficulty]?.points ?? 0), 0)
  return Math.floor(base * getStreakMultiplier(player.streak || 0)) + (player.points || 0)
}

export default function Leaderboard({ players, currentUserId }) {
  const ranked = [...players].sort((a, b) => calcPoints(b) - calcPoints(a))

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Leaderboard</h2>
      </div>
      <ul>
        {ranked.map((player, i) => {
          const pts = calcPoints(player)
          const done = (player.tasks || []).filter((t) => t.completed).length
          const total = (player.tasks || []).length
          const isYou = player.userId === currentUserId

          return (
            <li
              key={player.userId}
              className={`flex items-center gap-4 px-5 py-3 border-b border-white/5 last:border-0 transition-all ${isYou ? 'bg-violet-500/20' : ''}`}
            >
              <span className="w-7 text-center font-bold text-lg text-violet-300">
                {i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="text-2xl">{player.avatar || '🎮'}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate">
                  {player.displayName} {isYou && <span className="text-violet-400 text-sm">(you)</span>}
                </p>
                <p className="text-xs text-white/50">
                  {done}/{total} tasks · {player.streak || 0}🔥 streak
                </p>
              </div>
              <span className="font-bold text-lg text-yellow-300">{pts.toLocaleString()} pts</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
