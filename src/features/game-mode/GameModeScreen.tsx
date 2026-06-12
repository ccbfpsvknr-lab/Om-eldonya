import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { VEHICLES } from '@/lib/vehicles';
import { usePlayersStore, useGameStore } from '@/store';
import { useRoomStore } from '@/store/useRoomStore';
import { useAuthStore } from '@/store/useAuthStore';
import type { GameMode } from '@/store/useGameStore';

type Mode = 'quick' | 'classic';
type Tab  = 'online' | 'friends' | 'passplay' | 'bots';

const BOT_COUNTS = [1, 2, 3];

export function GameModeScreen() {
  const navigate    = useNavigate();
  const { profile } = useAuthStore();
  const [tab, setTab]         = useState<Tab | null>(null);
  const [mode, setMode]       = useState<Mode>('quick');
  const [botCount, setBotCount] = useState(1);

  const resetPlayers  = usePlayersStore((s) => s.resetPlayers);
  const addPlayer     = usePlayersStore((s) => s.addPlayer);
  const toggleBot     = usePlayersStore((s) => s.toggleBot);
  const setGameMode   = useGameStore((s) => s.setMode);
  const { room }      = useRoomStore();

  /* ── Handlers ──────────────────────────────────────────────────────────── */
  const startBots = () => {
    resetPlayers();
    const nick = profile?.nickname || 'لاعب 1';
    addPlayer(nick, VEHICLES[0].emoji);
    for (let i = 0; i < botCount; i++) {
      addPlayer('', VEHICLES[(i + 1) % VEHICLES.length].emoji);
      const players = usePlayersStore.getState().players;
      toggleBot(players[players.length - 1].id);
    }
    setGameMode(mode as GameMode);
    navigate(ROUTES.reveal);
  };

  const startPassPlay = () => {
    resetPlayers();
    setGameMode(mode as GameMode);
    navigate(ROUTES.players);
  };

  const startFriends = () => {
    if (!profile) { navigate(ROUTES.auth); return; }
    useRoomStore.getState().setMode?.(mode);
    navigate(ROUTES.rooms);
  };

  /* ── Styles ─────────────────────────────────────────────────────────────── */
  const card = (active: boolean, accent = '#E8C040'): React.CSSProperties => ({
    borderRadius: 18,
    border: active ? `1.5px solid ${accent}` : '1px solid rgba(56,74,110,0.4)',
    background: active ? `${accent}10` : 'rgba(22,34,58,0.7)',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const modeBtn = (sel: boolean, accent = '#E8C040'): React.CSSProperties => ({
    flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer',
    fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.88rem',
    background: sel ? `linear-gradient(135deg,${accent},${accent}bb)` : 'rgba(14,23,38,0.8)',
    color: sel ? '#0E1726' : '#9AA6BC',
  });

  const startBtn = (accent = '#E8C040'): React.CSSProperties => ({
    width: '100%', padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
    fontFamily: "'Cairo'", fontWeight: 900, fontSize: '1rem', marginTop: 12,
    background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
    color: '#0E1726',
  });

  const TABS: { id: Tab; icon: string; label: string; sub: string; accent: string; locked?: boolean }[] = [
    { id: 'online',   icon: '🌐', label: 'Online',          sub: 'قريباً — العب أونلاين مع أي حد',  accent: '#A78BFA', locked: true  },
    { id: 'friends',  icon: '👥', label: 'Private Game',   sub: 'ابعت لأصحابك و العبوا سوا',   accent: '#4FC3F7'                },
    { id: 'passplay', icon: '📱', label: 'Pass & Play',    sub: 'العب مع صحابك على جهاز واحد',  accent: '#6EE7B7'                },
    { id: 'bots',     icon: '🤖', label: 'Offline',        sub: 'العب مع البوتات',          accent: '#FB923C'              },
  ];

  const active = TABS.find((t) => t.id === tab)!;

  return (
    <div style={{
      minHeight: '100dvh', background: '#0E1726',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px 10px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(56,74,110,0.3)' }}>
        <button onClick={() => navigate(ROUTES.home)}
          style={{ background: 'none', border: '1px solid rgba(56,74,110,0.5)', borderRadius: 8,
            color: '#9AA6BC', padding: '6px 12px', fontFamily: "'Cairo'", cursor: 'pointer', fontSize: '0.85rem' }}>
          ← رجوع
        </button>
        <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontFamily: "'Rakkas', serif",
          fontSize: '1.5rem', background: 'linear-gradient(135deg,#F4CE5E,#E0B43C)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🎲 يلا بينا
        </h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Mode tabs */}
      <div style={{ padding: '14px 16px 0', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflowY: 'auto' }}>
        {TABS.map((t) => (
          <div key={t.id} onClick={() => !t.locked && setTab(tab === t.id ? null : t.id)}
            style={{ ...card(tab === t.id, t.accent), opacity: t.locked ? 0.5 : 1,
              cursor: t.locked ? 'not-allowed' : 'pointer' }}>
            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: '1.8rem' }}>{t.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 900, fontSize: '1rem',
                  color: tab === t.id ? t.accent : '#EADBB7' }}>{t.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#9AA6BC' }}>{t.sub}</div>
              </div>
              {t.locked && (
                <span style={{ fontSize: '0.7rem', background: 'rgba(167,139,250,0.15)',
                  border: '1px solid rgba(167,139,250,0.3)', color: '#A78BFA',
                  borderRadius: 20, padding: '3px 10px' }}>قريباً</span>
              )}
              {!t.locked && (
                <span style={{ color: tab === t.id ? t.accent : 'rgba(154,166,188,0.3)',
                  fontSize: '1rem', transition: 'all 0.2s' }}>
                  {tab === t.id ? '▲' : '▼'}
                </span>
              )}
            </div>

            {/* Expanded content */}
            {tab === t.id && !t.locked && (
              <div style={{ marginTop: 14, borderTop: '1px solid rgba(56,74,110,0.3)', paddingTop: 14 }}>

                {/* Bot count selector (bots only) */}
                {t.id === 'bots' && (
                  <div style={{ marginBottom: 12 }}>
                    <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#9AA6BC' }}>عدد البوتات</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {BOT_COUNTS.filter((n) => n <= maxBots).map((n) => (
                        <button key={n} onClick={(e) => { e.stopPropagation(); setBotCount(n); }}
                          style={{ ...modeBtn(botCount === n, t.accent), padding: '9px 0' }}>
                          {n} 🤖
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fast / Classic toggle */}
                <p style={{ margin: '0 0 8px', fontSize: '0.8rem', color: '#9AA6BC' }}>نوع اللعبة</p>
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <button onClick={(e) => { e.stopPropagation(); setMode('quick'); if (botCount > 2) setBotCount(2); }}
                    style={modeBtn(mode === 'quick', t.accent)}>
                    ⚡ سريعة
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); setMode('classic'); }}
                    style={modeBtn(mode === 'classic', t.accent)}>
                    🏛️ كلاسيك
                  </button>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: 'rgba(154,166,188,0.5)' }}>
                  {mode === 'quick' ? '⚡ 5~30 دقيقة — 2 أو 3 لاعبين' : '🏛️ 20~60 دقيقة — 2 لـ 4 لاعبين'}
                </p>

                {/* Start button */}
                {t.id === 'bots' && (
                  <button onClick={(e) => { e.stopPropagation(); startBots(); }} style={startBtn(t.accent)}>
                    ابدأ اللعبة 🎲
                  </button>
                )}
                {t.id === 'passplay' && (
                  <button onClick={(e) => { e.stopPropagation(); startPassPlay(); }} style={startBtn(t.accent)}>
                    أضف اللاعبين 👥
                  </button>
                )}
                {t.id === 'friends' && (
                  <button onClick={(e) => { e.stopPropagation(); startFriends(); }} style={startBtn(t.accent)}>
                    {room?.status === 'waiting' ? 'أكمل الغرفة 🚪' : 'إنشاء أو انضم 🚀'}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ height: 24 }} />
    </div>
  );
}
