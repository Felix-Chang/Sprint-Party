import {
  DIFFICULTY,
  getStreakMultiplier,
  getPlayerColor,
} from "../lib/gameLogic";
import fireIcon from "../assets/icons/fire.png";

function calcPoints(player) {
  const base = (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (DIFFICULTY[t.difficulty]?.points ?? 0), 0);
  return (
    Math.floor(base * getStreakMultiplier(player.streak || 0)) +
    (player.points || 0)
  );
}

export default function Leaderboard({
  players,
  currentUserId,
  roomPlayers = [],
}) {
  const ranked = [...players].sort((a, b) => calcPoints(b) - calcPoints(a));

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Leaderboard</h2>
      </div>
      <ul>
        {ranked.map((player, i) => {
          const pts = calcPoints(player);
          const done = (player.tasks || []).filter((t) => t.completed).length;
          const total = (player.tasks || []).length;
          const isYou = player.user_id === currentUserId;
          const color = getPlayerColor(player.user_id, roomPlayers);
          const initial = player.display_name?.[0]?.toUpperCase() || "?";
          const firstName = player.display_name?.split(" ")[0] || "Player";

          return (
            <li
              key={player.user_id}
              className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#E5E7EB] last:border-0 ${isYou ? "bg-[#F9FAFB]" : ""}`}
            >
              <span className="w-6 text-center text-sm font-black text-[#6B7280]">
                {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
              </span>
              <div
                className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-black text-sm"
                style={{ background: color }}
              >
                {initial}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-sm text-[#1A1A2E]">
                  {firstName}{" "}
                  {isYou && (
                    <span className="text-[#9CA3AF] font-semibold text-xs">
                      (you)
                    </span>
                  )}
                </div>
                <div className="text-xs text-[#6B7280]">
                  {total ? `(${done}/${total} tasks)` : "No tasks"}
                  {player.streak > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      {" "}
                      · {player.streak}
                      <img
                        src={fireIcon}
                        className="w-[20px] h-[20px] inline"
                        alt=""
                      />
                    </span>
                  )}
                </div>
              </div>
              <span className="font-black text-lg text-[#1A1A2E]">
                {pts.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
