import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { doc, onSnapshot, collection, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useGameStore } from '../store/useGameStore'
import Leaderboard from '../components/Leaderboard'
import TaskList from '../components/TaskList'
import EventFeed from '../components/EventFeed'
import PowerUpInventory from '../components/PowerUpInventory'

export default function Room() {
  const { roomId } = useParams()
  const user = useGameStore((s) => s.user)
  const showToast = useGameStore((s) => s.showToast)
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [myPlayer, setMyPlayer] = useState(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (!snap.exists()) { navigate('/'); return }
      setRoom({ id: snap.id, ...snap.data() })
    })
    return unsub
  }, [roomId])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'rooms', roomId, 'players'), (snap) => {
      const all = snap.docs.map((d) => d.data())
      setPlayers(all)
      setMyPlayer(all.find((p) => p.userId === user?.uid) || null)
    })
    return unsub
  }, [roomId, user])

  async function startRace() {
    await updateDoc(doc(db, 'rooms', roomId), { status: 'active' })
    showToast("Race started! Let's go! 🏁", 'success')
  }

  async function checkIn() {
    if (!myPlayer) return
    const today = new Date().toDateString()
    const alreadyCheckedIn = (myPlayer.checkIns || []).some(
      (ts) => new Date(ts.seconds * 1000).toDateString() === today
    )
    if (alreadyCheckedIn) {
      showToast("Already checked in today!", 'warning')
      return
    }
    const ref = doc(db, 'rooms', roomId, 'players', user.uid)
    const newCheckIns = [...(myPlayer.checkIns || []), Timestamp.now()]
    const streak = newCheckIns.length
    await updateDoc(ref, { checkIns: newCheckIns, streak })
    showToast(`Check-in! 🔥 ${streak}-day streak`, 'success')
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white/40 text-lg">Loading race...</div>
      </div>
    )
  }

  const isCreator = room.createdBy === user?.uid
  const isLobby = room.status === 'lobby'
  const isActive = room.status === 'active'

  return (
    <div className="min-h-screen px-4 py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <button onClick={() => navigate('/')} className="text-white/40 hover:text-white text-sm mb-1 transition-colors">
            ← Dashboard
          </button>
          <h1 className="text-2xl font-black text-white">{room.name}</h1>
          <p className="text-white/40 text-sm">
            Code: <span className="font-mono text-violet-300">{room.code}</span> · {players.length} players
          </p>
        </div>
        {isActive && (
          <button
            onClick={checkIn}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-black font-black px-5 py-2.5 rounded-2xl text-sm animate-pulse-glow transition-all"
          >
            ✅ Check In
          </button>
        )}
      </div>

      {/* Lobby */}
      {isLobby && (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 text-center">
          <div className="text-4xl mb-3">🎮</div>
          <h2 className="font-bold text-white text-xl mb-2">Waiting for players...</h2>
          <p className="text-white/40 text-sm mb-6">
            Share code <span className="font-mono text-violet-300 font-bold">{room.code}</span> to invite friends
          </p>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {players.map((p) => (
              <div key={p.userId} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 text-sm text-white">
                <span>{p.avatar}</span>
                <span>{p.displayName}</span>
              </div>
            ))}
          </div>
          {isCreator && (
            <button
              onClick={startRace}
              disabled={players.length < 1}
              className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-8 py-3 rounded-2xl transition-colors disabled:opacity-40"
            >
              Start Race 🏁
            </button>
          )}
        </div>
      )}

      {/* Active Race */}
      {isActive && myPlayer && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Leaderboard players={players} currentUserId={user?.uid} />
            <EventFeed events={room.events || []} />
          </div>
          <div className="space-y-4">
            <TaskList player={myPlayer} roomId={roomId} />
            <PowerUpInventory player={myPlayer} roomId={roomId} />
          </div>
        </div>
      )}

      {/* Finished */}
      {room.status === 'finished' && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-3xl font-black text-white mb-2">Race Over!</h2>
          <p className="text-white/50 mb-8">Final standings below.</p>
          <Leaderboard players={players} currentUserId={user?.uid} />
        </div>
      )}
    </div>
  )
}
