import { calcPoints, getPlayerColor } from "../lib/gameLogic";
import dottedBg from "../assets/dotted-bg.png";

const CONFETTI_COLORS = [
  "#FFD700", "#FF6B6B", "#4ECDC4", "#6C5CE7",
  "#FF69B4", "#2ECC71", "#FFD93D", "#FF8A5C",
  "#ffffff", "#FFD700", "#FF6B6B", "#4ECDC4",
];

const PODIUM_META = {
  1: {
    height: 160,
    delay: "3.0s",
    spotlightDelay: "3.0s",
    bounceDelay: "3.8s",
    gradient: "linear-gradient(160deg, #FFD700 0%, #B8860B 100%)",
    borderTop: "2px solid rgba(255,255,255,0.35)",
    label: "1st",
  },
  2: {
    height: 112,
    delay: "2.3s",
    spotlightDelay: "2.3s",
    bounceDelay: null,
    gradient: "linear-gradient(160deg, #D8D8D8 0%, #888 100%)",
    borderTop: "2px solid rgba(255,255,255,0.25)",
    label: "2nd",
  },
  3: {
    height: 80,
    delay: "1.7s",
    spotlightDelay: "1.7s",
    bounceDelay: null,
    gradient: "linear-gradient(160deg, #CD7F32 0%, #7B4510 100%)",
    borderTop: "2px solid rgba(255,255,255,0.2)",
    label: "3rd",
  },
};

