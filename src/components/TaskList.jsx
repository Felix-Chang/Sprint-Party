import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { DIFFICULTY, DIFFICULTY_EMOJI } from '../lib/gameLogic'
import { useGameStore } from '../store/useGameStore'

export default function TaskList({ player, roomId }) {
  const showToast = useGameStore((s) => s.showToast)
  const [newTitle, setNewTitle] = useState('')
  const [newDiff, setNewDiff] = useState(1)
  const [adding, setAdding] = useState(false)
  const [flash, setFlash] = useState(null)

  async function markComplete(task) {
    if (task.completed) return
    const updated = player.tasks.map((t) =>
      t.id === task.id ? { ...t, completed: true, completedAt: new Date().toISOString() } : t
    )
    await supabase
      .from('players')
      .update({ tasks: updated })
      .eq('user_id', player.user_id)
      .eq('room_id', roomId)
    const pts = DIFFICULTY[task.difficulty]?.points
    setFlash({ id: task.id, pts })
    setTimeout(() => setFlash(null), 700)
    showToast(`+${pts} pts`, 'success')
  }

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    const task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      difficulty: Number(newDiff),
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
      originPlayerId: player.user_id,
      bonusApplied: null,
    }
    await supabase
      .from('players')
      .update({ tasks: [...(player.tasks || []), task] })
      .eq('user_id', player.user_id)
      .eq('room_id', roomId)
    setNewTitle('')
    setNewDiff(1)
    setAdding(false)
  }

  const tasks = player.tasks || []
  const done = tasks.filter((t) => t.completed).length

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <h2 className="font-bold text-[#1A1A2E]">Your tasks</h2>
        {tasks.length > 0 && (
          <span className="text-xs font-bold text-[#6B7280]">{done}/{tasks.length}</span>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[#9CA3AF]">
          No tasks yet. Add your first one below.
        </div>
      ) : (
        <ul className="divide-y divide-[#F3F4F6]">
          {tasks.map((task) => {
            const diff = DIFFICULTY[task.difficulty]
            const emoji = DIFFICULTY_EMOJI[task.difficulty]
            const isFlashing = flash?.id === task.id

            return (
              <li key={task.id} className="flex items-center gap-3 px-5 py-3.5 relative">
                <button
                  onClick={() => markComplete(task)}
                  className="text-xl leading-none flex-shrink-0 transition-transform active:scale-110"
                  disabled={task.completed}
                >
                  {task.completed ? '✅' : '⬜'}
                </button>
                <span
                  className={`flex-1 text-sm font-semibold transition-colors ${
                    task.completed
                      ? 'line-through text-[#9CA3AF]'
                      : 'text-[#1A1A2E]'
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-xs text-[#6B7280] flex items-center gap-1 flex-shrink-0">
                  {emoji} {diff?.points}
                </span>
                {isFlashing && (
                  <span className="absolute right-4 top-2 text-xs font-black text-[#10B981] animate-float-up pointer-events-none">
                    +{flash.pts}
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {/* Add task */}
      <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#1A1A2E] transition-colors"
        />
        <select
          value={newDiff}
          onChange={(e) => setNewDiff(e.target.value)}
          className="border border-[#E5E7EB] rounded-lg px-2 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#1A1A2E] bg-white"
        >
          <option value={1}>🟢 Easy</option>
          <option value={2}>🟡 Medium</option>
          <option value={3}>🔴 Hard</option>
        </select>
        <button
          onClick={addTask}
          disabled={adding || !newTitle.trim()}
          className="bg-[#1A1A2E] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
}
