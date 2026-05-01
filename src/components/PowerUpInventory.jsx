import { POWER_UPS } from '../lib/gameLogic'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/useGameStore'

export default function PowerUpInventory({ player, roomId }) {
  const showToast = useGameStore((s) => s.showToast)
  const powerUps = player.power_ups || []

  async function usePowerUp(puId) {
    const pu = POWER_UPS[puId]
    if (!pu) return
    await supabase
      .from('players')
      .update({ power_ups: powerUps.filter((p) => p !== puId) })
      .eq('user_id', player.user_id)
      .eq('room_id', roomId)
    showToast(`Used ${pu.emoji} ${pu.name}!`, 'warning')
  }

  if (!powerUps.length) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 px-5 py-6 text-center text-white/40 text-sm">
        No power-ups. Earn them by completing 3 tasks in one day or checking in 3 days straight.
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Power-Ups</h2>
      </div>
      <div className="p-4 grid grid-cols-2 gap-3">
        {powerUps.map((puId, i) => {
          const pu = POWER_UPS[puId]
          if (!pu) return null
          return (
            <button
              key={i}
              onClick={() => usePowerUp(puId)}
              className="flex flex-col items-center gap-1 bg-white/10 hover:bg-violet-600/40 border border-white/10 hover:border-violet-500 rounded-xl p-3 transition-all text-center"
            >
              <span className="text-3xl">{pu.emoji}</span>
              <span className="text-white font-bold text-sm">{pu.name}</span>
              <span className="text-white/50 text-xs">{pu.description}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
