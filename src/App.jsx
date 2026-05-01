import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './lib/firebase'
import { useGameStore } from './store/useGameStore'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'
import Toast from './components/Toast'

function ProtectedRoute({ children }) {
  const user = useGameStore((s) => s.user)
  if (user === null) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const setUser = useGameStore((s) => s.setUser)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u))
    return unsub
  }, [setUser])

  const user = useGameStore((s) => s.user)

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
