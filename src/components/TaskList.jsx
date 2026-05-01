import { useState } from 'react'
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { DIFFICULTY } from '../lib/gameLogic'
import { useGameStore } from '../store/useGameStore'

export default function TaskList({ player, roomId }) {
  const showToast = useGameStore((s) => s.showToast)
  const [newTitle, setNewTitle] = useState('')
  const [newDiff, setNewDiff] = useState(1)
  const [adding, setAdding] = useState(false)

  async function markComplete(task) {
    if (task.completed) return
    const ref = doc(db, 'rooms', roomId, 'players', player.userId)
    const updated = player.tasks.map((t) =>
      t.id === task.id ? { ...t, completed: true, completedAt: Timestamp.now() } : t
    )
    await updateDoc(ref, { tasks: updated })
    showToast(`✅ "${task.title}" complete! +${DIFFICULTY[task.difficulty]?.points} pts`, 'success')
  }

  async function addTask() {
    if (!newTitle.trim()) return
    setAdding(true)
    const ref = doc(db, 'rooms', roomId, 'players', player.userId)
    const task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      difficulty: Number(newDiff),
      completed: false,
      completedAt: null,
      addedAt: Timestamp.now(),
      originPlayerId: player.userId,
      bonusApplied: null,
    }
    await updateDoc(ref, { tasks: arrayUnion(task) })
    setNewTitle('')
    setNewDiff(1)
    setAdding(false)
    showToast('Task added!', 'info')
  }

  const tasks = player.tasks || []

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Your Tasks</h2>
      </div>
      <ul className="divide-y divide-white/5">
        {tasks.map((task) => {
          const diff = DIFFICULTY[task.difficulty]
          return (
            <li key={task.id} className="flex items-center gap-3 px-5 py-3">
              <button
                onClick={() => markComplete(task)}
                className={`w-6 h-6 rounded-full border-2 flex-shrink-0 transition-all ${
                  task.completed
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-white/30 hover:border-violet-400'
                }`}
              >
                {task.completed && <span className="text-xs">✓</span>}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-white/40' : 'text-white'}`}>
                  {task.title}
                </p>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 ${diff?.color}`}>
                {diff?.label} · {diff?.points}pts
              </span>
            </li>
          )
        })}
      </ul>
      <div className="px-5 py-4 border-t border-white/10 flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTask()}
          placeholder="Add a task..."
          className="flex-1 bg-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={newDiff}
          onChange={(e) => setNewDiff(e.target.value)}
          className="bg-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none"
        >
          {Object.entries(DIFFICULTY).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button
          onClick={addTask}
          disabled={adding}
          className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors disabled:opacity-50"
        >
          +
        </button>
      </div>
    </div>
  )
}
