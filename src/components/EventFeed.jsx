import { EVENTS } from '../lib/gameLogic'

export default function EventFeed({ events = [] }) {
  if (!events.length) {
    return (
      <div className="bg-white/5 rounded-2xl border border-white/10 px-5 py-8 text-center text-white/40 text-sm">
        No events yet. Events fire Tuesday, Thursday & Saturday.
      </div>
    )
  }

  return (
    <div className="bg-white/5 rounded-2xl border border-white/10">
      <div className="px-5 py-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white">Event Feed</h2>
      </div>
      <ul className="divide-y divide-white/5">
        {[...events].reverse().map((event) => {
          const meta = EVENTS.find((e) => e.type === event.type)
          return (
            <li key={event.id} className="px-5 py-3 flex gap-3 items-start">
              <span className="text-2xl">{meta?.emoji ?? '📣'}</span>
              <div>
                <p className="font-semibold text-white text-sm">{meta?.name ?? event.type}</p>
                <p className="text-xs text-white/50">{meta?.description}</p>
                {event.data?.note && <p className="text-xs text-violet-300 mt-1">{event.data.note}</p>}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
