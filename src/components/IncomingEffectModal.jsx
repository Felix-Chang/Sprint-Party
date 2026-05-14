import Modal from './Modal'

const EFFECT_CONTENT = {
  freeze: {
    emoji: '❄️',
    title: "You've been frozen!",
    color: '#DBEAFE',
    borderColor: '#93C5FD',
    textColor: '#1D4ED8',
  },
  sabotage: {
    emoji: '💣',
    title: "You've been sabotaged!",
    color: '#FEF3C7',
    borderColor: '#FCD34D',
    textColor: '#92400E',
  },
}

export default function IncomingEffectModal({ effect, attackerName, onClose }) {
  if (!effect) return null

  const content = EFFECT_CONTENT[effect]
  if (!content) return null

  return (
    <Modal isOpen onClose={onClose}>
      <div className="px-6 pt-8 pb-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-6xl">{content.emoji}</div>
          <h2 className="text-2xl font-black text-[#1A1A2E]">{content.title}</h2>
          {attackerName && (
            <p className="text-sm text-[#6B7280]">
              from <span className="font-bold text-[#1A1A2E]">{attackerName}</span>
            </p>
          )}
        </div>

        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: content.color,
            border: `1px solid ${content.borderColor}`,
            color: content.textColor,
          }}
        >
          {effect === 'freeze' && (
            <p className="font-semibold">Your next task completion earns <span className="font-black">0 pts</span>. The freeze clears after one task.</p>
          )}
          {effect === 'sabotage' && (
            <p className="font-semibold">One of your Easy tasks has been flagged. You must complete it <span className="font-black">before any other task</span>. Check your task list.</p>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full bg-[#1A1A2E] text-white font-black py-3 rounded-xl hover:bg-[#2d2d4a] transition-colors active:scale-95 text-sm"
        >
          Got it
        </button>
      </div>
    </Modal>
  )
}
