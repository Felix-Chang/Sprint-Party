import { useState, useEffect } from "react";
import { useUser, useClerk, useAuth } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/useGameStore";
import {
  generateRoomCode,
  getWeekBounds,
  PLAYER_COLORS,
} from "../lib/gameLogic";
import { useNavigate } from "react-router-dom";
import Skeleton from "../components/Skeleton";

const STATUS_LABEL = {
  lobby: { text: "Waiting", cls: "bg-[#F3F4F6] text-[#6B7280]" },
  active: { text: "● Live", cls: "bg-[#ECFDF5] text-[#059669]" },
  finished: { text: "Finished", cls: "bg-[#F3F4F6] text-[#1A1A2E]" },
};

export default function Dashboard() {
  const { user } = useUser();
  const { userId } = useAuth();
  const { signOut } = useClerk();
  const showToast = useGameStore((s) => s.showToast);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [joinCode, setJoinCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [roomNameError, setRoomNameError] = useState(false);
  const [joinCodeError, setJoinCodeError] = useState(false);
  const [displayName, setDisplayName] = useState(() =>
    userId ? (localStorage.getItem(`displayName_${userId}`) || null) : null
  );
  const [nameReady, setNameReady] = useState(
    () => !!(userId && localStorage.getItem(`displayName_${userId}`))
  );
  const [isEditingName, setIsEditingName] = useState(false);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (!userId) return;
    loadRooms();
    fetchDisplayName();
  }, [userId]);

  async function fetchDisplayName() {
    if (!user) return;
    const { data } = await supabase
      .from("players")
      .select("display_name")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (data?.display_name) setDisplayName(data.display_name);
    setNameReady(true);
  }

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .contains("players", [userId]);
    setRooms(data || []);
    setRoomsLoading(false);
  }

  async function createRoom() {
    if (!roomName.trim()) {
      setRoomNameError(true);
      return;
    }
    setCreateLoading(true);
    const code = generateRoomCode();
    const { weekStart, weekEnd } = getWeekBounds();

    const { data: room, error } = await supabase
      .from("rooms")
      .insert({
        name: roomName.trim(),
        code,
        created_by: user.id,
        players: [user.id],
        status: "lobby",
        week_start: weekStart.toISOString(),
        week_end: weekEnd.toISOString(),
        events: [],
        settings: {
          maxPlayers: 8,
          eventsEnabled: true,
          powerUpsEnabled: true,
          raceDuration: 7,
        },
      })
      .select()
      .single();

    if (error) {
      showToast("Failed to create room", "error");
      setCreateLoading(false);
      return;
    }

    const finalDisplayName = displayName || localStorage.getItem(`displayName_${user.id}`) || user.fullName || user.primaryEmailAddress?.emailAddress;
    await supabase.from("players").insert({
      user_id: user.id,
      room_id: room.id,
      display_name: finalDisplayName,
      tasks: [],
      points: 0,
      power_ups: [],
    });

    setRoomName("");
    setCreateLoading(false);
    showToast(`Room created! Code: ${code}`, "success");
    navigate(`/room/${room.id}`);
  }

  async function joinRoom() {
    if (!joinCode.trim()) {
      setJoinCodeError(true);
      return;
    }
    setJoinLoading(true);

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", joinCode.toUpperCase().trim())
      .single();

    if (error || !room) {
      showToast("Room not found. Check the code.", "error");
      setJoinLoading(false);
      return;
    }

    if (room.players.includes(user.id)) {
      navigate(`/room/${room.id}`);
      setJoinLoading(false);
      return;
    }

    if (room.players.length >= room.settings.maxPlayers) {
      showToast("Room is full!", "error");
      setJoinLoading(false);
      return;
    }

    await supabase
      .from("rooms")
      .update({ players: [...room.players, user.id] })
      .eq("id", room.id);

    const finalDisplayName = displayName || localStorage.getItem(`displayName_${user.id}`) || user.fullName || user.primaryEmailAddress?.emailAddress;
    await supabase.from("players").insert({
      user_id: user.id,
      room_id: room.id,
      display_name: finalDisplayName,
      tasks: [],
      points: 0,
      power_ups: [],
    });

    setJoinCode("");
    setJoinLoading(false);
    navigate(`/room/${room.id}`);
  }

  async function handleSaveName() {
    const trimmed = editValue.trim().slice(0, 15);
    if (!trimmed) return;
    const { error } = await supabase
      .from("players")
      .update({ display_name: trimmed })
      .eq("user_id", user.id);
    if (!error) {
      setDisplayName(trimmed);
      localStorage.setItem(`displayName_${user.id}`, trimmed);
      setIsEditingName(false);
      showToast("Display name updated!", "success");
    } else {
      showToast("Failed to update name", "error");
    }
  }

  return (
    <div className="min-h-screen">
      {/* Full-width sticky header — establishes page frame on any viewport */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-black text-[#1A1A2E] tracking-tight text-xl">
            🏁 Sprint Party
          </span>
          <button
            onClick={() => signOut()}
            className="text-sm text-[#6B7280] hover:text-[#1A1A2E] font-semibold transition-colors cursor-pointer"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Centered content column */}
      <main className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        {/* Greeting */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            {isEditingName ? (
              <>
                <input
                  autoFocus
                  maxLength={15}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="text-4xl font-black bg-transparent border-b-2 border-[#6366F1] outline-none text-[#1A1A2E] w-64"
                />
                <button
                  onClick={handleSaveName}
                  className="text-green-500 hover:text-green-600 transition-colors cursor-pointer"
                  title="Save"
                >
                  ✓
                </button>
                <button
                  onClick={() => setIsEditingName(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  title="Cancel"
                >
                  ✕
                </button>
              </>
            ) : nameReady ? (
              <>
                <h1 className="text-4xl font-black text-[#1A1A2E] leading-none">
                  Hey, {displayName || user?.firstName || "racer"}
                </h1>
                <button
                  onClick={() => {
                    setEditValue(displayName || user?.firstName || "");
                    setIsEditingName(true);
                  }}
                  className="text-gray-400 hover:text-gray-600 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                  title="Edit display name"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              </>
            ) : (
              <Skeleton className="h-10 w-48" />
            )}
          </div>
          <p className="text-[#6B7280] font-semibold">Ready to race?</p>
        </div>

        {/* Create / Join */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8">
            <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-5">
              Create a room
            </div>
            <input
              value={roomName}
              onChange={(e) => {
                setRoomName(e.target.value);
                setRoomNameError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              placeholder="Room name..."
              className={`w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none mb-4 bg-[#FAFAFA] ${roomNameError ? "border border-[#EF4444] animate-field-error" : "border border-[#E5E7EB] focus:border-[#1A1A2E]"} transition-colors`}
            />
            <button
              onClick={createRoom}
              disabled={createLoading}
              className="w-full bg-[#1A1A2E] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40 cursor-pointer"
            >
              Create
            </button>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8">
            <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-5">
              Join a room
            </div>
            <input
              value={joinCode}
              onChange={(e) => {
                setJoinCode(e.target.value);
                setJoinCodeError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="Invite code..."
              className={`w-full rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none mb-4 font-['JetBrains_Mono'] uppercase tracking-wider bg-[#FAFAFA] ${joinCodeError ? "border border-[#EF4444] animate-field-error" : "border border-[#E5E7EB] focus:border-[#1A1A2E]"} transition-colors`}
            />
            <button
              onClick={joinRoom}
              disabled={joinLoading}
              className="w-full bg-[#1A1A2E] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40 cursor-pointer"
            >
              Join
            </button>
          </div>
        </div>

        {/* Rooms list */}
        {!roomsLoading && rooms.length > 0 && (
          <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-5">
            Your races
          </div>
        )}

        {roomsLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <Skeleton className="h-5 w-40 mb-2" />
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        {[...Array(3)].map((_, j) => (
                          <Skeleton key={j} className="w-5 h-5 rounded-full" />
                        ))}
                      </div>
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="h-4 w-14" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">🎮</div>
            <p className="font-bold text-[#6B7280]">No races yet.</p>
            <p className="text-sm text-[#9CA3AF] mt-1">
              Create a room or join one with an invite code.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room) => {
              const status = STATUS_LABEL[room.status] || STATUS_LABEL.lobby;
              return (
                <button
                  key={room.id}
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-6 py-5 text-left hover:border-[#1A1A2E] hover:shadow-sm active:scale-[0.99] cursor-pointer transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-[#1A1A2E] text-base">
                        {room.name}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex -space-x-1">
                          {room.players.map((_, i) => (
                            <div
                              key={i}
                              className="w-5 h-5 rounded-full border-2 border-white"
                              style={{
                                background:
                                  PLAYER_COLORS[i % PLAYER_COLORS.length],
                              }}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-[#6B7280] font-medium">
                          {room.players.length} player
                          {room.players.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${status.cls}`}
                      >
                        {status.text}
                      </span>
                      <span className="font-['JetBrains_Mono'] text-xs text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">
                        {room.code}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
