import { useState } from 'react'
import Modal from './Modal'
import { POWER_UPS, DIFFICULTY, DIFFICULTY_EMOJI, EVENTS, getPlayerColor } from '../lib/gameLogic'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/useGameStore'

const TIME_LIMIT_LABEL = { 1: '1 hr', 2: '2 hrs', 3: '4 hrs' }

function PlayerList({ players, roomPlayers, selected, onSelect }) {
  return (
    <div className="space-y-2">
      {players.map((p) => {
        const color = getPlayerColor(p.user_id, roomPlayers)
        const initial = p.display_name?.[0]?.toUpperCase() || '?'
        return (
          <button
            key={p.user_id}
            onClick={() => onSelect(p.user_id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
              selected === p.user_id
                ? 'border-[#1A1A2E] bg-[#F3F4F6]'
                : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
            }`}
          >
            <div
              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-black text-sm"
              style={{ background: color }}
            >
              {initial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-[#1A1A2E] truncate">
                {p.display_name?.split(' ')[0] ?? 'Player'}
              </p>
            </div>
            {selected === p.user_id && (
              <span className="text-[#1A1A2E] text-base">✓</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function TaskList({ tasks, selected, onSelect }) {
  return (
    <div className="space-y-2">
      {tasks.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
            selected === t.id
              ? 'border-[#1A1A2E] bg-[#F3F4F6]'
              : 'border-[#E5E7EB] hover:border-[#9CA3AF]'
          }`}
        >
          <span className="text-xl">{DIFFICULTY_EMOJI[t.difficulty] ?? '⬜'}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-[#1A1A2E] truncate">{t.title}</p>
            <p className="text-xs text-[#9CA3AF]">
              {DIFFICULTY[t.difficulty]?.label} · {TIME_LIMIT_LABEL[t.difficulty]} limit
            </p>
          </div>
          {selected === t.id && (
            <span className="text-[#1A1A2E] text-base">✓</span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function PowerUpModal({
  puId,
  player,
  players,
  roomId,
  roomPlayers,
  activeEvent,
  onClose,
}) {
  const showToast = useGameStore((s) => s.showToast)
  const [selectedTarget, setSelectedTarget] = useState(null)
  const [selectedTask, setSelectedTask] = useState(null)
  const [confirming, setConfirming] = useState(false)

  const pu = POWER_UPS[puId]
  if (!pu) return null

  const otherPlayers = (players ?? []).filter((p) => p.user_id !== player.user_id)
  const incompleteTasks = (player.tasks ?? []).filter((t) => !t.completed)

  const needsTarget = ['freeze', 'sabotage', 'point_heist'].includes(puId)
  const needsTask = puId === 'double_or_nothing'

  const canConfirm =
    (!needsTarget || selectedTarget) &&
    (!needsTask || selectedTask)

  async function removeFromInventory() {
    const updated = (player.power_ups ?? []).filter((p) => p !== puId)
    await supabase
      .from('players')
      .update({ power_ups: updated })
      .eq('user_id', player.user_id)
      .eq('room_id', roomId)
  }

  async function handleConfirm() {
    setConfirming(true)
    try {
      if (puId === 'freeze') {
        const target = players.find((p) => p.user_id === selectedTarget)
        const freezeMarker = { type: 'freeze', sourceId: player.user_id }
        const updatedPowerUps = [...(target.power_ups ?? []), JSON.stringify(freezeMarker)]
        await supabase
          .from('players')
          .update({ power_ups: updatedPowerUps })
          .eq('user_id', selectedTarget)
          .eq('room_id', roomId)
        await removeFromInventory()
        const name = target.display_name?.split(' ')[0] ?? 'them'
        showToast(`${name} is frozen! ❄️`, 'info')
      } else if (puId === 'sabotage') {
        const target = players.find((p) => p.user_id === selectedTarget)
        const updatedTasks = (target.tasks ?? []).map((t) =>
          !t.completed && t.difficulty === 1
            ? { ...t, sabotagedBy: player.user_id, taskConstraint: 'easy_first' }
            : t,
        )
        await supabase
          .from('players')
          .update({ tasks: updatedTasks })
          .eq('user_id', selectedTarget)
          .eq('room_id', roomId)
        await removeFromInventory()
        const name = target.display_name?.split(' ')[0] ?? 'them'
        showToast(`${name} has been sabotaged! 💣`, 'info')
      } else if (puId === 'point_heist') {
        const target = players.find((p) => p.user_id === selectedTarget)
        const stealAmount = POWER_UPS.point_heist.stealAmount
        await Promise.all([
          supabase
            .from('players')
            .update({ points: (target.points ?? 0) - stealAmount })
            .eq('user_id', selectedTarget)
            .eq('room_id', roomId),
          supabase
            .from('players')
            .update({ points: (player.points ?? 0) + stealAmount })
            .eq('user_id', player.user_id)
            .eq('room_id', roomId),
        ])
        await removeFromInventory()
      } else if (puId === 'double_or_nothing') {
        const task = incompleteTasks.find((t) => t.id === selectedTask)
        const durationMs = POWER_UPS.double_or_nothing.timeLimits[task.difficulty]
        const expiresAt = new Date(Date.now() + durationMs).toISOString()
        const updatedTasks = (player.tasks ?? []).map((t) =>
          t.id === selectedTask
            ? { ...t, doubleOrNothingActive: true, doubleOrNothingExpiresAt: expiresAt }
            : t,
        )
        await supabase
          .from('players')
          .update({ tasks: updatedTasks })
          .eq('user_id', player.user_id)
          .eq('room_id', roomId)
        await removeFromInventory()
        showToast('Double or Nothing activated! ⏱️', 'info')
      } else if (puId === 'ghost_mode') {
        const until = new Date(Date.now() + POWER_UPS.ghost_mode.duration).toISOString()
        await supabase
          .from('players')
          .update({ ghost_mode_until: until })
          .eq('user_id', player.user_id)
          .eq('room_id', roomId)
        await removeFromInventory()
        showToast('Ghost Mode active for 12 hours! 🕵️', 'info')
      } else if (puId === 'sprint_boost') {
        await supabase
          .from('players')
          .update({ sprint_boost_remaining: POWER_UPS.sprint_boost.maxTasks })
          .eq('user_id', player.user_id)
          .eq('room_id', roomId)
        await removeFromInventory()
        showToast('Sprint Boost active! Next 3 completions +50 pts 🚀', 'success')
      } else if (puId === 'reroll') {
        await removeFromInventory()
        showToast('Reroll requested! 🔄', 'info')
      } else {
        // shield — just removes from inventory (auto-activates on incoming attack)
        await removeFromInventory()
        showToast('Shield equipped! 🛡️', 'success')
      }
    } finally {
      setConfirming(false)
      onClose()
    }
  }

  const activeEventMeta = activeEvent
    ? EVENTS.find((e) => e.type === activeEvent.type)
    : null

  return (
    <Modal isOpen onClose={onClose}>
      <div className="px-6 pt-8 pb-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="text-5xl">{pu.emoji}</div>
          <h2 className="text-xl font-black text-[#1A1A2E]">{pu.name}</h2>
          <p className="text-sm text-[#6B7280]">{pu.description}</p>
        </div>

        {/* Per-power-up body */}
        {puId === 'reroll' && activeEventMeta && (
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{activeEventMeta.emoji}</span>
            <div>
              <p className="text-xs text-[#9CA3AF] font-bold uppercase tracking-widest">Current event</p>
              <p className="text-sm font-bold text-[#1A1A2E]">{activeEventMeta.name}</p>
            </div>
          </div>
        )}

        {needsTarget && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Pick a target</p>
            {otherPlayers.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-2">No other players</p>
            ) : (
              <PlayerList
                players={otherPlayers}
                roomPlayers={roomPlayers}
                selected={selectedTarget}
                onSelect={setSelectedTarget}
              />
            )}
          </div>
        )}

        {needsTask && (
          <div className="space-y-2">
            <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Pick a task to wager</p>
            {incompleteTasks.length === 0 ? (
              <p className="text-sm text-[#9CA3AF] text-center py-2">No incomplete tasks</p>
            ) : (
              <TaskList
                tasks={incompleteTasks}
                selected={selectedTask}
                onSelect={setSelectedTask}
              />
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 border border-[#E5E7EB] text-[#6B7280] font-bold py-2.5 rounded-xl hover:border-[#9CA3AF] transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={confirming || !canConfirm}
            className="flex-1 bg-[#1A1A2E] text-white font-black py-2.5 rounded-xl hover:bg-[#2d2d4a] transition-colors disabled:opacity-40 text-sm active:scale-95"
          >
            {confirming ? 'Using...' : 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
