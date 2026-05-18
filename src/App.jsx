import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuth, useSession } from '@clerk/clerk-react'
import { setGetToken } from './lib/supabase'
import Landing from './pages/Landing'
import Room, { RoomSkeleton } from './pages/Room'
import SSOCallback from './pages/SSOCallback'
import Toast from './components/Toast'
import Skeleton from './components/Skeleton'

const Dashboard = lazy(() => import('./pages/Dashboard'))

function DashboardSkeleton() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-black text-[#1A1A2E] tracking-tight text-xl">
            🏁 Sprint Party
          </span>
          <Skeleton className="w-16 h-8" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-14 pb-24">
        <div className="mb-12">
          <Skeleton className="h-10 w-64 mb-3" />
          <Skeleton className="h-5 w-40" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-14">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8">
            <Skeleton className="h-4 w-32 mb-5" />
            <Skeleton className="w-full h-10 mb-4" />
            <Skeleton className="w-full h-10" />
          </div>
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8">
            <Skeleton className="h-4 w-32 mb-5" />
            <Skeleton className="w-full h-10 mb-4" />
            <Skeleton className="w-full h-10" />
          </div>
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border border-[#E5E7EB] rounded-2xl px-6 py-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Skeleton className="h-5 w-40 mb-2" />
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      {[...Array(3)].map((_, j) => (
                        <Skeleton key={j} className="w-5 h-5 rounded-full" />
                      ))}
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-4 w-14" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ClerkSupabaseSync() {
  const { session } = useSession()
  useEffect(() => {
    if (!session) {
      setGetToken(null)
      return
    }
    // accessToken() in the supabase client calls this before every request
    setGetToken(() => session.getToken())
  }, [session])
  return null
}

function ProtectedRoute({ children, fallback = null }) {
  const { isSignedIn, isLoaded } = useAuth()
  if (!isLoaded) return fallback
  if (!isSignedIn) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const { isSignedIn, isLoaded } = useAuth()

  return (
    <BrowserRouter>
      <ClerkSupabaseSync />
      <Toast />
      <Suspense fallback={<DashboardSkeleton />}>
        <Routes>
          <Route
            path="/"
            element={!isLoaded ? null : isSignedIn ? <Navigate to="/dashboard" replace /> : <Landing />}
          />
          <Route path="/dashboard" element={<ProtectedRoute fallback={<DashboardSkeleton />}><Dashboard /></ProtectedRoute>} />
          <Route path="/room/:roomId" element={<ProtectedRoute fallback={<RoomSkeleton />}><Room /></ProtectedRoute>} />
          <Route path="/sso-callback" element={<SSOCallback />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
