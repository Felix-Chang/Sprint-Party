import { create } from 'zustand'

let toastTimer = null
let toastDismissTimer = null

export const useGameStore = create((set) => ({
  room: null,
  playerData: null,
  toast: null,

  setRoom: (room) => set({ room }),
  setPlayerData: (playerData) => set({ playerData }),

  showToast: (message, type = 'info') => {
    if (toastTimer) clearTimeout(toastTimer)
    if (toastDismissTimer) clearTimeout(toastDismissTimer)
    set({ toast: { message, type, id: Date.now(), dismissing: false } })
    toastDismissTimer = setTimeout(() => set((s) => ({ toast: s.toast ? { ...s.toast, dismissing: true } : null })), 3100)
    toastTimer = setTimeout(() => set({ toast: null }), 3500)
  },

  clearRoom: () => set({ room: null, playerData: null }),
}))
