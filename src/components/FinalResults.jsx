import { useState } from "react";
import { playPop } from "../lib/sounds";
import WinnerReveal from "./WinnerReveal";
import Leaderboard from "./Leaderboard";

export default function FinalResults({ players, currentUserId, roomPlayers, isCreator, onResetRace }) {
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  return (
    <>
      <WinnerReveal
        players={players}
        currentUserId={currentUserId}
        roomPlayers={roomPlayers}
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
              currentUserId={currentUserId}
              roomPlayers={roomPlayers}
              title="Final Standings"
            />
          </div>

          {isCreator && (
            <div className="text-center">
              <button
                onClick={() => { playPop(); onResetRace(); }}
                className="bg-[#1A1A2E] text-white font-bold px-10 py-3.5 rounded-2xl hover:bg-[#2d2d4a] transition-colors active:scale-95 cursor-pointer text-lg"
              >
                Start new race
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
