import { useState } from "react";
import {
  EVENTS,
  DIFFICULTY,
  DIFFICULTY_EMOJI,
  isEventActive,
  getPlayerColor,
} from "../lib/gameLogic";
import { supabase } from "../lib/supabase";

function TaskSwapCard({
  event,
  myPlayer,
  players,
  currentUserId,
  roomId,
  roomPlayers,
  events,
}) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedTargetTaskId, setSelectedTargetTaskId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myChoice = event.data?.choices?.[currentUserId];
  const incompleteTasks = (myPlayer?.tasks || []).filter((t) => !t.completed);
  const otherPlayers = players.filter((p) => p.user_id !== currentUserId);

  if (myChoice) {
    const targetPlayer = players.find(
      (p) => p.user_id === myChoice.targetPlayerId,
    );
    const color = getPlayerColor(myChoice.targetPlayerId, roomPlayers);
    const avatarLabel = targetPlayer?.display_name?.[0]?.toUpperCase() || "?";
    return (
      <div className="mx-5 mb-4 flex items-center gap-2.5 px-4 py-3 border border-[#E5E7EB] rounded-lg">
        <span className="text-xs text-[#9CA3AF]">✓ Swapped with</span>
        <div className="flex items-center gap-1.5">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
            style={{ background: color }}
          >
            {avatarLabel}
          </div>
          <span className="text-xs font-semibold text-[#1A1A2E]">
            {targetPlayer?.display_name?.split(" ")[0] ?? "them"}
          </span>
        </div>
      </div>
    );
  }

  if (incompleteTasks.length === 0 || otherPlayers.length === 0) return null;

  const targetPlayer = players.find((p) => p.user_id === selectedTargetId);
  const targetIncompleteTasks = (targetPlayer?.tasks || []).filter(
    (t) => !t.completed,
  );

  async function handleSend() {
    if (!selectedTaskId || !selectedTargetId || !selectedTargetTaskId) return;
    setSubmitting(true);

    const myTask = myPlayer.tasks.find((t) => t.id === selectedTaskId);
    const target = players.find((p) => p.user_id === selectedTargetId);
    const targetTask = (target?.tasks || []).find(
      (t) => t.id === selectedTargetTaskId,
    );
    if (!myTask || !target || !targetTask) {
      setSubmitting(false);
      return;
    }

    const updatedMyTasks = myPlayer.tasks.map((t) =>
      t.id === selectedTaskId ? { ...t, difficulty: targetTask.difficulty } : t,
    );
    const updatedTargetTasks = (target.tasks || []).map((t) =>
      t.id === selectedTargetTaskId
        ? { ...t, difficulty: myTask.difficulty }
        : t,
    );

    const updatedEvents = events.map((e) =>
      e.id === event.id
        ? {
            ...e,
            data: {
              ...e.data,
              choices: {
                ...(e.data.choices || {}),
                [currentUserId]: {
                  taskId: selectedTaskId,
                  targetPlayerId: selectedTargetId,
                  targetTaskId: selectedTargetTaskId,
                },
              },
            },
          }
        : e,
    );

    await Promise.all([
      supabase
        .from("players")
        .update({ tasks: updatedMyTasks })
        .eq("user_id", currentUserId)
        .eq("room_id", roomId),
      supabase
        .from("players")
        .update({ tasks: updatedTargetTasks })
        .eq("user_id", selectedTargetId)
        .eq("room_id", roomId),
      supabase.from("rooms").update({ events: updatedEvents }).eq("id", roomId),
    ]);

    setSubmitting(false);
  }

  return (
    <div className="mx-5 mb-4 border border-[#E5E7EB] rounded-xl px-4 py-4 space-y-4">
      {/* Step 1: pick your task */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
          Send a task
        </p>
        <div className="flex flex-col gap-1.5">
          {incompleteTasks.map((t) => {
            const isSelected = selectedTaskId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedTaskId(t.id);
                  setSelectedTargetId("");
                  setSelectedTargetTaskId("");
                }}
                className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                  isSelected
                    ? "border-[#1A1A2E] bg-[#1A1A2E] text-white"
                    : "border-[#E5E7EB] bg-white text-[#1A1A2E] hover:border-[#9CA3AF]"
                }`}
              >
                <span className="text-base leading-none">
                  {DIFFICULTY_EMOJI[t.difficulty]}
                </span>
                <span className="font-semibold flex-1 truncate">{t.title}</span>
                <span
                  className={`flex-shrink-0 ${isSelected ? "text-white/60" : "text-[#9CA3AF]"}`}
                >
                  {DIFFICULTY[t.difficulty]?.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: pick a player */}
      {selectedTaskId && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            Pick a player
          </p>
          <div className="flex gap-3 pl-2">
            {otherPlayers.map((p) => {
              const color = getPlayerColor(p.user_id, roomPlayers);
              const isSelected = selectedTargetId === p.user_id;
              const avatarLabel = p.display_name?.[0]?.toUpperCase() || "?";
              return (
                <button
                  key={p.user_id}
                  onClick={() => {
                    setSelectedTargetId(p.user_id);
                    setSelectedTargetTaskId("");
                  }}
                  className="flex flex-col items-center gap-2.5 transition-all"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-base font-black text-white transition-all ${
                      isSelected
                        ? "ring-2 ring-offset-2 ring-[#1A1A2E] scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    style={{ background: color }}
                  >
                    {avatarLabel}
                  </div>
                  <span className="text-xs font-semibold text-[#1A1A2E]">
                    {p.display_name?.split(" ")[0] || "Player"}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 3: pick their task */}
      {selectedTargetId && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            Take a task
          </p>
          {targetIncompleteTasks.length === 0 ? (
            <p className="text-xs text-[#9CA3AF]">No incomplete tasks.</p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {targetIncompleteTasks.map((t) => {
                const isSelected = selectedTargetTaskId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTargetTaskId(t.id)}
                    className={`w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border text-xs transition-all ${
                      isSelected
                        ? "border-[#1A1A2E] bg-[#1A1A2E] text-white"
                        : "border-[#E5E7EB] bg-white text-[#1A1A2E] hover:border-[#9CA3AF]"
                    }`}
                  >
                    <span className="text-base leading-none">
                      {DIFFICULTY_EMOJI[t.difficulty]}
                    </span>
                    <span className="font-semibold flex-1 truncate">
                      {t.title}
                    </span>
                    <span
                      className={`flex-shrink-0 ${isSelected ? "text-white/60" : "text-[#9CA3AF]"}`}
                    >
                      {DIFFICULTY[t.difficulty]?.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={
          submitting ||
          !selectedTaskId ||
          !selectedTargetId ||
          !selectedTargetTaskId
        }
        className="w-full bg-[#1A1A2E] text-white font-bold py-2 rounded-lg text-xs hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
      >
        {submitting ? "Swapping..." : "Swap tasks"}
      </button>
    </div>
  );
}

export default function EventFeed({
  events = [],
  activeEvent,
  players = [],
  myPlayer,
  currentUserId,
  roomId,
  roomPlayers = [],
}) {
  const activeSwapEvent =
    activeEvent?.type === "task_swap" && isEventActive(activeEvent)
      ? activeEvent
      : null;

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Events</h2>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mb-2 text-5xl">🎲</div>
          <p className="text-sm text-[#6B7280] font-semibold">No events yet</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Events happen every other day
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F3F4F6]">
          {[...events].reverse().map((event, idx) => {
            const meta = EVENTS.find((e) => e.type === event.type);
            const isFirst = idx === 0;
            const day = new Date(event.triggeredAt).toLocaleDateString(
              undefined,
              { weekday: "long" },
            );
            return (
              <li key={event.id}>
                <div className="flex gap-3 px-5 py-4 items-start">
                  <span className="text-3xl flex-shrink-0">
                    {meta?.emoji ?? "📣"}
                  </span>
                  <div>
                    <p className="font-['JetBrains_Mono'] text-xs font-semibold text-[#1A1A2E] uppercase tracking-wider">
                      {meta?.name ?? event.type}
                    </p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{day}</p>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {meta?.description}
                    </p>
                    {event.data?.note && (
                      <p className="text-xs text-[#F59E0B] font-semibold mt-1">
                        {event.data.note}
                      </p>
                    )}
                  </div>
                </div>
                {myPlayer && event.type === "task_swap" && (
                  (isFirst && activeSwapEvent) ||
                  event.data?.choices?.[currentUserId]
                ) && (
                  <TaskSwapCard
                    event={isFirst && activeSwapEvent ? activeSwapEvent : event}
                    myPlayer={myPlayer}
                    players={players}
                    currentUserId={currentUserId}
                    roomId={roomId}
                    roomPlayers={roomPlayers}
                    events={events}
                  />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
