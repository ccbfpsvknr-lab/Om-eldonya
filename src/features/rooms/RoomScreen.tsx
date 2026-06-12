import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoomStore, type RoomPlayer } from '@/store/useRoomStore';
import { usePlayersStore, useGameStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { VEHICLES } from '@/lib/vehicles';
import { useAuthStore } from '@/store/useAuthStore';
import { ROUTES } from '@/lib/constants';

type Tab = 'create' | 'join';

const S = {
  page: {
    minHeight: '100dvh', background: '#0E1726', padding: '16px',
    paddingTop: 'max(env(safe-area-inset-top), 16px)',
    fontFamily: "'Cairo', sans-serif", direction: 'rtl' as const, color: '#EADBB7',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
  },
  card: {
    width: '100%', maxWidth: 420, background: 'rgba(22,34,58,0.9)',
    border: '1px solid rgba(56,74,110,0.5)', borderRadius: 18, padding: '20px',
  },
  input: {
    width: '100%', background: 'rgba(14,23,38,0.9)',
    border: '1px solid rgba(56,74,110,0.6)', borderRadius: 10,
    padding: '12px 14px', color: '#EADBB7',
    fontFamily: "'Cairo', sans-serif", fontSize: '0.95rem', outline: 'none',
    boxSizing: 'border-box' as const, textAlign: 'center' as const,
  },
  btnGold: {
    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
    background: 'linear-gradient(135deg, #E8C040, #C49020)',
    color: '#0E1726', fontFamily: "'Cairo'", fontWeight: 900, fontSize: '1rem',
    cursor: 'pointer',
  },
  label: { fontSize: '0.8rem', color: '#9AA6BC', fontWeight: 700, marginBottom: 6, display: 'block' as const },
};

export function RoomScreen() {
  const navigate   = useNavigate();
  const { profile } = useAuthStore();
  const { room, loading, error, createRoom, joinRoom, leaveRoom, setMode, subscribe, unsubscribe, addBot, removeBot, updateVehicle } = useRoomStore();

  const [tab, setTab]       = useState<Tab>('create');
  const [pickingVehicle, setPickingVehicle] = useState<string | null>(null); // userId picking
  const [code, setCode]     = useState('');
  const [msg, setMsg]       = useState('');
  const [isErr, setIsErr]   = useState(false);
  const disconnectTimers    = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const userId   = profile?.id ?? '';
  const nickname = profile?.nickname ?? 'ضيف';

  // ── POLL for game start (non-host) — reliable backup for broadcast race conditions ──
  useEffect(() => {
    if (!room || room.hostId === userId || room.status === 'playing') return;
    const poll = setInterval(async () => {
      const { data } = await supabase.from('rooms')
        .select('status, game_state, mode').eq('id', room.id).single();
      if (data?.status === 'playing' && data?.game_state?.players) {
        clearInterval(poll);
        const players: RoomPlayer[] = data.game_state.players;
        const mode: 'quick' | 'classic' = data.game_state.mode ?? room.mode;
        const ps = usePlayersStore.getState();
        ps.resetPlayers();
        players.forEach((p: RoomPlayer) => ps.addPlayer(p.nickname, p.vehicle));
        const currentP = usePlayersStore.getState().players;
        players.forEach((p: RoomPlayer, i: number) => {
          if (p.isBot && currentP[i]) ps.toggleBot(currentP[i].id);
        });
        useGameStore.getState().setMode(mode);
        navigate(ROUTES.board);  // skip reveal — wait for host game state
      }
    }, 1500);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, room?.hostId, room?.status]);

  // Subscribe to room events when room is created/joined
  useEffect(() => {
    if (!room) return;

    subscribe(
      // Game events
      (_event, _payload) => {},
      // Game state changes → navigate into game
      (game) => {
        useRoomStore.setState((s) => ({ room: s.room ? { ...s.room, gameState: game } : null }));
        if (game) navigate(ROUTES.board);
      },
      // Players changed
      (players) => {
        // Detect disconnections → start 10s timer → bot takes over
        players.forEach((p) => {
          if (!p.isOnline && !disconnectTimers.current[p.userId]) {
            disconnectTimers.current[p.userId] = setTimeout(() => {
              // Mark as bot in game (handled in GameBoard)
              delete disconnectTimers.current[p.userId];
            }, 10_000);
          } else if (p.isOnline && disconnectTimers.current[p.userId]) {
            clearTimeout(disconnectTimers.current[p.userId]);
            delete disconnectTimers.current[p.userId];
          }
        });
      }
    );

    return () => { unsubscribe(); };
  }, [room?.id]);

  const showMsg = (text: string, err = false) => { setMsg(text); setIsErr(err); setTimeout(() => setMsg(''), 3500); };

  const handleCreate = async () => {
    if (!profile) { showMsg('لازم تسجل دخول الأول', true); return; }
    const err = await createRoom(userId, nickname, 'quick');
    if (err) showMsg(err, true);
  };

  const handleJoin = async () => {
    if (!code.trim()) { showMsg('ادخل الكود', true); return; }
    if (!profile) { showMsg('لازم تسجل دخول الأول', true); return; }
    const err = await joinRoom(code.trim().toUpperCase(), userId, nickname);
    if (err) showMsg(err, true);
  };

  const handleLeave = async () => { await leaveRoom(); };

  const resetPlayers = usePlayersStore((s) => s.resetPlayers);
  const addPlayer    = usePlayersStore((s) => s.addPlayer);
  const toggleBot    = usePlayersStore((s) => s.toggleBot);
  const setGameMode  = useGameStore((s) => s.setMode);

  const handleStart = async () => {
    if (!room) return;
    try {
      // Set up local player store from room roster
      resetPlayers();
      room.players.forEach((p) => { addPlayer(p.nickname, p.vehicle); });
      // Mark bots by ID — get current players after adding them
      const currentPlayers = usePlayersStore.getState().players;
      room.players.forEach((p, i) => {
        if (p.isBot && currentPlayers[i]) {
          toggleBot(currentPlayers[i].id);
        }
      });
      // Set game mode
      setGameMode(room.mode);
      // Update room status in DB
      await supabase.from('rooms').update({
        status: 'playing',
        game_state: { players: room.players, mode: room.mode },
      }).eq('id', room.id);
      useRoomStore.setState((s) => ({
        room: s.room ? { ...s.room, status: 'playing' } : null,
      }));
      // Broadcast "game_start" so all non-host players also navigate
      const ch = useRoomStore.getState().channel;
      if (ch) {
        ch.send({
          type: 'broadcast', event: 'game_start',
          payload: { players: room.players, mode: room.mode },
        });
      }
      navigate(ROUTES.reveal);
    } catch (e) {
      showMsg(String(e), true);
    }
  };

  const isHost = room?.hostId === userId;

  // ── LOBBY VIEW ──────────────────────────────────────────────────────────────
  if (room) {
    return (
      <div style={S.page}>
        <div style={{ width: '100%', maxWidth: 420, marginTop: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <button onClick={handleLeave}
              style={{ background: 'none', border: '1px solid rgba(56,74,110,0.5)', borderRadius: 8,
                color: '#9AA6BC', fontFamily: "'Cairo'", padding: '6px 12px', cursor: 'pointer' }}>
              ← خروج
            </button>
            <h2 style={{ flex: 1, margin: 0, color: '#E0B43C', fontFamily: "'Cairo'", fontWeight: 900 }}>
              الغرفة 🎮
            </h2>
          </div>

          {/* Room code */}
          <div style={{ ...S.card, textAlign: 'center', marginBottom: 14 }}>
            <p style={{ margin: '0 0 6px', color: '#9AA6BC', fontSize: '0.8rem', fontFamily: "'Cairo'" }}>
              كود الغرفة — شاركه مع أصحابك
            </p>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '0.3em',
              color: '#F4CE5E', fontFamily: 'monospace' }}>
              {room.code}
            </div>
            <p style={{ margin: '6px 0 0', color: '#9AA6BC', fontSize: '0.75rem', fontFamily: "'Cairo'" }}>
              {room.players.length} / 4 لاعبين
            </p>
          </div>

          {/* Mode selector (host only) */}
          {isHost && room.status === 'waiting' && (
            <div style={{ ...S.card, marginBottom: 14 }}>
              <p style={S.label}>نوع اللعبة</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {(['quick', 'classic'] as const).map((m) => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                      fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.9rem',
                      background: room.mode === m ? 'linear-gradient(135deg, #E8C040, #C49020)' : 'rgba(14,23,38,0.8)',
                      color: room.mode === m ? '#0E1726' : '#9AA6BC' }}>
                    {m === 'quick' ? '⚡ سريعة' : '🏛️ كلاسيك'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Players list */}
          <div style={{ ...S.card, marginBottom: 14 }}>
            <p style={{ ...S.label, marginBottom: 12 }}>اللاعبين</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {Array.from({ length: 4 }, (_, i) => {
                const p: RoomPlayer | undefined = room.players.find((pl) => pl.seat === i);
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    background: p ? `${p.color}18` : 'rgba(14,23,38,0.5)',
                    border: p ? `1px solid ${p.color}50` : '1px dashed rgba(56,74,110,0.3)',
                    borderRadius: 10, padding: '10px 14px',
                  }}>
                    {p ? (
                      <>
                        <span
                          style={{ fontSize: '1.4rem', cursor: (p.userId === userId || (isHost && p.isBot)) ? 'pointer' : 'default' }}
                          onClick={() => {
                            if (p.userId === userId || (isHost && p.isBot)) setPickingVehicle(p.userId);
                          }}
                          title="اضغط لتغيير العربية"
                        >{p.vehicle} {(p.userId === userId || (isHost && p.isBot)) ? <span style={{fontSize:'0.6rem', color:'#9AA6BC'}}>✏️</span> : null}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 800, color: p.color, fontSize: '0.95rem', fontFamily: "'Cairo'" }}>
                            {p.nickname}
                            {p.isHost && <span style={{ marginRight: 6, fontSize: '0.7rem', color: '#E0B43C' }}>👑</span>}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: p.isOnline ? '#6EE7B7' : '#F4A38A', fontFamily: "'Cairo'" }}>
                            {p.isOnline ? '● متصل' : '● منقطع'}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <div style={{ color: 'rgba(154,166,188,0.3)', fontSize: '0.8rem', fontFamily: "'Cairo'" }}>
                          مكان فاضي...
                        </div>
                        {isHost && room.status === 'waiting' && (
                          <button onClick={() => addBot()}
                            style={{ background: 'rgba(78,130,255,0.15)', border: '1px solid rgba(78,130,255,0.35)',
                              borderRadius: 8, color: '#90B8FF', fontFamily: "'Cairo'",
                              fontWeight: 700, fontSize: '0.78rem', padding: '4px 10px', cursor: 'pointer' }}>
                            🤖 إضافة بوت
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vehicle picker overlay */}
          {pickingVehicle && (
            <div style={{ ...S.card, marginBottom: 14 }}>
              <p style={{ ...S.label, marginBottom: 10 }}>اختر عربيتك 🚗</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {VEHICLES.map((v) => {
                  const taken = room.players.some((p) => p.userId !== pickingVehicle && p.vehicle === v.emoji);
                  return (
                    <button key={v.emoji}
                      disabled={taken}
                      onClick={() => {
                        updateVehicle(pickingVehicle, v.emoji);
                        setPickingVehicle(null);
                      }}
                      style={{
                        padding: '12px 0', borderRadius: 10, border: 'none',
                        background: taken ? 'rgba(14,23,38,0.3)' : 'rgba(14,23,38,0.8)',
                        fontSize: '1.8rem', cursor: taken ? 'not-allowed' : 'pointer',
                        opacity: taken ? 0.3 : 1,
                      }}>
                      {v.emoji}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setPickingVehicle(null)}
                style={{ marginTop: 10, width: '100%', padding: '8px', borderRadius: 8, border: 'none',
                  background: 'rgba(154,166,188,0.1)', color: '#9AA6BC',
                  fontFamily: "'Cairo'", fontWeight: 700, cursor: 'pointer' }}>
                إلغاء
              </button>
            </div>
          )}

          {/* Start button (host only, min 2 players) */}
          {isHost && room.players.length >= 2 && (
            <button onClick={handleStart} style={S.btnGold}>
              🎲 ابدأ اللعبة
            </button>
          )}
          {isHost && room.players.length < 2 && (
            <p style={{ textAlign: 'center', color: '#9AA6BC', fontFamily: "'Cairo'", fontSize: '0.85rem' }}>
              في انتظار لاعب تاني على الأقل...
            </p>
          )}
          {!isHost && (
            <p style={{ textAlign: 'center', color: '#9AA6BC', fontFamily: "'Cairo'", fontSize: '0.85rem' }}>
              في انتظار الهوست يبدأ اللعبة...
            </p>
          )}

          {msg && (
            <div style={{
              marginTop: 12, borderRadius: 10, padding: '10px 14px', textAlign: 'center',
              background: isErr ? 'rgba(199,91,57,0.15)' : 'rgba(16,185,129,0.12)',
              border: `1px solid ${isErr ? 'rgba(199,91,57,0.4)' : 'rgba(16,185,129,0.35)'}`,
              color: isErr ? '#F4A38A' : '#6EE7B7', fontFamily: "'Cairo'", fontSize: '0.85rem',
            }}>{msg}</div>
          )}
        </div>
      </div>
    );
  }

  // ── CREATE / JOIN VIEW ──────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={{ width: '100%', maxWidth: 420, marginTop: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <h1 style={{ fontFamily: "'Rakkas', serif", fontSize: '2rem', fontWeight: 900, margin: 0,
            background: 'linear-gradient(135deg, #F4CE5E, #E0B43C)', WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent' }}>
            👥 الأصدقاء
          </h1>
        </div>

        <div style={{ ...S.card }}>
          {/* Tab switcher */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {(['create', 'join'] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.9rem',
                  background: tab === t ? 'linear-gradient(135deg, #E8C040, #C49020)' : 'rgba(14,23,38,0.8)',
                  color: tab === t ? '#0E1726' : '#9AA6BC' }}>
                {t === 'create' ? '➕ غرفة جديدة' : '🔑 انضم لغرفة'}
              </button>
            ))}
          </div>

          {tab === 'create' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ margin: 0, color: '#9AA6BC', fontFamily: "'Cairo'", fontSize: '0.85rem', textAlign: 'center' }}>
                هتلعب كـ <span style={{ color: '#F4CE5E', fontWeight: 800 }}>{nickname}</span>
              </p>
              <button onClick={handleCreate} disabled={loading} style={S.btnGold}>
                {loading ? '...' : 'إنشاء غرفة 🎲'}
              </button>
            </div>
          )}

          {tab === 'join' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={S.label}>كود الغرفة</label>
                <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="XKBQ" maxLength={4} style={{ ...S.input, fontSize: '1.5rem', letterSpacing: '0.3em' }}
                  autoCapitalize="characters" autoCorrect="off" />
              </div>
              <button onClick={handleJoin} disabled={loading} style={S.btnGold}>
                {loading ? '...' : 'انضم 🚀'}
              </button>
            </div>
          )}

          {(msg || error) && (
            <div style={{
              marginTop: 14, borderRadius: 10, padding: '10px 14px', textAlign: 'center',
              background: 'rgba(199,91,57,0.15)', border: '1px solid rgba(199,91,57,0.4)',
              color: '#F4A38A', fontFamily: "'Cairo'", fontSize: '0.85rem',
            }}>{msg || error}</div>
          )}
        </div>

        <button onClick={() => navigate(ROUTES.home)}
          style={{ marginTop: 20, background: 'none', border: 'none',
            color: 'rgba(154,166,188,0.6)', fontFamily: "'Cairo'", fontSize: '0.85rem', cursor: 'pointer',
            display: 'block', margin: '20px auto 0' }}>
          ← رجوع للقائمة الرئيسية
        </button>
      </div>
    </div>
  );
}
