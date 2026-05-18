import Modal from "./Modal";
import {
  getPlayerColor,
  calcPoints,
  isGhostMode,
  DIFFICULTY,
  DIFFICULTY_EMOJI,
} from "../lib/gameLogic";

export default function PlayerTasksModal({
  player,
  roomPlayers,
  isOpen,
  onClose,
}) {
  if (!player) return null;

  const color = getPlayerColor(player.user_id, roomPlayers);
  const initial = player.display_name?.[0]?.toUpperCase() || "?";
  const firstName = player.display_name?.split(" ")[0] || "Player";
  const ghost = isGhostMode(player);
  const pts = calcPoints(player);
  const tasks = player.tasks || [];
  const incomplete = tasks.filter((t) => !t.completed);
  const complete = tasks.filter((t) => t.completed);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="px-6 pt-8 pb-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-black text-base"
            style={{ background: ghost ? "#9CA3AF" : color }}
          >
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-[#1A1A2E] text-base">
              {firstName}'s Tasks
            </div>
            <div className="text-xs text-[#9CA3AF] font-semibold">
              {ghost ? "Incognito mode active" : `${pts.toLocaleString()} pts`}
            </div>
          </div>
          {!ghost && (
            <div className="text-xs text-[#9CA3AF] font-semibold tabular-nums flex-shrink-0">
              {complete.length}/{tasks.length}
            </div>
          )}
        </div>

        {ghost ? (
          <div className="text-center py-6">
            <div className="text-5xl mb-3">🕵️</div>
            <p className="text-sm font-bold text-[#1A1A2E]">Going incognito</p>
            <p className="text-xs text-[#9CA3AF] mt-1">
              {firstName} is hiding their activity right now
            </p>
          </div>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-4">
            No tasks submitted yet
          </p>
        ) : (
          <div className="space-y-4">
            {incomplete.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">
                  In Progress
                </div>
                <ul className="space-y-1">
                  {incomplete.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]"
                    >
                      <span className="text-[#D1D5DB] text-base flex-shrink-0">
                        ⬜
                      </span>
                      <span className="flex-1 text-sm text-[#1A1A2E] font-medium min-w-0 truncate">
                        {t.title}
                      </span>
                      <span className="flex-shrink-0 text-xs text-[#6B7280] font-bold tabular-nums">
                        {DIFFICULTY_EMOJI[t.difficulty]}{" "}
                        {DIFFICULTY[t.difficulty]?.points ?? 0} pts
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {complete.length > 0 && (
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-[#9CA3AF] mb-2">
                  Completed
                </div>
                <ul className="space-y-1">
                  {complete.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-2.5 py-1.5 px-3 rounded-xl bg-[#F0FDF4] border border-[#D1FAE5]"
                    >
                      <span className="text-[#10B981] text-base flex-shrink-0">
                        ✅
                      </span>
                      <span className="flex-1 text-sm text-[#6B7280] font-medium min-w-0 truncate line-through">
                        {t.title}
                      </span>
                      <span className="flex-shrink-0 text-xs text-[#6B7280] font-bold tabular-nums">
                        {DIFFICULTY_EMOJI[t.difficulty]}{" "}
                        {DIFFICULTY[t.difficulty]?.points ?? 0}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
