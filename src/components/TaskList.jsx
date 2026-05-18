import { useState } from "react";
import { supabase } from "../lib/supabase";
import {
  DIFFICULTY,
  DIFFICULTY_EMOJI,
  isEventActive,
  isPlayerFrozen,
  POWER_UPS,
} from "../lib/gameLogic";
import { useGameStore } from "../store/useGameStore";
import { playPop, playSuccess, playSlots, playScribble, playError } from "../lib/sounds";

export default function TaskList({ player, roomId, activeEvent, onTaskAdded, onPlayerUpdated }) {
  const showToast = useGameStore((s) => s.showToast);
  const [newTitle, setNewTitle] = useState("");
  const [newDiff, setNewDiff] = useState(1);
  const [adding, setAdding] = useState(false);
  const [flash, setFlash] = useState(null);

  async function markComplete(task) {
    if (task.completed) return;

    const sabotagedTask = (player.tasks ?? []).find(
      (t) => t.taskConstraint === "easy_first" && !t.completed,
    );
    if (sabotagedTask && task.id !== sabotagedTask.id) {
      showToast("Complete your sabotaged task first! 💣", "error");
      return;
    }

    const isFrozenNow = isPlayerFrozen(player);

    const basePts = isFrozenNow
      ? 0
      : (DIFFICULTY[task.difficulty]?.points ?? 0);

    let doubleOrNothingResult = null;
    let effectiveBasePts = basePts;
    if (!isFrozenNow && task.doubleOrNothingActive) {
      const expired = new Date() > new Date(task.doubleOrNothingExpiresAt);
      if (expired) {
        effectiveBasePts = -basePts;
        doubleOrNothingResult = "lost";
      } else {
        effectiveBasePts = basePts * 2;
        doubleOrNothingResult = "won";
      }
    }

    const mysteryBonus =
      !isFrozenNow &&
      activeEvent?.type === "mystery_bonus" &&
      isEventActive(activeEvent) &&
      task.difficulty === activeEvent.data?.difficulty
        ? (activeEvent.data?.bonusPoints ?? 0)
        : 0;
    const blitzBonus =
      !isFrozenNow &&
      activeEvent?.type === "blitz" &&
      isEventActive(activeEvent)
        ? (activeEvent.data?.bonusPoints ?? 0)
        : 0;
    const sprintRemaining = player.sprint_boost_remaining ?? 0;
    const sprintBonus =
      !isFrozenNow && sprintRemaining > 0
        ? POWER_UPS.sprint_boost.bonusPerTask
        : 0;
    const totalBonus = mysteryBonus + blitzBonus + sprintBonus;
    const updated = player.tasks.map((t) =>
      t.id === task.id
        ? {
            ...t,
            completed: true,
            completedAt: new Date().toISOString(),
            bonusApplied: doubleOrNothingResult === 'won'
              ? String(basePts + totalBonus)
              : totalBonus > 0
                ? String(totalBonus)
                : null,
            doubleOrNothingActive: false,
            doubleOrNothingExpiresAt: null,
            taskConstraint: null,
            sabotagedBy: null,
          }
        : t,
    );
    const totalPts = effectiveBasePts + totalBonus;

    const update = { tasks: updated };
    if (isFrozenNow) {
      // Offset player.points to cancel out the task's difficulty points that calcPoints will count
      update.points =
        (player.points || 0) - (DIFFICULTY[task.difficulty]?.points ?? 0);
      // Remove the first freeze marker from power_ups (handle string or object form)
      let removedOne = false;
      update.power_ups = (player.power_ups ?? []).filter((p) => {
        if (!removedOne) {
          const parsed =
            typeof p === "object" && p !== null
              ? p
              : (() => {
                  try {
                    return JSON.parse(p);
                  } catch {
                    return null;
                  }
                })();
          if (parsed?.type === "freeze") {
            removedOne = true;
            return false;
          }
        }
        return true;
      });
    } else {
      const donAdjustment = doubleOrNothingResult === 'won'
        ? basePts
        : doubleOrNothingResult === 'lost'
          ? -2 * basePts
          : 0;
      const pointsAdjustment = donAdjustment + totalBonus;
      if (pointsAdjustment !== 0) {
        update.points = (player.points || 0) + pointsAdjustment;
      }
    }

    if (!isFrozenNow && sprintRemaining > 0) {
      update.sprint_boost_remaining =
        sprintRemaining > 1 ? sprintRemaining - 1 : null;
    }

    onPlayerUpdated?.(update);
    await supabase
      .from("players")
      .update(update)
      .eq("user_id", player.user_id)
      .eq("room_id", roomId);

    setFlash({ id: task.id, pts: totalPts, frozen: isFrozenNow, lost: doubleOrNothingResult === 'lost' });
    setTimeout(() => setFlash(null), 1500);

    if (isFrozenNow) {
      showToast("Frozen! 0 pts earned ❄️", "info");
    } else {
      playSuccess();
      playSlots();
      const emojis = [
        blitzBonus > 0 && "⚡",
        mysteryBonus > 0 && "🔮",
        sprintBonus > 0 && "🚀",
      ]
        .filter(Boolean)
        .join("");
      if (doubleOrNothingResult !== 'lost') {
        showToast(`+${totalPts} pts${emojis ? ` ${emojis}` : ""}`, "success");
      }
      if (doubleOrNothingResult === "won") {
        showToast(`🎲 Double or Nothing: doubled! +${effectiveBasePts} pts`, "success");
      } else if (doubleOrNothingResult === "lost") {
        showToast(`🎲 Double or Nothing: time's up! ${totalPts} pts 💀`, "error");
      }
    }
  }

  async function addTask() {
    if (!newTitle.trim()) {
      playError();
      return;
    }
    playScribble();
    setAdding(true);
    const task = {
      id: crypto.randomUUID(),
      title: newTitle.trim().slice(0, 200),
      difficulty: Number(newDiff),
      completed: false,
      completedAt: null,
      addedAt: new Date().toISOString(),
      originPlayerId: player.user_id,
      bonusApplied: null,
    };
    onTaskAdded?.(task);
    await supabase
      .from("players")
      .update({ tasks: [...(player.tasks || []), task] })
      .eq("user_id", player.user_id)
      .eq("room_id", roomId);
    setNewTitle("");
    setNewDiff(1);
    setAdding(false);
  }

  const frozen = isPlayerFrozen(player);
  const tasks = player.tasks || [];
  const done = tasks.filter((t) => t.completed).length;
  const sabotagedTask = tasks.find(
    (t) => t.taskConstraint === "easy_first" && !t.completed,
  );
  const isSabotaged = !!sabotagedTask;

  const mysteryActive =
    activeEvent?.type === "mystery_bonus" && isEventActive(activeEvent);
  const blitzActive =
    activeEvent?.type === "blitz" && isEventActive(activeEvent);
  const mysteryDiff = mysteryActive ? activeEvent.data?.difficulty : null;
  const blitzBonus = blitzActive ? activeEvent.data?.bonusPoints : null;
  const DIFF_LABELS = { 1: "Easy", 2: "Medium", 3: "Hard" };

  return (
    <div
      className={`bg-white border rounded-xl overflow-hidden ${frozen ? "border-[#93C5FD]" : "border-[#E5E7EB]"}`}
    >
      <div
        className={`px-5 py-4 border-b flex items-center justify-between ${frozen ? "border-[#BFDBFE]" : "border-[#E5E7EB]"}`}
      >
        <h2 className="font-bold text-[#1A1A2E]">Your tasks</h2>
        {tasks.length > 0 && (
          <span className="text-xs font-bold text-[#6B7280]">
            {done}/{tasks.length}
          </span>
        )}
      </div>

      {frozen && (
        <div className="px-5 py-2 bg-[#EFF6FF] border-b border-[#BFDBFE] flex items-center gap-2">
          <span className="text-base animate-ice-shimmer">❄️</span>
          <span className="text-xs font-bold text-[#1D4ED8]">Frozen</span>
          <span className="text-xs text-[#3B82F6]">
            — next completion earns 0 pts
          </span>
        </div>
      )}

      {isSabotaged && (
        <div className="px-5 py-2 bg-[#FEF3C7] border-b border-[#FDE68A] flex items-center gap-2">
          <span className="text-base">💣</span>
          <span className="text-xs font-bold text-[#92400E]">Sabotaged</span>
          <span className="text-xs text-[#B45309]">
            — complete the marked task before others
          </span>
        </div>
      )}

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
      {(player.sprint_boost_remaining ?? 0) > 0 && (
        <div className="px-5 py-2 bg-purple-50 border-b border-purple-100 text-xs font-semibold text-purple-700">
          Sprint Boost active — {player.sprint_boost_remaining} completion
          {player.sprint_boost_remaining !== 1 ? "s" : ""} remaining 🚀
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
            const isWagered = task.doubleOrNothingActive && !task.completed;
            const wagerExpired = isWagered && new Date() > new Date(task.doubleOrNothingExpiresAt);

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
                {task.taskConstraint === "easy_first" && !task.completed && (
                  <span className="text-xs font-bold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    First!
                  </span>
                )}
                {isBlitz && (
                  <span className="text-xs font-bold text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded flex-shrink-0">
                    +{blitzBonus}
                  </span>
                )}
                <span className="flex items-center gap-1 flex-shrink-0">
                  {isWagered && <span className="text-xs">🎲</span>}
                  <span
                    className={`text-xs font-bold ${
                      isWagered && !wagerExpired
                        ? "text-green-600"
                        : isWagered && wagerExpired
                          ? "text-red-500"
                          : isMysteryBonus || task.bonusApplied
                            ? "text-green-600"
                            : "text-[#1A1A2E]"
                    }`}
                  >
                    {isWagered
                      ? wagerExpired
                        ? `-${diff?.points} pts`
                        : `${(diff?.points ?? 0) * 2} pts`
                      : `${diff?.points + (isMysteryBonus ? (activeEvent.data?.bonusPoints ?? 0) : task.bonusApplied ? parseInt(task.bonusApplied) : 0)} pts`
                    }
                  </span>
                </span>
                {isFlashing && (
                  <span
                    className={`absolute right-4 top-2 text-sm font-black animate-float-up pointer-events-none ${flash.frozen ? "text-[#93C5FD]" : flash.lost ? "text-red-500" : "text-[#10B981]"}`}
                  >
                    {flash.frozen ? "0 pts ❄️" : flash.lost ? `${flash.pts} pts 💀` : `+${flash.pts}`}
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
          maxLength={200}
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
          onClick={() => {
            playPop();
            addTask();
          }}
          disabled={adding || !newTitle.trim()}
          className="bg-[#1A1A2E] text-white font-bold px-4 py-2 rounded-lg text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  );
}
