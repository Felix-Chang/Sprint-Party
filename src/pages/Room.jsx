import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/useGameStore";
import {
  PLAYER_COLORS,
  isEventActive,
  computeRaceBounds,
  calcPoints,
  BONUS_AWARDS,
  getPlayerColor,
} from "../lib/gameLogic";
import Leaderboard from "../components/Leaderboard";
import TaskList from "../components/TaskList";
import EventFeed from "../components/EventFeed";
import PowerUpInventory from "../components/PowerUpInventory";
import EventAnnouncementModal from "../components/EventModal";

export default function Room() {
  const { roomId } = useParams();
  const { user } = useUser();
  const showToast = useGameStore((s) => s.showToast);
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [myPlayer, setMyPlayer] = useState(null);
  const [draftDuration, setDraftDuration] = useState(7);
  const [announcedEvent, setAnnouncedEvent] = useState(null);

  useEffect(() => {
    if (!user) return;
    async function loadInitialData() {
      const { data: roomData } = await supabase
        .from("rooms")
        .select("*")
        .eq("id", roomId)
        .single();
      if (!roomData) {
        navigate("/dashboard");
        return;
      }
      setRoom(roomData);
      setDraftDuration(roomData.settings?.raceDuration ?? 7);

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomId);
      const all = playersData || [];
      setPlayers(all);
      setMyPlayer(all.find((p) => p.user_id === user.id) || null);
    }
    loadInitialData();
  }, [roomId, user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("room-" + roomId)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${roomId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            navigate("/dashboard");
            return;
          }
          setRoom(payload.new);
          setDraftDuration(payload.new.settings?.raceDuration ?? 7);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomId}`,
        },
        async () => {
          const { data } = await supabase
            .from("players")
            .select("*")
            .eq("room_id", roomId);
          const all = data || [];
          setPlayers(all);
          setMyPlayer(all.find((p) => p.user_id === user.id) || null);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  useEffect(() => {
    if (!room?.events?.length || !user) return
    try {
      const key = `shown_events_${roomId}`
      const shown = new Set(JSON.parse(localStorage.getItem(key) || '[]'))
      const unseenEvent = [...room.events].reverse().find((e) => !shown.has(e.id))
      if (unseenEvent && !announcedEvent) {
        setAnnouncedEvent(unseenEvent)
      }
    } catch {}
  }, [room?.events, roomId, user])

  async function saveDuration(days) {
    setDraftDuration(days);
    await supabase
      .from("rooms")
      .update({ settings: { ...room.settings, raceDuration: days } })
      .eq("id", roomId);
  }

  async function startRace() {
    const raceDuration = room.settings?.raceDuration ?? 7;
    const { raceStart, raceEnd } = computeRaceBounds(raceDuration);
    await supabase
      .from("rooms")
      .update({
        status: "active",
        week_start: raceStart.toISOString(),
        week_end: raceEnd.toISOString(),
      })
      .eq("id", roomId);
    showToast("Race started! 🏁", "success");
  }

  async function resetRace() {
    await Promise.all(
      players.map((p) =>
        supabase
          .from("players")
          .update({
            tasks: [],
            points: 0,
            bonus_stars_earned: [],
          })
          .eq("user_id", p.user_id)
          .eq("room_id", roomId),
      ),
    );
    await supabase
      .from("rooms")
      .update({
        status: "lobby",
        week_start: null,
        week_end: null,
        events: [],
        bonus_stars: [],
      })
      .eq("id", roomId);
    showToast("Room reset! Ready for a new race.", "success");
  }

  useEffect(() => {
    if (!room || room.status !== "active") return;
    const interval = setInterval(async () => {
      if (!room.week_end) return;
      if (Date.now() >= new Date(room.week_end).getTime()) {
        clearInterval(interval);
        await supabase
          .from("rooms")
          .update({ status: "finished" })
          .eq("id", roomId)
          .eq("status", "active");
      }
    }, 60_000);
    return () => clearInterval(interval);
  }, [room?.status, room?.week_end, roomId]);

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#6B7280] font-semibold">Loading...</div>
      </div>
    );
  }

  const isCreator = room.created_by === user?.id;
  const isLobby = room.status === "lobby";
  const isActive = room.status === "active";

  return (
    <div className="min-h-screen">
      {announcedEvent && (
        <EventAnnouncementModal
          event={announcedEvent}
          players={players}
          currentUserId={user?.id}
          roomId={roomId}
          onClose={() => setAnnouncedEvent(null)}
        />
      )}
      {/* Full-width sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] font-semibold transition-colors flex-shrink-0 cursor-pointer"
            >
              ← Back
            </button>
            <span className="text-[#E5E7EB]">|</span>
            <h1 className="font-black text-[#1A1A2E] truncate">{room.name}</h1>
            {isActive && (
              <span className="font-['JetBrains_Mono'] text-xs bg-[#F3F4F6] text-[#6B7280] px-2.5 py-1 rounded-md flex-shrink-0">
                {room.code}
              </span>
            )}
            <span className="text-xs text-[#9CA3AF] flex-shrink-0">
              {players.length}p
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        {/* Lobby */}
        {isLobby && (
          <div className="text-center py-16">
            <p className="text-sm text-[#9CA3AF] font-semibold uppercase tracking-widest mb-12">
              Waiting for players
            </p>

            {/* Player circles */}
            <div className="flex justify-center gap-8 mb-14">
              {players.map((p) => {
                const colorIdx = room.players.indexOf(p.user_id);
                const color = PLAYER_COLORS[colorIdx >= 0 ? colorIdx : 0];
                const initial = p.display_name?.[0]?.toUpperCase() || "?";
                return (
                  <div
                    key={p.user_id}
                    className="flex flex-col items-center gap-2"
                  >
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black"
                      style={{ background: color }}
                    >
                      {initial}
                    </div>
                    <span className="text-sm font-semibold text-[#1A1A2E]">
                      {p.display_name?.split(" ")[0] || "Player"}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Duration picker */}
            <div className="flex flex-col items-center gap-3 mb-14">
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
                Race duration
              </span>
              {isCreator ? (
                <div className="flex gap-2">
                  {[1, 3, 5, 7, 14].map((d) => (
                    <button
                      key={d}
                      onClick={() => saveDuration(d)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                        draftDuration === d
                          ? "bg-[#1A1A2E] text-white"
                          : "border border-[#E5E7EB] text-[#6B7280] hover:border-[#1A1A2E] hover:text-[#1A1A2E]"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#6B7280] font-semibold">
                  {draftDuration}-day race
                </p>
              )}
            </div>

            {/* Room Code */}
            <div className="flex flex-col items-center gap-2 mb-14">
              <span className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
                Invite Code
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(room.code);
                  showToast("Copied to clipboard!", "success");
                }}
                className="font-['JetBrains_Mono'] text-4xl font-bold tracking-[0.25em] text-[#1A1A2E] border-2 border-[#1A1A2E] rounded-2xl px-10 py-5 hover:bg-[#1A1A2E] hover:text-white transition-colors active:scale-95 cursor-pointer"
              >
                {room.code}
              </button>
              <span className="text-xs text-[#9CA3AF] font-medium">
                click to copy
              </span>
            </div>

            {isCreator ? (
              <button
                onClick={startRace}
                disabled={players.length < 1}
                className="bg-[#1A1A2E] text-white text-lg font-bold px-10 py-3.5 cursor-pointer rounded-2xl hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
              >
                Start race
              </button>
            ) : (
              <p className="text-sm text-[#6B7280] font-semibold">
                Waiting for the host to start...
              </p>
            )}
          </div>
        )}

        {/* Active Race — 2-column grid on wider screens */}
        {isActive &&
          myPlayer &&
          (() => {
            const activeEvent =
              [...(room.events || [])].reverse().find(isEventActive) ?? null;
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <Leaderboard
                    players={players}
                    currentUserId={user?.id}
                    roomPlayers={room.players}
                    activeEvent={activeEvent}
                  />
                  <EventFeed
                    events={room.events || []}
                    activeEvent={activeEvent}
                    players={players}
                    myPlayer={myPlayer}
                    currentUserId={user?.id}
                    roomId={roomId}
                    roomPlayers={room.players}
                  />
                </div>
                <div className="space-y-4">
                  <TaskList
                    player={myPlayer}
                    roomId={roomId}
                    activeEvent={activeEvent}
                  />
                  <PowerUpInventory
                    player={myPlayer}
                    players={players}
                    roomId={roomId}
                    roomPlayers={room.players}
                    activeEvent={activeEvent}
                  />
                </div>
              </div>
            );
          })()}

        {/* Finished */}
        {room.status === "finished" &&
          (() => {
            const ranked = [...players].sort(
              (a, b) => calcPoints(b) - calcPoints(a),
            );
            const winner = ranked[0];
            return (
              <div className="py-16 max-w-[680px] mx-auto">
                {/* Hero */}
                <div className="text-center mb-10">
                  <div className="text-6xl mb-3 select-none">🏁</div>
                  <h2 className="text-4xl font-black text-[#1A1A2E] mb-2">
                    Race Over!
                  </h2>
                  <p className="text-[#6B7280] font-semibold">
                    {room.settings?.raceDuration ?? 7}-day sprint complete
                  </p>
                </div>

                {/* Winner callout */}
                {winner && (
                  <div className="bg-[#1A1A2E] text-white rounded-2xl px-8 py-6 flex items-center gap-5 mb-6">
                    <div
                      className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white text-2xl font-black"
                      style={{
                        background: getPlayerColor(winner.user_id, room.players),
                      }}
                    >
                      {winner.display_name?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold uppercase tracking-widest text-[#9CA3AF] mb-1">
                        Winner
                      </div>
                      <div className="text-xl font-black truncate">
                        {winner.display_name}
                      </div>
                      <div className="text-[#9CA3AF] font-semibold text-sm mt-0.5">
                        {calcPoints(winner).toLocaleString()} pts
                      </div>
                    </div>
                    <div className="text-4xl">🥇</div>
                  </div>
                )}

                {/* Final standings */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-6">
                  <div className="px-5 py-4 border-b border-[#E5E7EB]">
                    <h3 className="font-bold text-[#1A1A2E]">
                      Final standings
                    </h3>
                  </div>
                  <Leaderboard
                    players={players}
                    currentUserId={user?.id}
                    roomPlayers={room.players}
                  />
                </div>

                {/* Bonus stars skeleton */}
                <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden mb-8">
                  <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center gap-2">
                    <span>⭐</span>
                    <h3 className="font-bold text-[#1A1A2E]">Bonus stars</h3>
                    <span className="ml-auto text-xs text-[#9CA3AF] font-medium">
                      coming soon
                    </span>
                  </div>
                  <div className="divide-y divide-[#F3F4F6]">
                    {BONUS_AWARDS.map((award) => (
                      <div
                        key={award.id}
                        className="flex items-center gap-4 px-5 py-4"
                      >
                        <span className="text-2xl">{award.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-sm text-[#1A1A2E]">
                            {award.name}
                          </div>
                          <div className="text-xs text-[#9CA3AF]">
                            {award.description}
                          </div>
                        </div>
                        <div className="w-24 h-7 bg-[#F3F4F6] rounded-full animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* New race — creator only */}
                {isCreator && (
                  <div className="text-center">
                    <button
                      onClick={resetRace}
                      className="bg-[#1A1A2E] text-white font-bold px-10 py-3.5 rounded-2xl hover:bg-[#2d2d4a] transition-colors active:scale-95 cursor-pointer text-lg"
                    >
                      Start new race
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
      </div>
    </div>
  );
}
