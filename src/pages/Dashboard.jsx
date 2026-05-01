import { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/clerk-react";
import { supabase } from "../lib/supabase";
import { useGameStore } from "../store/useGameStore";
import {
  generateRoomCode,
  getWeekBounds,
  PLAYER_COLORS,
} from "../lib/gameLogic";
import { useNavigate } from "react-router-dom";

const STATUS_LABEL = {
  lobby: { text: "Waiting", cls: "bg-[#F3F4F6] text-[#6B7280]" },
  active: { text: "● Live", cls: "bg-[#ECFDF5] text-[#059669]" },
  finished: { text: "Finished", cls: "bg-[#F3F4F6] text-[#1A1A2E]" },
};

export default function Dashboard() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const showToast = useGameStore((s) => s.showToast);
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadRooms();
  }, [user]);

  async function loadRooms() {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .contains("players", [user.id]);
    setRooms(data || []);
  }

  async function createRoom() {
    if (!roomName.trim()) return;
    setLoading(true);
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
        bonus_stars: [],
        settings: { maxPlayers: 6, eventsEnabled: true, powerUpsEnabled: true },
      })
      .select()
      .single();

    if (error) {
      showToast("Failed to create room", "error");
      setLoading(false);
      return;
    }

    await supabase.from("players").insert({
      user_id: user.id,
      room_id: room.id,
      display_name: user.fullName || user.primaryEmailAddress?.emailAddress,
      avatar: "🎮",
      tasks: [],
      points: 0,
      streak: 0,
      streak_multiplier: 1,
      power_ups: [],
      check_ins: [],
      bonus_stars_earned: [],
    });

    setRoomName("");
    setLoading(false);
    showToast(`Room created! Code: ${code}`, "success");
    navigate(`/room/${room.id}`);
  }

  async function joinRoom() {
    if (!joinCode.trim()) return;
    setLoading(true);

    const { data: room, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", joinCode.toUpperCase().trim())
      .single();

    if (error || !room) {
      showToast("Room not found. Check the code.", "error");
      setLoading(false);
      return;
    }

    if (room.players.includes(user.id)) {
      navigate(`/room/${room.id}`);
      setLoading(false);
      return;
    }

    if (room.players.length >= room.settings.maxPlayers) {
      showToast("Room is full!", "error");
      setLoading(false);
      return;
    }

    await supabase
      .from("rooms")
      .update({ players: [...room.players, user.id] })
      .eq("id", room.id);

    await supabase.from("players").insert({
      user_id: user.id,
      room_id: room.id,
      display_name: user.fullName || user.primaryEmailAddress?.emailAddress,
      avatar: "🎮",
      tasks: [],
      points: 0,
      streak: 0,
      streak_multiplier: 1,
      power_ups: [],
      check_ins: [],
      bonus_stars_earned: [],
    });

    setJoinCode("");
    setLoading(false);
    navigate(`/room/${room.id}`);
  }

  return (
    <div className="min-h-screen">
      {/* Full-width sticky header — establishes page frame on any viewport */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-black text-[#1A1A2E] tracking-tight">
            🏁 Sprint Party
          </span>
          <button
            onClick={() => signOut()}
            className="text-sm text-[#6B7280] hover:text-[#1A1A2E] font-semibold transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Centered content column */}
      <main className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        {/* Greeting */}
        <div className="mb-12">
          <h1 className="text-4xl font-black text-[#1A1A2E] leading-none mb-3">
            Hey, {user?.firstName || "racer"}
          </h1>
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
              onChange={(e) => setRoomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
              placeholder="Room name..."
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#1A1A2E] transition-colors mb-4 bg-[#FAFAFA]"
            />
            <button
              onClick={createRoom}
              disabled={loading || !roomName.trim()}
              className="w-full bg-[#1A1A2E] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
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
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
              placeholder="Invite code..."
              className="w-full border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] placeholder-[#9CA3AF] outline-none focus:border-[#1A1A2E] transition-colors mb-4 font-['JetBrains_Mono'] uppercase tracking-wider bg-[#FAFAFA]"
            />
            <button
              onClick={joinRoom}
              disabled={loading || !joinCode.trim()}
              className="w-full bg-[#1A1A2E] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
            >
              Join
            </button>
          </div>
        </div>

        {/* Rooms list */}
        {rooms.length > 0 && (
          <div className="text-xs font-bold text-[#6B7280] uppercase tracking-widest mb-5">
            Your races
          </div>
        )}

        {rooms.length === 0 ? (
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
                  className="w-full bg-white border border-[#E5E7EB] rounded-2xl px-6 py-5 text-left hover:border-[#1A1A2E] transition-all"
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
