import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { supabase } from '../lib/supabase'
import { useGameStore } from '../store/useGameStore'
import { PLAYER_COLORS } from '../lib/gameLogic'
import Leaderboard from '../components/Leaderboard'
import TaskList from '../components/TaskList'
import EventFeed from '../components/EventFeed'
import PowerUpInventory from '../components/PowerUpInventory'

export default function Room() {
  const { roomId } = useParams()
  const { user } = useUser()
  const showToast = useGameStore((s) => s.showToast)
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [players, setPlayers] = useState([])
  const [myPlayer, setMyPlayer] = useState(null)

  useEffect(() => {
    if (!user) return
    async function loadInitialData() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single()
      if (!roomData) { navigate('/dashboard'); return }
      setRoom(roomData)

      const { data: playersData } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
      const all = playersData || []
      setPlayers(all)
      setMyPlayer(all.find((p) => p.user_id === user.id) || null)
    }
    loadInitialData()
  }, [roomId, user])

  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('room-' + roomId)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') { navigate('/dashboard'); return }
          setRoom(payload.new)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        async () => {
          const { data } = await supabase
            .from('players')
            .select('*')
            .eq('room_id', roomId)
          const all = data || []
          setPlayers(all)
          setMyPlayer(all.find((p) => p.user_id === user.id) || null)
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [roomId, user])

  async function startRace() {
    await supabase.from('rooms').update({ status: 'active' }).eq('id', roomId)
    showToast("Race started! 🏁", 'success')
  }

  async function checkIn() {
    if (!myPlayer) return
    const today = new Date().toDateString()
    const alreadyCheckedIn = (myPlayer.check_ins || []).some(
      (ts) => new Date(ts).toDateString() === today
    )
    if (alreadyCheckedIn) {
      showToast('Already checked in today!', 'info')
      return
    }
    const newCheckIns = [...(myPlayer.check_ins || []), new Date().toISOString()]
    const streak = newCheckIns.length
    await supabase
      .from('players')
      .update({ check_ins: newCheckIns, streak })
      .eq('user_id', user.id)
      .eq('room_id', roomId)
    showToast(`Checked in! ${streak}🔥 streak`, 'success')
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#6B7280] font-semibold">Loading...</div>
      </div>
    )
  }

  const isCreator = room.created_by === user?.id
  const isLobby = room.status === 'lobby'
  const isActive = room.status === 'active'

  const hasCheckedInToday = (myPlayer?.check_ins || []).some(
    (ts) => new Date(ts).toDateString() === new Date().toDateString()
  )

  return (
    <div className="min-h-screen">

      {/* Full-width sticky header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-[#6B7280] hover:text-[#1A1A2E] font-semibold transition-colors flex-shrink-0"
            >
              ← Back
            </button>
            <span className="text-[#E5E7EB]">|</span>
            <h1 className="font-black text-[#1A1A2E] truncate">{room.name}</h1>
            <span className="font-['JetBrains_Mono'] text-xs bg-[#F3F4F6] text-[#6B7280] px-2.5 py-1 rounded-md flex-shrink-0">
              {room.code}
            </span>
            <span className="text-xs text-[#9CA3AF] flex-shrink-0">{players.length}p</span>
          </div>
          {isActive && (
            <button
              onClick={checkIn}
              disabled={hasCheckedInToday}
              className={`font-bold px-4 py-2 rounded-xl text-sm transition-all flex-shrink-0 ${
                hasCheckedInToday
                  ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-default'
                  : 'bg-[#1A1A2E] text-white hover:bg-[#2d2d4a] active:scale-95'
              }`}
            >
              {hasCheckedInToday ? '✅ Checked in' : '👋 Check in'}
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 pt-10 pb-16">

        {/* Lobby */}
        {isLobby && (
          <div className="text-center py-16">
            <p className="text-sm text-[#9CA3AF] font-semibold uppercase tracking-widest mb-12">
              Waiting for players
            </p>

            {/* Player circles */}
            <div className="flex justify-center gap-8 mb-14">
              {players.map((p) => {
                const colorIdx = room.players.indexOf(p.user_id)
                const color = PLAYER_COLORS[colorIdx >= 0 ? colorIdx : 0]
                const initial = p.display_name?.[0]?.toUpperCase() || '?'
                return (
                  <div key={p.user_id} className="flex flex-col items-center gap-2">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black"
                      style={{ background: color }}
                    >
                      {initial}
                    </div>
                    <span className="text-sm font-semibold text-[#1A1A2E]">
                      {p.display_name?.split(' ')[0] || 'Player'}
                    </span>
                  </div>
                )
              })}
            </div>

            {isCreator ? (
              <button
                onClick={startRace}
                disabled={players.length < 1}
                className="bg-[#1A1A2E] text-white font-bold px-10 py-3.5 rounded-2xl hover:bg-[#2d2d4a] transition-colors disabled:opacity-40"
              >
                Start race 🏁
              </button>
            ) : (
              <p className="text-sm text-[#6B7280] font-semibold">
                Waiting for the host to start...
              </p>
            )}
          </div>
        )}

        {/* Active Race — 2-column grid on wider screens */}
        {isActive && myPlayer && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-4">
              <Leaderboard players={players} currentUserId={user?.id} roomPlayers={room.players} />
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
          <div className="py-16">
            <div className="text-center mb-8">
              <div className="text-5xl mb-4">🏆</div>
              <h2 className="text-2xl font-black text-[#1A1A2E] mb-1">Race Over!</h2>
              <p className="text-[#6B7280] font-semibold">Final standings</p>
            </div>
            <div className="max-w-[680px] mx-auto">
              <Leaderboard players={players} currentUserId={user?.id} roomPlayers={room.players} />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
