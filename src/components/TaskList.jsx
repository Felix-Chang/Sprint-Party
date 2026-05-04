import { useState } from "react";
import { supabase } from "../lib/supabase";
import { DIFFICULTY, DIFFICULTY_EMOJI, isEventActive } from "../lib/gameLogic";
import { useGameStore } from "../store/useGameStore";

export default function TaskList({ player, roomId, activeEvent }) {
  const showToast = useGameStore((s) => s.showToast);
  const [newTitle, setNewTitle] = useState("");
  const [newDiff, setNewDiff] = useState(1);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState(null);

  async function markComplete(task) {
    if (task.completed) return;
    const basePts = DIFFICULTY[task.difficulty]?.points ?? 0;
    const mysteryBonus =
      activeEvent?.type === "mystery_bonus" &&
      isEventActive(activeEvent) &&
      task.difficulty === activeEvent.data?.difficulty
        ? (activeEvent.data?.bonusPoints ?? 0)
        : 0;
    const updated = player.tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            completed: true,
            completedAt: new Date().toISOString(),
            bonusApplied: mysteryBonus > 0 ? String(mysteryBonus) : null,
          }
        : t,
    );
    const totalPts = basePts + mysteryBonus;

    const update = { tasks: updated };
    if (mysteryBonus > 0) update.points = (player.points || 0) + mysteryBonus;

    await supabase
      .from("players")
      .update(update)
      .eq("user_id", player.user_id)
      .eq("room_id", roomId);

    setFlash({ id: task.id, pts: totalPts });
    setTimeout(() => setFlash(null), 1500);
    showToast(
      mysteryBonus > 0
        ? `+${basePts + mysteryBonus} pts 🔮`
        : `+${basePts} pts`,
      "success",
    );
  }

  async function addTask() {
    if (!newTitle.trim()) return;
    setAdding(true);
    const task = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      difficulty: Number(newDiff),
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
      originPlayerId: player.user_id,
      bonusApplied: null,
    };
    await supabase
      .from("players")
      .update({ tasks: [...(player.tasks || []), task] })
      .eq("user_id", player.user_id)
      .eq("room_id", roomId);
    setNewTitle("");
    setNewDiff(1);
    setAdding(false);
  }

  const tasks = player.tasks || [];
  const done = tasks.filter((t) => t.completed).length;

  const mysteryActive =
    activeEvent?.type === "mystery_bonus" && isEventActive(activeEvent);
  const blitzActive =
    activeEvent?.type === "blitz" && isEventActive(activeEvent);
  const mysteryDiff = mysteryActive ? activeEvent.data?.difficulty : null;
  const blitzBonus = blitzActive ? activeEvent.data?.bonusPoints : null;
  const DIFF_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
        <h2 className="font-bold text-[#1A1A2E]">Your tasks</h2>
        {tasks.length > 0 && (
          <span className="text-xs font-bold text-[#6B7280]">
            {done}/{tasks.length}
          </span>
        )}
      </div>

      {mysteryActive && (
        <div className="px-5 py-2 bg-green-50 border-b border-green-100 text-xs font-semibold text-green-700">
          Mystery Bonus active — {DIFF_LABELS[mysteryDiff]} tasks earn +
          {activeEvent.data.bonusPoints} pts
        </div>
      )}
      {blitzActive && (
        <div className="px-5 py-2 bg-yellow-50 border-b border-yellow-100 text-xs font-semibold text-yellow-700">
          Blitz active — every completion earns +{blitzBonus} bonus
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-[#9CA3AF]">
          No tasks yet. Add your first one below.
        </div>
      ) : (
        <ul className="divide-y divide-[#F3F4F6]">
          {tasks.map((task) => {
            const diff = DIFFICULTY[task.difficulty];
            const isFlashing = flash?.id === task.id;
            const isMysteryBonus =
              mysteryActive &&
              task.difficulty === mysteryDiff &&
              !task.completed;
            const isBlitz = blitzActive && !task.completed;

            return (
              <li
                key={task.id}
                className="flex items-center gap-3 px-5 py-3.5 relative"
              >
                <button
                  onClick={() => markComplete(task)}
                  className={`flex-shrink-0 text-3xl transition-transform ${
                    task.completed
                      ? "cursor-default opacity-70"
                      : "hover:scale-110 active:scale-125"
                  }`}
                  disabled={task.completed}
                >
                  {task.completed ? "✅" : "⬜"}
                </button>
                <span
                  className={`text-sm font-semibold transition-colors ${
                    task.completed
                      ? "line-through text-[#9CA3AF]"
                      : "text-[#1A1A2E]"
                  }`}
                >
                  {task.title}
                </span>
                <span className="text-xl flex-shrink-0">
                  {DIFFICULTY_EMOJI[task.difficulty]}
                </span>
                <span className="flex-1" />
                {isBlitz && (
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    +{blitzBonus}
                  </span>
                )}
                <span className="flex items-center gap-1 flex-shrink-0">
                  <span
                    className={`text-xs font-bold ${
                      isMysteryBonus || task.bonusApplied
                        ? "text-green-600"
                        : "text-[#1A1A2E]"
                    }`}
                  >
                    {diff?.points +
                      (isMysteryBonus
                        ? (activeEvent.data?.bonusPoints ?? 0)
                        : task.bonusApplied
                          ? parseInt(task.bonusApplied)
                          : 0)}{" "}
                    pts
                  </span>
                </span>
                {isFlashing && (
                  <span className="absolute right-4 top-2 text-sm font-black text-[#10B981] animate-float-up pointer-events-none">
                    +{flash.pts}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Add task */}
      <div className="px-5 py-3.5 border-t border-[#E5E7EB] flex gap-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a task..."
          className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#1A1A2E] transition-colors"
        />
        <select
          value={newDiff}
          onChange={(e) => setNewDiff(e.target.value)}
          className="border border-[#E5E7EB] rounded-lg px-2 py-2 text-sm text-[#1A1A2E] outline-none focus:border-[#1A1A2E] bg-white"
        >
          <option value={1}>Easy</option>
          <option value={2}>Medium</option>
          <option value={3}>Hard</option>
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
  );
}
