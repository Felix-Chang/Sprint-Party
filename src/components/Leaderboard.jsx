import { memo } from "react";
import SlotCounter from "react-slot-counter";
import {
  DIFFICULTY,
  getStreakMultiplier,
  getPlayerColor,
  isEventActive,
} from "../lib/gameLogic";

function calcPoints(player) {
  const base = (player.tasks || [])
    .filter((t) => t.completed)
    .reduce((sum, t) => sum + (DIFFICULTY[t.difficulty]?.points ?? 0), 0);
  return (
    Math.floor(base * getStreakMultiplier(player.streak || 0)) +
    (player.points || 0)
  );
}

const PlayerRow = memo(function PlayerRow({
  player,
  rank,
  currentUserId,
  roomPlayers,
  isBountyTarget,
  teamColor,
}) {
  const pts = calcPoints(player);
  const done = (player.tasks || []).filter((t) => t.completed).length;
  const total = (player.tasks || []).length;
  const isYou = player.user_id === currentUserId;
  const color = getPlayerColor(player.user_id, roomPlayers);
  const initial = player.display_name?.[0]?.toUpperCase() || "?";
  const firstName = player.display_name?.split(" ")[0] || "Player";

  return (
    <li
      className={`flex items-center gap-3 px-5 py-3.5 border-b border-[#E5E7EB] last:border-0 ${isYou ? "bg-[#F9FAFB]" : ""}`}
      style={
        isBountyTarget
          ? { borderLeft: "3px solid #F59E0B" }
          : teamColor
            ? { borderLeft: `3px solid ${teamColor}` }
            : {}
      }
    >
      <span className="w-6 text-center text-sm font-black text-[#6B7280]">
        {rank === 0
          ? "🥇"
          : rank === 1
            ? "🥈"
            : rank === 2
              ? "🥉"
              : `${rank + 1}`}
      </span>
      <div
        className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white font-black text-sm"
        style={{ background: color }}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-[#1A1A2E]">
          {isBountyTarget && <span className="mr-1">☠️</span>}
          {firstName}{" "}
          {isYou && (
            <span className="text-[#9CA3AF] font-semibold text-xs">(you)</span>
          )}
        </div>
        <div className="text-xs text-[#6B7280]">
          {total ? `(${done}/${total} tasks) ` : "No tasks"}
          {player.streak > 0 && (
            <span className="inline-flex items-center gap-0.5">
              {"  "}
              {player.streak}
              🔥
            </span>
          )}
        </div>
      </div>
      <span className="font-black text-lg text-[#1A1A2E] tabular-nums">
        <SlotCounter value={pts.toLocaleString()} />
      </span>
    </li>
  );
});

export default function Leaderboard({
  players,
  currentUserId,
  roomPlayers = [],
  activeEvent,
}) {
  const ranked = [...players].sort((a, b) => calcPoints(b) - calcPoints(a));

  const teamUpActive =
    activeEvent?.type === "team_up" && isEventActive(activeEvent);
  const bountyActive =
    activeEvent?.type === "bounty" && isEventActive(activeEvent);
  const teams = teamUpActive ? activeEvent.data?.teams : null;
  const bountyTargetId = bountyActive ? activeEvent.data?.targetPlayerId : null;

  if (teamUpActive && teams) {
    const magentaIds = new Set(teams.magenta || []);
    const limeIds = new Set(teams.lime || []);
    const magentaPlayers = ranked.filter((p) => magentaIds.has(p.user_id));
    const limePlayers = ranked.filter((p) => limeIds.has(p.user_id));

    return (
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-bold text-[#1A1A2E]">Leaderboard</h2>
        </div>
        {[
          { label: "Magenta Team", color: "#E91E8A", players: magentaPlayers },
          { label: "Lime Team", color: "#7ED321", players: limePlayers },
        ].map(({ label, color, players: teamPlayers }) => (
          <div key={label}>
            <div
              className="px-5 py-2 text-xs font-bold"
              style={{
                color,
                borderBottom: `1px solid ${color}22`,
                background: `${color}0d`,
              }}
            >
              ⬤ {label}
            </div>
            <ul>
              {teamPlayers.map((player, i) => (
                <PlayerRow
                  key={player.user_id}
                  player={player}
                  rank={i}
                  currentUserId={currentUserId}
                  roomPlayers={roomPlayers}
                  isBountyTarget={false}
                  teamColor={color}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Leaderboard</h2>
      </div>
      <ul>
        {ranked.map((player, i) => (
          <PlayerRow
            key={player.user_id}
            player={player}
            rank={i}
            currentUserId={currentUserId}
            roomPlayers={roomPlayers}
            isBountyTarget={bountyActive && player.user_id === bountyTargetId}
            teamColor={null}
          />
        ))}
      </ul>
    </div>
  );
}
