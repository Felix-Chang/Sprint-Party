import { useState } from "react";
import { POWER_UPS } from "../lib/gameLogic";
import PowerUpModal from "./PowerUpModal";

export default function PowerUpInventory({
  player,
  players,
  roomId,
  roomPlayers,
  activeEvent,
  onPlayerUpdated,
}) {
  const [activePowerUp, setActivePowerUp] = useState(null);
  const powerUps = (player.power_ups || []).filter((id) => !!POWER_UPS[id]);

  return (
    <>
      <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB]">
          <h2 className="font-bold text-[#1A1A2E]">Power-ups</h2>
        </div>
        {!powerUps.length ? (
          <div className="px-5 py-8 text-center">
            <div className="mb-2 text-5xl">⚡</div>
            <p className="text-sm text-[#6B7280] font-semibold">No power-ups</p>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              You'll get a random one every day
            </p>
          </div>
        ) : (
          <div className="p-4 flex flex-wrap gap-2">
            {powerUps.map((puId, i) => {
              const pu = POWER_UPS[puId];
              if (!pu) return null;
              return (
                <button
                  key={i}
                  onClick={() => setActivePowerUp(puId)}
                  className="inline-flex items-center gap-2 bg-[#F9FAFB] border border-[#E5E7EB] text-[#1A1A2E] font-bold px-4 py-2 rounded-full text-sm hover:border-[#1A1A2E] hover:bg-white transition-colors"
                >
                  <span className="text-xl">{pu.emoji}</span>
                  <span>{pu.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activePowerUp && (
        <PowerUpModal
          puId={activePowerUp}
          player={player}
          players={players}
          roomId={roomId}
          roomPlayers={roomPlayers}
          activeEvent={activeEvent}
          onClose={() => setActivePowerUp(null)}
          onPlayerUpdated={onPlayerUpdated}
        />
      )}
    </>
  );
}
