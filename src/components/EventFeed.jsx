import { EVENTS } from "../lib/gameLogic";
import diceIcon from "../assets/icons/dice.png";

export default function EventFeed({ events = [] }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <h2 className="font-bold text-[#1A1A2E]">Events</h2>
      </div>
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <div className="mb-2">
            <img src={diceIcon} className="w-20 h-20 mx-auto" alt="" />
          </div>
          <p className="text-sm text-[#6B7280] font-semibold">No events yet</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Fires Tuesday, Thursday & Saturday
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F3F4F6]">
          {[...events].reverse().map((event) => {
            const meta = EVENTS.find((e) => e.type === event.type);
            return (
              <li key={event.id} className="flex gap-3 px-5 py-4 items-start">
                {meta?.icon ? (
                  <img
                    src={meta.icon}
                    className="w-12 h-12 flex-shrink-0"
                    alt=""
                  />
                ) : (
                  <span className="text-2xl flex-shrink-0">📣</span>
                )}
                <div>
                  <p className="font-['JetBrains_Mono'] text-xs font-semibold text-[#1A1A2E] uppercase tracking-wider">
                    {meta?.name ?? event.type}
                  </p>
                  <p className="text-xs text-[#6B7280] mt-0.5">
                    {meta?.description}
                  </p>
                  {event.data?.note && (
                    <p className="text-xs text-[#F59E0B] font-semibold mt-1">
                      {event.data.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
