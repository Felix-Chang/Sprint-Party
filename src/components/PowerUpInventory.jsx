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
    showToast(`Used ${pu.emoji} ${pu.name}!`, 'info')
  }

  if (!powerUps.length) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-8 text-center">
        <div className="text-2xl mb-2">⚡</div>
        <p className="text-sm text-[#6B7280] font-semibold">No power-ups</p>
        <p className="text-xs text-[#9CA3AF] mt-0.5">
          Earn them by completing 3 tasks in a day or checking in 3 days straight
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Power-ups</h2>
      </div>
      <div className="p-4 flex flex-wrap gap-2">
        {powerUps.map((puId, i) => {
          const pu = POWER_UPS[puId]
          if (!pu) return null
          return (
            <button
              key={i}
              onClick={() => usePowerUp(puId)}
              className="inline-flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] text-[#1A1A2E] font-bold px-4 py-2 rounded-full text-sm hover:border-[#1A1A2E] hover:bg-white transition-colors"
            >
              <span>{pu.emoji}</span>
              <span>{pu.name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
