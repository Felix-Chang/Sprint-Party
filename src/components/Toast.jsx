import { useGameStore } from '../store/useGameStore'

const COLORS = {
  info: 'bg-violet-700 border-violet-500',
  success: 'bg-emerald-700 border-emerald-500',
  error: 'bg-red-700 border-red-500',
  warning: 'bg-yellow-700 border-yellow-500',
}

export default function Toast() {
  const toast = useGameStore((s) => s.toast)
  if (!toast) return null

  return (
    <div
      key={toast.id}
      className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-xl border text-white font-semibold shadow-2xl animate-slide-in ${COLORS[toast.type] ?? COLORS.info}`}
    >
      {toast.message}
    </div>
  )
}
