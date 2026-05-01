import { useState, useEffect } from 'react'
import { collection, query, where, getDocs, addDoc, doc, setDoc, getDoc, Timestamp } from 'firebase/firestore'
import { signOut } from 'firebase/auth'
import { db, auth } from '../lib/firebase'
import { useGameStore } from '../store/useGameStore'
import { generateRoomCode, getWeekBounds } from '../lib/gameLogic'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const user = useGameStore((s) => s.user)
  const showToast = useGameStore((s) => s.showToast)
  const navigate = useNavigate()
  const [rooms, setRooms] = useState([])
  const [joinCode, setJoinCode] = useState('')
  const [roomName, setRoomName] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    loadRooms()
  }, [user])

  async function loadRooms() {
    const q = query(collection(db, 'rooms'), where('players', 'array-contains', user.uid))
    const snap = await getDocs(q)
    setRooms(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  }

  async function createRoom() {
    if (!roomName.trim()) return
    setLoading(true)
    const code = generateRoomCode()
    const { weekStart, weekEnd } = getWeekBounds()
    const roomRef = await addDoc(collection(db, 'rooms'), {
      name: roomName.trim(),
      code,
      createdBy: user.uid,
      players: [user.uid],
      status: 'lobby',
      weekStart: Timestamp.fromDate(weekStart),
      weekEnd: Timestamp.fromDate(weekEnd),
      events: [],
      bonusStars: [],
      settings: { maxPlayers: 6, eventsEnabled: true, powerUpsEnabled: true },
      createdAt: Timestamp.now(),
    })
    await setDoc(doc(db, 'rooms', roomRef.id, 'players', user.uid), {
      userId: user.uid,
      roomId: roomRef.id,
      displayName: user.displayName || user.email,
      avatar: '🎮',
      tasks: [],
      points: 0,
      streak: 0,
      streakMultiplier: 1,
      powerUps: [],
      checkIns: [],
      bonusStarsEarned: [],
    })
    setRoomName('')
    setLoading(false)
    showToast(`Room "${roomName}" created! Code: ${code}`, 'success')
    navigate(`/room/${roomRef.id}`)
  }

  async function joinRoom() {
    if (!joinCode.trim()) return
    setLoading(true)
    const q = query(collection(db, 'rooms'), where('code', '==', joinCode.toUpperCase().trim()))
    const snap = await getDocs(q)
    if (snap.empty) {
      showToast('Room not found. Check the code.', 'error')
      setLoading(false)
      return
    }
    const roomDoc = snap.docs[0]
    const room = roomDoc.data()
    if (room.players.includes(user.uid)) {
      navigate(`/room/${roomDoc.id}`)
      setLoading(false)
      return
    }
    if (room.players.length >= room.settings.maxPlayers) {
      showToast('Room is full!', 'error')
      setLoading(false)
      return
    }
    await setDoc(doc(db, 'rooms', roomDoc.id), { players: [...room.players, user.uid] }, { merge: true })
    await setDoc(doc(db, 'rooms', roomDoc.id, 'players', user.uid), {
      userId: user.uid,
      roomId: roomDoc.id,
      displayName: user.displayName || user.email,
      avatar: '🎮',
      tasks: [],
      points: 0,
      streak: 0,
      streakMultiplier: 1,
      powerUps: [],
      checkIns: [],
      bonusStarsEarned: [],
    })
    setJoinCode('')
    setLoading(false)
    navigate(`/room/${roomDoc.id}`)
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-black text-white">🏁 Your Races</h1>
          <p className="text-white/50 text-sm mt-1">Welcome back, {user?.displayName?.split(' ')[0] || 'racer'}</p>
        </div>
        <button
          onClick={() => signOut(auth)}
          className="text-white/40 hover:text-white text-sm transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Create / Join */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-3">Create Room</h2>
          <input
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createRoom()}
            placeholder="Room name..."
            className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-violet-500 mb-3"
          />
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            Create
          </button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="font-bold text-white mb-3">Join Room</h2>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && joinRoom()}
            placeholder="Invite code..."
            className="w-full bg-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:ring-2 focus:ring-fuchsia-500 mb-3 uppercase"
          />
          <button
            onClick={joinRoom}
            disabled={loading}
            className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            Join
          </button>
        </div>
      </div>

      {/* Active rooms */}
      {rooms.length === 0 ? (
        <div className="text-center text-white/30 py-16">
          <div className="text-4xl mb-3">🎮</div>
          <p>No active races. Create one or join with an invite code.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => navigate(`/room/${room.id}`)}
              className="w-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-violet-500/50 rounded-2xl px-5 py-4 text-left transition-all"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-white">{room.name}</p>
                  <p className="text-white/40 text-sm">{room.players.length} players · {room.status}</p>
                </div>
                <span className="text-white/40 font-mono text-sm">{room.code}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
