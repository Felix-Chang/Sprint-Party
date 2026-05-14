import { useEffect, useRef, useState } from "react";
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
  POWER_UPS,
  countUsablePowerUps,
  MAX_POWER_UPS,
} from "../lib/gameLogic";
import Leaderboard from "../components/Leaderboard";
import TaskList from "../components/TaskList";
import EventFeed from "../components/EventFeed";
import PowerUpInventory from "../components/PowerUpInventory";
import EventAnnouncementModal from "../components/EventModal";
import WinnerReveal from "../components/WinnerReveal";
import IncomingEffectModal from "../components/IncomingEffectModal";
import Skeleton from "../components/Skeleton";

export function RoomSkeleton() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen">
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
            <Skeleton className="h-5 w-48 flex-shrink-0" />
            <Skeleton className="h-6 w-20 flex-shrink-0" />
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-12" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="border-l-4 border-[#E5E7EB] pl-4 py-2">
                    <Skeleton className="h-4 w-40 mb-2" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5">
              <Skeleton className="h-5 w-32 mb-4" />
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-[#E5E7EB] rounded-xl">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [incomingEffect, setIncomingEffect] = useState(null); // { type, attackerName }
  const prevMyPlayer = useRef(null);
  const dailyGrantRef = useRef(false);

  useEffect(() => {
    if (!user || !myPlayer || !room || room.status !== "active" || dailyGrantRef.current) return;
    const today = new Date().toISOString().slice(0, 10);
    const key = `daily_powerup_${roomId}_${user.id}`;
    if (localStorage.getItem(key) === today) return;
    if (countUsablePowerUps(myPlayer.power_ups) >= MAX_POWER_UPS) return;
    dailyGrantRef.current = true;
    const allKeys = Object.keys(POWER_UPS).filter((k) => k !== "freeze");
    const granted = allKeys[Math.floor(Math.random() * allKeys.length)];
    const updated = [...(myPlayer.power_ups ?? []), granted];
    supabase.from("players").update({ power_ups: updated }).eq("user_id", user.id).eq("room_id", roomId).then(() => {
      localStorage.setItem(key, today);
      showToast(`${POWER_UPS[granted].emoji} Daily power-up: ${POWER_UPS[granted].name}!`, "success");
    });
  }, [myPlayer?.user_id, room?.status]);

  useEffect(() => {
    if (!user) return;
    async function loadInitialData() {
      const [{ data: roomData }, { data: playersData }] = await Promise.all([
        supabase
          .from("rooms")
          .select("*")
          .eq("id", roomId)
          .single(),
        supabase
          .from("players")
          .select("*")
          .eq("room_id", roomId),
      ]);
      if (!roomData) {
        navigate("/dashboard");
        return;
      }
      setRoom(roomData);
      setDraftDuration(roomData.settings?.raceDuration ?? 7);
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
        (payload) => {
          setPlayers((prev) => {
            let all = prev;
            if (payload.eventType === "DELETE") {
              all = prev.filter((p) => p.user_id !== payload.old.user_id);
            } else if (payload.eventType === "UPDATE") {
              all = prev.map((p) => p.user_id === payload.new.user_id ? payload.new : p);
            } else if (payload.eventType === "INSERT") {
              const exists = prev.some((p) => p.user_id === payload.new.user_id);
              all = exists ? prev : [...prev, payload.new];
            }
            setMyPlayer(all.find((p) => p.user_id === user.id) || null);
            return all;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, user]);

  useEffect(() => {
    if (!room?.events?.length || !user) return;
    try {
      const key = `shown_events_${roomId}`;
      const shown = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      const unseenEvent = [...room.events]
        .reverse()
        .find((e) => !shown.has(e.id));
      if (unseenEvent && !announcedEvent) {
        setAnnouncedEvent(unseenEvent);
      }
    } catch {}
  }, [room?.events, roomId, user]);

  useEffect(() => {
    const prev = prevMyPlayer.current
    prevMyPlayer.current = myPlayer

    if (!prev || !myPlayer) return

    // Detect incoming freeze: new stringified freeze marker in power_ups
    const prevFreezeCount = (prev.power_ups ?? []).filter((p) => {
      try { return JSON.parse(p)?.type === 'freeze' } catch { return false }
    }).length
    const newFreezeCount = (myPlayer.power_ups ?? []).filter((p) => {
      try { return JSON.parse(p)?.type === 'freeze' } catch { return false }
    }).length
    if (newFreezeCount > prevFreezeCount) {
      const marker = (myPlayer.power_ups ?? [])
        .map((p) => { try { return JSON.parse(p) } catch { return null } })
        .find((p) => p?.type === 'freeze')
      const attacker = players.find((p) => p.user_id === marker?.sourceId)
      setIncomingEffect({ type: 'freeze', attackerName: attacker?.display_name?.split(' ')[0] ?? null })
      return
    }

    // Detect incoming sabotage: a task gained taskConstraint that wasn't there before
    const prevSabotagedIds = new Set(
      (prev.tasks ?? []).filter((t) => t.taskConstraint === 'easy_first').map((t) => t.id)
    )
    const newlySabotaged = (myPlayer.tasks ?? []).find(
      (t) => t.taskConstraint === 'easy_first' && !prevSabotagedIds.has(t.id)
    )
    if (newlySabotaged) {
      const attacker = players.find((p) => p.user_id === newlySabotaged.sabotagedBy)
      setIncomingEffect({ type: 'sabotage', attackerName: attacker?.display_name?.split(' ')[0] ?? null })
      return
    }

    // Detect shield consumed by an incoming attack
    const hadShield = (prev.power_ups ?? []).includes('shield')
    const hasShield = (myPlayer.power_ups ?? []).includes('shield')
    if (hadShield && !hasShield) {
      showToast('🛡️ Your shield blocked an incoming attack!', 'success')
      return
    }

    // Detect point heist: points column decreased and player was not frozen (freeze offset looks identical)
    const wasFreezeClearance = (prev.power_ups ?? []).some((p) => {
      try { const m = typeof p === 'object' ? p : JSON.parse(p); return m?.type === 'freeze' } catch { return false }
    }) && (myPlayer.power_ups ?? []).every((p) => {
      try { const m = typeof p === 'object' ? p : JSON.parse(p); return m?.type !== 'freeze' } catch { return true }
    })
    if (!wasFreezeClearance && (myPlayer.points ?? 0) < (prev.points ?? 0)) {
      const stolen = (prev.points ?? 0) - (myPlayer.points ?? 0)
      showToast(`🏴‍☠️ Someone stole ${stolen} pts from you!`, 'error')
    }
  }, [myPlayer])

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
    setShowLeaderboard(false);
    await Promise.all(
      players.map((p) =>
        supabase
          .from("players")
          .update({
            tasks: [],
            points: 0,
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
    return <RoomSkeleton />;
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
      {incomingEffect && (
        <IncomingEffectModal
          effect={incomingEffect.type}
          attackerName={incomingEffect.attackerName}
          onClose={() => setIncomingEffect(null)}
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

      {/* Content — hidden when finished to avoid cream gap above WinnerReveal */}
      {room.status !== "finished" && <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">
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
      </div>}

      {/* Finished — full-screen winner reveal, inside outer wrapper but outside the max-w-5xl content div */}
      {room.status === "finished" && (
        <>
          <WinnerReveal
            players={players}
            currentUserId={user?.id}
            roomPlayers={room.players}
            onViewLeaderboard={() => {
              setShowLeaderboard(true);
              setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 50);
            }}
          />
          {showLeaderboard && (
            <div className="max-w-[680px] mx-auto px-6 pb-16 pt-10">
              <div className="mb-6">
                <Leaderboard
                  players={players}
                  currentUserId={user?.id}
                  roomPlayers={room.players}
                  title="Final Standings"
                />
              </div>

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
          )}
        </>
      )}
    </div>
  );
}
