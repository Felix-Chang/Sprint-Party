import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Room from './pages/Room'
import SSOCallback from './pages/SSOCallback'
import Toast from './components/Toast'

function ProtectedRoute({ children }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return null
  if (!isSignedIn) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <BrowserRouter>
      <Toast />
      <Routes>
        <Route
          path="/"
          element={isLoaded && isSignedIn ? <Navigate to="/dashboard" replace /> : <Landing />}
        />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/room/:roomId" element={<ProtectedRoute><Room /></ProtectedRoute>} />
        <Route path="/sso-callback" element={<SSOCallback />} />
      </Routes>
    </BrowserRouter>
  )
}
