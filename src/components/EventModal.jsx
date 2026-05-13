import Modal from "./Modal";
import { EVENTS, DIFFICULTY, DIFFICULTY_EMOJI } from "../lib/gameLogic";

function EventDetail({ event, players, currentUserId }) {
  const { type, data } = event;

  if (type === "task_swap") {
    return (
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 text-sm text-[#6B7280]">
        Head to <span className="font-bold text-[#1A1A2E]">Events</span> below
        to pick which task to offload to another player.
      </div>
    );
  }

  if (type === "mystery_bonus") {
    const diff = data?.difficulty;
    const label = DIFFICULTY[diff]?.label ?? "Unknown";
    const emoji = DIFFICULTY_EMOJI[diff] ?? "❓";
    const bonusPoints = data?.bonusPoints ?? 100;
    return (
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 space-y-2">
        <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
          Bonus Difficulty
        </p>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <span className="text-base font-black text-[#1A1A2E]">{label}</span>
          <span className="ml-auto text-sm font-bold text-[#16A34A]">
            +{bonusPoints} pts
          </span>
        </div>
        <p className="text-xs text-[#6B7280]">
          Every {label.toLowerCase()} task you complete today earns +
          {bonusPoints} bonus pts.
        </p>
      </div>
    );
  }

  if (type === "team_up") {
    const teams = data?.teams ?? { magenta: [], lime: [] };
    const isOnMagenta = teams.magenta?.includes(currentUserId);
    const myTeamKey = isOnMagenta ? "magenta" : "lime";
    const myTeamIds = teams[myTeamKey] ?? [];
    const teammates = players.filter(
      (p) => myTeamIds.includes(p.user_id) && p.user_id !== currentUserId,
    );
    const teamColor = isOnMagenta ? "#FF69B4" : "#2ECC71";
    const teamName = isOnMagenta ? "Magenta" : "Lime";
    const bonusPoints = data?.bonusPoints ?? 300;
    return (
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full flex-shrink-0"
            style={{ background: teamColor }}
          />
          <span className="text-sm font-black text-[#1A1A2E]">
            Team {teamName}
          </span>
        </div>
        {teammates.length > 0 ? (
          <p className="text-xs text-[#6B7280]">
            Teammates:{" "}
            <span className="font-semibold text-[#1A1A2E]">
              {teammates.map((p) => p.display_name?.split(" ")[0]).join(", ")}
            </span>
          </p>
        ) : (
          <p className="text-xs text-[#6B7280]">
            You&apos;re flying solo on this team!
          </p>
        )}
        <p className="text-xs text-[#6B7280]">
          The team that completes the most tasks today earns{" "}
          <span className="font-bold text-[#16A34A]">+{bonusPoints} pts</span>{" "}
          per member.
        </p>
      </div>
    );
  }

  if (type === "blitz") {
    const bonusPoints = data?.bonusPoints ?? 50;
    return (
      <div className="bg-[#FEF9C3] border border-[#FDE047] rounded-xl px-4 py-3 text-sm">
        <span className="font-black text-[#1A1A2E] text-base">
          +{bonusPoints} pts
        </span>
        <span className="text-[#6B7280]"> on every task today.</span>
      </div>
    );
  }

  if (type === "bounty") {
    const isTarget = currentUserId === data?.targetPlayerId;
    const targetPlayer = players.find(
      (p) => p.user_id === data?.targetPlayerId,
    );
    const targetName = targetPlayer?.display_name?.split(" ")[0] ?? "Someone";
    const stealPoints = data?.stealPoints ?? 200;
    const bonusPoints = data?.bonusPoints ?? 300;

    if (isTarget) {
      return (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3 space-y-1">
          <p className="text-sm font-black text-[#DC2626]">
            ☠️ You&apos;re the bounty!
          </p>
          <p className="text-xs text-[#6B7280]">
            Everyone is hunting you. Finish more tasks than your rivals today to
            survive and earn{" "}
            <span className="font-bold text-[#16A34A]">+{bonusPoints} pts</span>
            .
          </p>
        </div>
      );
    }

    return (
      <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-4 py-3 space-y-1">
        <p className="text-sm font-bold text-[#1A1A2E]">
          Target: <span className="font-black">{targetName}</span>
        </p>
        <p className="text-xs text-[#6B7280]">
          Finish more tasks than them today to steal{" "}
          <span className="font-bold text-[#DC2626]">{stealPoints} pts</span>.
          They survive and earn{" "}
          <span className="font-bold text-[#16A34A]">+{bonusPoints} pts</span>.
        </p>
      </div>
    );
  }

  return null;
}

export default function EventAnnouncementModal({
  event,
  players,
  currentUserId,
  roomId,
  onClose,
}) {
  if (!event) return null;

  const meta = EVENTS.find((e) => e.type === event.type);

  function handleClose() {
    try {
      const key = `shown_events_${roomId}`;
      const shown = JSON.parse(localStorage.getItem(key) || "[]");
      if (!shown.includes(event.id)) {
        localStorage.setItem(key, JSON.stringify([...shown, event.id]));
      }
    } catch {}
    onClose();
  }

  return (
    <Modal isOpen onClose={handleClose}>
      <div className="px-6 pt-8 pb-6 space-y-5">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="text-6xl">{meta?.emoji ?? "📣"}</div>
          <p className="text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">
            Event
          </p>
          <h2 className="text-2xl font-black text-[#1A1A2E]">
            {meta?.name ?? event.type}
          </h2>
          <p className="text-sm text-[#6B7280]">{meta?.description}</p>
        </div>

        {/* Per-event detail */}
        <EventDetail
          event={event}
          players={players}
          currentUserId={currentUserId}
        />

        <button
          onClick={handleClose}
          className="w-full bg-[#1A1A2E] text-white font-black py-3 rounded-xl hover:bg-[#2d2d4a] transition-colors active:scale-95 text-sm"
        >
          Let&apos;s go! →
        </button>
      </div>
    </Modal>
  );
}
