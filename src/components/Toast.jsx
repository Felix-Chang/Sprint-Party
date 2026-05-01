import { useGameStore } from '../store/useGameStore'

const COLORS = {
  info:    'bg-[#1A1A2E] text-white',
  success: 'bg-[#10B981] text-white',
  error:   'bg-[#EF4444] text-white',
  warning: 'bg-[#F59E0B] text-white',
}

export default function Toast() {
  const toast = useGameStore((s) => s.toast)
  if (!toast) return null

  return (
    <div
      key={toast.id}
      className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-xl font-bold text-sm shadow-lg animate-slide-in ${COLORS[toast.type] ?? COLORS.info}`}
    >
      {toast.message}
    </div>
  )
}
