import { memo, useLayoutEffect, useRef } from "react";
import SlotCounter from "react-slot-counter";
import {
  DIFFICULTY,
  getPlayerColor,
  isEventActive,
  calcPoints,
  isGhostMode,
} from "../lib/gameLogic";

const PlayerRow = memo(function PlayerRow({
  player,
  rank,
  currentUserId,
  roomPlayers,
  isBountyTarget,
  teamColor,
  isGhost,
  isYouGhost,
}) {
  const pts = calcPoints(player);
  const done = (player.tasks || []).filter((t) => t.completed).length;
  const total = (player.tasks || []).length;
  const isYou = player.user_id === currentUserId;
  const color = getPlayerColor(player.user_id, roomPlayers);
  const initial = player.display_name?.[0]?.toUpperCase() || "?";
  const firstName = player.display_name?.split(" ")[0] || "Player";

  const ghostOther = isGhost && !isYou;
  const ghostSelf = isGhost && isYou;

  const liStyle = ghostSelf
    ? { borderLeft: "3px solid #9CA3AF" }
    : isBountyTarget
      ? { borderLeft: "3px solid #F59E0B" }
      : teamColor
        ? { borderLeft: `3px solid ${teamColor}` }
        : {};

  return (
    <li
      data-player-id={player.user_id}
      className={`relative flex items-center gap-3 px-5 py-3.5 border-b border-[#E5E7EB] last:border-0 ${isYou ? "bg-[#F9FAFB]" : ""} ${ghostOther ? "opacity-60" : ""}`}
      style={ghostOther ? { ...liStyle, filter: "grayscale(1)" } : liStyle}
    >
      <span className="w-6 text-center text-2xl font-black text-[#6B7280]">
        {isGhost
          ? "🕵️"
          : rank === 0
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
        <div className="font-bold text-sm text-[#1A1A2E] flex items-center gap-1.5 flex-wrap">
          {firstName}{" "}
          {isYou && (
            <span className="text-[#9CA3AF] font-semibold text-xs">(you)</span>
          )}
          {isBountyTarget && (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 border border-amber-200 leading-none">
              ☠️
            </span>
          )}
        </div>
        <div className="text-xs text-[#6B7280]">
          {ghostOther ? "???" : total ? `(${done}/${total} tasks)` : "No tasks"}
        </div>
      </div>
      <span className="font-black text-lg text-[#1A1A2E] tabular-nums">
        {ghostOther ? (
          <span className="font-black text-lg text-[#9CA3AF]">???</span>
        ) : (
          <SlotCounter value={pts.toLocaleString()} />
        )}
      </span>
    </li>
  );
});

export default function Leaderboard({
  players,
  currentUserId,
  roomPlayers = [],
  activeEvent,
  title = "Leaderboard",
}) {
  const ranked = [...players].sort((a, b) => {
    const aGhost = isGhostMode(a);
    const bGhost = isGhostMode(b);
    if (aGhost && !bGhost) return 1;
    if (!aGhost && bGhost) return -1;
    return calcPoints(b) - calcPoints(a);
  });

  const listRef = useRef(null);
  const prevPositions = useRef(new Map());
  const prevOrder = useRef([]);
  const animationTimers = useRef(new Map());

  useLayoutEffect(() => {
    if (!listRef.current) return;

    const currentOrder = ranked.map((p) => p.user_id);
    const prevOrderList = prevOrder.current;

    const rows = listRef.current.querySelectorAll("[data-player-id]");
    const newPositions = new Map();
    const elementMap = new Map();
    rows.forEach((el) => {
      const uid = el.dataset.playerId;
      newPositions.set(uid, el.getBoundingClientRect().top);
      elementMap.set(uid, el);
    });

    if (prevOrderList.length === 0) {
      prevOrder.current = currentOrder;
      prevPositions.current = newPositions;
      return;
    }

    const rankChanges = new Map();
    currentOrder.forEach((uid, newIdx) => {
      const oldIdx = prevOrderList.indexOf(uid);
      if (oldIdx !== -1 && oldIdx !== newIdx) {
        rankChanges.set(uid, { oldRank: oldIdx, newRank: newIdx });
      }
    });

    if (rankChanges.size > 0) {
      const container = listRef.current.closest('[class*="overflow-hidden"]');
      if (container) container.style.overflow = "visible";

      rankChanges.forEach(({ oldRank, newRank }, uid) => {
        const el = elementMap.get(uid);
        const oldTop = prevPositions.current.get(uid);
        const newTop = newPositions.get(uid);
        if (!el || oldTop === undefined) return;

        const delta = oldTop - newTop;
        const isOvertaker = newRank < oldRank;

        el.style.transition = "none";
        el.style.transform = `translateY(${delta}px)`;
        if (isOvertaker) el.style.zIndex = "10";

        el.getBoundingClientRect();

        const easing = isOvertaker
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)";
        el.style.transition = `transform 0.55s ${easing}`;
        el.style.transform = "translateY(0)";

        if (isOvertaker) {
          const color = getPlayerColor(uid, roomPlayers);
          el.style.setProperty("--overtake-color", color);
          el.classList.remove("overtake-flash-active");
          el.getBoundingClientRect();
          el.classList.add("overtake-flash-active");
        }

        if (animationTimers.current.has(uid)) {
          clearTimeout(animationTimers.current.get(uid));
        }
        const timerId = setTimeout(() => {
          el.style.transform = "";
          el.style.transition = "";
          el.style.zIndex = "";
          el.classList.remove("overtake-flash-active");
          el.style.removeProperty("--overtake-color");
          animationTimers.current.delete(uid);
          if (animationTimers.current.size === 0 && container) {
            container.style.overflow = "";
          }
        }, 950);
        animationTimers.current.set(uid, timerId);
      });
    }

    prevPositions.current = newPositions;
    prevOrder.current = currentOrder;
  }, [ranked, roomPlayers]);

  const isYouGhost = isGhostMode(
    players.find((p) => p.user_id === currentUserId),
  );

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
          <h2 className="font-bold text-[#1A1A2E]">{title}</h2>
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
                  isGhost={isGhostMode(player)}
                  isYouGhost={isYouGhost}
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
        <h2 className="font-bold text-[#1A1A2E]">{title}</h2>
      </div>
      <ul ref={listRef}>
        {ranked.map((player, i) => (
          <PlayerRow
            key={player.user_id}
            player={player}
            rank={i}
            currentUserId={currentUserId}
            roomPlayers={roomPlayers}
            isBountyTarget={bountyActive && player.user_id === bountyTargetId}
            teamColor={null}
            isGhost={isGhostMode(player)}
            isYouGhost={isYouGhost}
          />
        ))}
      </ul>
    </div>
  );
}
