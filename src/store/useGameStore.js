import { create } from 'zustand'

export const useGameStore = create((set) => ({
  room: null,
  playerData: null,
  toast: null,

  setRoom: (room) => set({ room }),
  setPlayerData: (playerData) => set({ playerData }),

  showToast: (message, type = 'info') => {
    set({ toast: { message, type, id: Date.now() } })
    setTimeout(() => set({ toast: null }), 3500)
  },

  clearRoom: () => set({ room: null, playerData: null }),
}))
