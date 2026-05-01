import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useGameStore } from '../store/useGameStore'

export function useAuth() {
  const { user, setUser } = useGameStore()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
    })
    return unsub
  }, [setUser])

  return { user, loading: user === undefined }
}
