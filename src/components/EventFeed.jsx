import { useState } from "react";
import { EVENTS, DIFFICULTY, isEventActive } from "../lib/gameLogic";
import { supabase } from "../lib/supabase";
import diceIcon from "../assets/icons/dice.png";

function TaskSwapCard({ event, myPlayer, players, currentUserId, roomId, events }) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const myChoice = event.data?.choices?.[currentUserId];
  const incompleteTasks = (myPlayer?.tasks || []).filter((t) => !t.completed);
  const otherPlayers = players.filter((p) => p.user_id !== currentUserId);

  if (myChoice) {
    const targetPlayer = players.find((p) => p.user_id === myChoice.targetPlayerId);
    const task = (myPlayer?.tasks || []).find((t) => t.id === myChoice.taskId);
    return (
      <div className="mx-5 mb-4 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-4 py-3 text-xs text-[#6B7280]">
        Sent ✓ — you passed <span className="font-semibold text-[#1A1A2E]">{task?.title ?? "a task"}</span> to{" "}
        <span className="font-semibold text-[#1A1A2E]">{targetPlayer?.display_name?.split(" ")[0] ?? "someone"}</span>
      </div>
    );
  }

  if (incompleteTasks.length === 0 || otherPlayers.length === 0) return null;

  async function handleSend() {
    if (!selectedTaskId || !selectedTargetId) return;
    setSubmitting(true);

    const task = myPlayer.tasks.find((t) => t.id === selectedTaskId);
    const targetPlayer = players.find((p) => p.user_id === selectedTargetId);
    if (!task || !targetPlayer) { setSubmitting(false); return; }

    const updatedMyTasks = myPlayer.tasks.filter((t) => t.id !== selectedTaskId);
    const updatedTargetTasks = [
      ...(targetPlayer.tasks || []),
      { ...task, originPlayerId: currentUserId },
    ];

    const updatedEvents = events.map((e) =>
      e.id === event.id
        ? { ...e, data: { ...e.data, choices: { ...(e.data.choices || {}), [currentUserId]: { taskId: selectedTaskId, targetPlayerId: selectedTargetId } } } }
        : e
    );

    await Promise.all([
      supabase.from("players").update({ tasks: updatedMyTasks }).eq("user_id", currentUserId).eq("room_id", roomId),
      supabase.from("players").update({ tasks: updatedTargetTasks }).eq("user_id", selectedTargetId).eq("room_id", roomId),
      supabase.from("rooms").update({ events: updatedEvents }).eq("id", roomId),
    ]);

    setSubmitting(false);
  }

  return (
    <div className="mx-5 mb-4 border border-[#E5E7EB] rounded-lg px-4 py-3 space-y-2">
      <p className="text-xs font-bold text-[#1A1A2E]">Task Swap — offload a task</p>
      <select
        value={selectedTaskId}
        onChange={(e) => setSelectedTaskId(e.target.value)}
        className="w-full border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#1A1A2E] outline-none focus:border-[#1A1A2E] bg-white"
      >
        <option value="">Pick a task...</option>
        {incompleteTasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.title} ({DIFFICULTY[t.difficulty]?.label})
          </option>
        ))}
      </select>
      <select
        value={selectedTargetId}
        onChange={(e) => setSelectedTargetId(e.target.value)}
        className="w-full border border-[#E5E7EB] rounded-lg px-2 py-1.5 text-xs text-[#1A1A2E] outline-none focus:border-[#1A1A2E] bg-white"
      >
        <option value="">Pick a player...</option>
        {otherPlayers.map((p) => (
          <option key={p.user_id} value={p.user_id}>
            {p.display_name?.split(" ")[0] || "Player"}
          </option>
        ))}
      </select>
      <button
        onClick={handleSend}
        disabled={submitting || !selectedTaskId || !selectedTargetId}
        className="w-full bg-[#1A1A2E] text-white font-bold py-1.5 rounded-lg text-xs hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
      >
        {submitting ? "Sending..." : "Send task"}
      </button>
    </div>
  );
}

export default function EventFeed({ events = [], activeEvent, players = [], myPlayer, currentUserId, roomId }) {
  const showSwapCard = activeEvent?.type === "task_swap" && isEventActive(activeEvent);

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Events</h2>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mb-2">
            <img src={diceIcon} className="w-20 h-20 mx-auto" alt="" />
          </div>
          <p className="text-sm text-[#6B7280] font-semibold">No events yet</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Fires Tuesday, Thursday & Saturday
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F3F4F6]">
          {[...events].reverse().map((event, idx) => {
            const meta = EVENTS.find((e) => e.type === event.type);
            const isFirst = idx === 0;
            return (
              <li key={event.id}>
                <div className="flex gap-3 px-5 py-4 items-start">
                  {meta?.icon ? (
                    <img src={meta.icon} className="w-12 h-12 flex-shrink-0" alt="" />
                  ) : (
                    <span className="text-2xl flex-shrink-0">📣</span>
                  )}
                  <div>
                    <p className="font-['JetBrains_Mono'] text-xs font-semibold text-[#1A1A2E] uppercase tracking-wider">
                      {meta?.name ?? event.type}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-0.5">{meta?.description}</p>
                    {event.data?.note && (
                      <p className="text-xs text-[#F59E0B] font-semibold mt-1">{event.data.note}</p>
                    )}
                  </div>
                </div>
                {isFirst && showSwapCard && myPlayer && (
                  <TaskSwapCard
                    event={activeEvent}
                    myPlayer={myPlayer}
                    players={players}
                    currentUserId={currentUserId}
                    roomId={roomId}
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