function ConfettiLayer() {
  const pieces = Array.from({ length: 24 }, (_, i) => {
    const left = ((i * 37 + 11) % 97) + 1.5;
    const size = 6 + (i % 5) * 2;
    const duration = 3.5 + (i % 7) * 0.5;
    const delay = (i % 13) * 0.25;
    const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    const rotate = (i * 23) % 360;
    return { left, size, duration, delay, color, rotate };
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 0,
        overflow: "hidden",
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: "-20px",
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 0.5}px`,
            background: p.color,
            borderRadius: "2px",
            opacity: 0,
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration}s linear ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function CurtainReveal() {
  const baseStyle = {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "51%",
    zIndex: 20,
    animationDuration: "1.1s",
    animationTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)",
    animationFillMode: "forwards",
  };

  return (
    <>
      <div
        style={{
          ...baseStyle,
          left: 0,
          background: "linear-gradient(160deg, #FF6B6B 0%, #FFD93D 60%, #FF8A5C 100%)",
          animation: "curtain-open-left 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0s forwards",
        }}
      />
      <div
        style={{
          ...baseStyle,
          right: 0,
          background: "linear-gradient(160deg, #6C5CE7 0%, #4ECDC4 60%, #4A90E2 100%)",
          animation: "curtain-open-right 1.1s cubic-bezier(0.22, 1, 0.36, 1) 0s forwards",
        }}
      />
    </>
  );
}

function GlowOrbs() {
  const orbStyle = (color, size, top, left, animDelay) => ({
    position: "absolute",
    width: `${size}px`,
    height: `${size}px`,
    background: color,
    borderRadius: "50%",
    filter: "blur(80px)",
    animation: `glow-pulse ${4 + Math.random() * 1}s ease-in-out ${animDelay} infinite`,
    zIndex: 1,
    top,
    left,
    pointerEvents: "none",
  });

  return (
    <>
      <div style={orbStyle("rgba(255,217,61,0.18)", 400, "60px", "50%", "0s")} />
      <div style={orbStyle("rgba(255,107,107,0.12)", 350, "35%", "12%", "0.8s")} />
      <div style={orbStyle("rgba(108,92,231,0.14)", 380, "50%", "80%", "1.5s")} />
    </>
  );
}

function SpotlightLayer({ hasSecond, hasThird }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      {/* 3rd place — right */}
      {hasThird && (
        <div
          style={{
            position: "absolute",
            top: 0,
            right: "14%",
            width: "220px",
            height: "380px",
            background:
              "radial-gradient(ellipse at top, rgba(205,127,50,0.13) 0%, transparent 70%)",
            opacity: 0,
            animation: `spotlight-open 0.6s ease-out ${PODIUM_META[3].spotlightDelay} forwards`,
          }}
        />
      )}
      {/* 2nd place — left */}
      {hasSecond && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "14%",
            width: "240px",
            height: "400px",
            background:
              "radial-gradient(ellipse at top, rgba(200,200,255,0.11) 0%, transparent 70%)",
            opacity: 0,
            animation: `spotlight-open 0.6s ease-out ${PODIUM_META[2].spotlightDelay} forwards`,
          }}
        />
      )}
      {/* 1st place — center, strongest */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: "480px",
          height: "600px",
          background:
            "radial-gradient(ellipse at top, rgba(255,220,80,0.20) 0%, rgba(255,200,0,0.06) 40%, transparent 70%)",
          opacity: 0,
          animation: `spotlight-open 0.7s ease-out ${PODIUM_META[1].spotlightDelay} forwards`,
        }}
      />
    </div>
  );
}

function PodiumEntry({ player, place, currentUserId, roomPlayers }) {
  const meta = PODIUM_META[place];
  const isFirst = place === 1;
  const pts = calcPoints(player);
  const color = getPlayerColor(player.user_id, roomPlayers);
  const initial = player.display_name?.[0]?.toUpperCase() ?? "?";
  const firstName = player.display_name?.split(" ")[0] ?? "Player";
  const isYou = player.user_id === currentUserId;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        opacity: 0,
        animation: `podium-rise 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) ${meta.delay} forwards${
          meta.bounceDelay
            ? `, winner-bounce 0.6s ease-in-out ${meta.bounceDelay} forwards`
            : ""
        }`,
        width: isFirst ? "140px" : "110px",
      }}
    >
      {/* Crown — 1st only */}
      {isFirst && (
        <div
          style={{
            fontSize: "28px",
            marginBottom: "4px",
            opacity: 0,
            animation: "crown-drop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 3.5s forwards",
          }}
        >
          👑
        </div>
      )}

      {/* Avatar */}
      <div
        style={{
          width: isFirst ? "56px" : "44px",
          height: isFirst ? "56px" : "44px",
          borderRadius: "50%",
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: 900,
          fontSize: isFirst ? "22px" : "17px",
          flexShrink: 0,
          boxShadow: isFirst
            ? `0 0 0 3px #FFD700, 0 0 24px rgba(255,215,0,0.45)`
            : "0 2px 8px rgba(0,0,0,0.4)",
          marginBottom: "8px",
        }}
      >
        {initial}
      </div>

      {/* Name */}
      <div
        style={{
          color: "white",
          fontWeight: 700,
          fontSize: isFirst ? "14px" : "12px",
          maxWidth: "100%",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          marginBottom: "2px",
          textAlign: "center",
        }}
      >
        {firstName}
        {isYou && (
          <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 500, fontSize: "11px" }}>
            {" "}(you)
          </span>
        )}
      </div>

      {/* Score */}
      <div
        style={{
          color: "rgba(255,255,255,0.6)",
          fontSize: "11px",
          fontWeight: 600,
          marginBottom: "10px",
        }}
      >
        {pts.toLocaleString()} pts
      </div>

      {/* Podium block */}
      <div
        style={{
          width: "100%",
          height: `${meta.height}px`,
          background: meta.gradient,
          borderTop: meta.borderTop,
          borderRadius: "10px 10px 0 0",
          boxShadow:
            "0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            color: "rgba(255,255,255,0.75)",
            fontWeight: 800,
            fontSize: isFirst ? "20px" : "16px",
            letterSpacing: "0.02em",
            position: "relative",
            zIndex: 1,
          }}
        >
          {meta.label}
        </span>

        {/* Shine sweep — 1st only */}
        {isFirst && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: "inherit",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "45%",
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)",
                opacity: 0,
                animation: "shine-sweep 0.7s ease-out 3.7s forwards",
                animationFillMode: "both",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function WinnerReveal({
  players,
  currentUserId,
  roomPlayers,
  onViewLeaderboard,
}) {
  const ranked = [...players].sort((a, b) => calcPoints(b) - calcPoints(a));
  const first = ranked[0] ?? null;
  const second = ranked[1] ?? null;
  const third = ranked[2] ?? null;

  // Build display order: [2nd, 1st, 3rd], skipping missing slots
  const podiumOrder = [
    second ? { player: second, place: 2 } : null,
    first ? { player: first, place: 1 } : null,
    third ? { player: third, place: 3 } : null,
  ].filter(Boolean);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `linear-gradient(180deg, rgba(18,12,60,0.92) 0%, rgba(40,20,90,0.88) 45%, rgba(10,6,30,0.95) 100%), url(${dottedBg}) repeat`,
        backgroundSize: "auto, 445px 445px",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <ConfettiLayer />
      <GlowOrbs />
      <CurtainReveal />
      <SpotlightLayer hasSecond={!!second} hasThird={!!third} />

      {/* Stage content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          flex: 1,
          paddingBottom: "64px",
          paddingTop: "80px",
        }}
      >
        {/* Race Complete title */}
        <div
          style={{
            fontFamily: '"Nunito", system-ui, sans-serif',
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            opacity: 0,
            animation: "title-burst 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s forwards",
            marginBottom: "8px",
            color: "rgba(255,217,61,0.9)",
            textShadow: "0 0 20px rgba(255,217,61,0.5)",
          }}
        >
          🏆 Race Complete
        </div>

        {/* Podium stage */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap: "12px",
            marginBottom: "40px",
            padding: "0 24px",
          }}
        >
          {podiumOrder.map(({ player, place }) => (
            <PodiumEntry
              key={player.user_id}
              player={player}
              place={place}
              currentUserId={currentUserId}
              roomPlayers={roomPlayers}
            />
          ))}
        </div>

        {/* Secondary action */}
        <button
          onClick={onViewLeaderboard}
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.7)",
            fontWeight: 600,
            fontSize: "14px",
            padding: "10px 28px",
            borderRadius: "999px",
            cursor: "pointer",
            transition: "background 0.2s, color 0.2s",
            opacity: 0,
            animation: "spotlight-open 0.4s ease-out 4.0s forwards",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            e.currentTarget.style.color = "rgba(255,255,255,0.95)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "rgba(255,255,255,0.7)";
          }}
        >
          View Full Leaderboard ↓
        </button>
      </div>
    </div>
  );
}
