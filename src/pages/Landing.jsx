import { useSignIn } from '@clerk/clerk-react'
import { useGameStore } from '../store/useGameStore'

export default function Landing() {
  const showToast = useGameStore((s) => s.showToast)
  const { signIn, isLoaded } = useSignIn()

  async function handleGoogleLogin() {
    if (!isLoaded) return
    try {
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/dashboard',
      })
    } catch (err) {
      showToast('Sign-in failed: ' + err.message, 'error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/30 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-fuchsia-600/20 rounded-full blur-3xl -z-10" />

      <div className="text-center max-w-xl">
        <div className="text-6xl mb-4">🏁</div>
        <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
          Productivity{' '}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Race
          </span>
        </h1>
        <p className="text-lg text-white/60 mb-2">
          Mario Party meets your to-do list.
        </p>
        <p className="text-white/40 text-sm mb-10">
          Submit real tasks. Race your friends. Survive the chaos.
        </p>

        <div className="flex flex-col gap-3 items-center">
          <button
            onClick={handleGoogleLogin}
            className="flex items-center gap-3 bg-white text-gray-900 font-bold px-7 py-3.5 rounded-2xl text-base hover:bg-white/90 transition-all shadow-xl w-64 justify-center"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <div className="mt-16 grid grid-cols-3 gap-6 text-center">
          {[
            { emoji: '📋', title: 'Real Tasks', desc: 'Submit your actual week tasks' },
            { emoji: '⚡', title: 'Live Races', desc: 'Mon–Sun with real-time leaderboard' },
            { emoji: '🎲', title: 'Chaos Events', desc: 'Task swaps, sabotage & more' },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 rounded-2xl p-4 border border-white/10">
              <div className="text-3xl mb-2">{f.emoji}</div>
              <p className="font-bold text-white text-sm">{f.title}</p>
              <p className="text-white/40 text-xs mt-1">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
