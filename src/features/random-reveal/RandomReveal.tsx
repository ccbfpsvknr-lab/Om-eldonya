import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayersStore, useGameStore, useMatchStore } from '@/store';
import { useRoomStore } from '@/store/useRoomStore';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { ROUTES } from '@/lib/constants';
import { shuffle } from '@/lib/shuffle';

const POSITION_COLORS = [
  '#E0B43C', // gold
  '#2A9D8F', // teal
  '#C75B39', // clay
  '#9333EA', // purple
  '#E05656', // red
  '#56C48A', // green
];

export function RandomReveal() {
  const navigate    = useNavigate();
  const players     = usePlayersStore((s) => s.players);
  const mode        = useGameStore((s) => s.config.mode);
  const setPhase    = useGameStore((s) => s.setPhase);
  const createMatch = useMatchStore((s) => s.createMatch);

  const order = useMemo(() => shuffle(players), [players]);

  const room        = useRoomStore((s) => s.room);
  const myUserId    = useRoomStore((s) => s.myUserId);
  const isOnlineGame = !!room;
  const isOnlineHost = isOnlineGame && room?.hostId === myUserId;

  // Non-host: poll for game state — auto-navigate when host starts
  useEffect(() => {
    if (!isOnlineGame || isOnlineHost) return;
    const poll = setInterval(async () => {
      const { data } = await supabase.from('rooms')
        .select('game_state, status').eq('id', room!.id).single();
      if (data?.status === 'playing' && data?.game_state?.board) {
        clearInterval(poll);
        useMatchStore.setState({ game: data.game_state });
        useRoomStore.setState((s) => ({
          room: s.room ? { ...s.room, status: 'playing' } : null,
        }));
        navigate(ROUTES.board);
      }
    }, 1500);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnlineGame, isOnlineHost]);

  const proceed = async () => {
    createMatch({ mode, players: order });
    setPhase('playing');
    // AWAIT the DB write so non-host can poll it before we navigate away
    if (isOnlineHost && room) {
      const g = useMatchStore.getState().game;
      if (g) {
        await supabase.from('rooms')
          .update({ status: 'playing', game_state: g })
          .eq('id', room.id);
        useRoomStore.setState((s) => ({
          room: s.room ? { ...s.room, status: 'playing' } : null,
        }));
      }
    }
    navigate(ROUTES.board);
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060d1e]" dir="rtl">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 50%, rgba(224,180,60,0.07), transparent)' }} className="absolute inset-0"/>
        {/* Decorative stars */}
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white"
            style={{
              width: `${1 + (i % 3) * 0.5}px`,
              height: `${1 + (i % 3) * 0.5}px`,
              top: `${5 + (i * 23 % 55)}%`,
              left: `${(i * 37 % 90) + 5}%`,
              opacity: 0.3 + (i % 4) * 0.15,
            }}/>
        ))}
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,74,110,0.7)] bg-[rgba(14,23,38,0.8)] text-[#EADBB7]">
          ←
        </button>
        <h1 className="font-extrabold text-[#EADBB7]"
          style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.1rem' }}>
          القرعة
        </h1>
      </div>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 overflow-y-auto">

        {/* Hero card */}
        <div className="w-full rounded-2xl overflow-hidden animate-pop-in text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(30,20,2,0.97), rgba(18,12,2,0.99))',
            border: '1.5px solid rgba(224,180,60,0.5)',
            boxShadow: '0 0 32px rgba(224,180,60,0.2), 0 8px 32px rgba(0,0,0,0.5)',
          }}>

          {/* Top gold bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #E0B43C, transparent)' }}/>

          <div className="px-6 py-7">
            {/* Dice illustration */}
            <div className="mb-4 text-6xl" style={{ filter: 'drop-shadow(0 0 16px rgba(224,180,60,0.5))' }}>
              🎲
            </div>

            {/* Ornament */}
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to left, rgba(224,180,60,0.6), transparent)' }}/>
              <span className="text-[10px] tracking-[0.3em] font-bold" style={{ color: 'rgba(224,180,60,0.7)' }}>القرعة اتعملت</span>
              <div className="h-px flex-1 max-w-16" style={{ background: 'linear-gradient(to right, rgba(224,180,60,0.6), transparent)' }}/>
            </div>

            <h2 className="text-2xl font-extrabold mb-2"
              style={{ fontFamily: "'Rakkas', serif", color: '#F4CE5E', filter: 'drop-shadow(0 0 8px rgba(224,180,60,0.4))' }}>
              الترتيب اتحدد!
            </h2>
            <p className="text-xs text-[#9AA6BC] leading-relaxed">
              ده ترتيب اللعب. كل لاعب خد عربيته.<br/>اضغط «ابدأ الجولة» لما الكل يبص.
            </p>
          </div>
        </div>

        {/* Order list */}
        {order.length > 0 && (
          <div className="w-full space-y-2.5">
            {order.map((p, i) => (
              <div key={p.id}
                className="flex items-center gap-3 rounded-2xl overflow-hidden animate-scale-in"
                style={{
                  background: 'rgba(14,23,38,0.88)',
                  border: `1.5px solid ${POSITION_COLORS[i % POSITION_COLORS.length]}40`,
                  animationDelay: `${i * 0.08}s`,
                }}>
                {/* Position number */}
                <div className="flex h-14 w-14 flex-col items-center justify-center flex-shrink-0"
                  style={{ background: `${POSITION_COLORS[i % POSITION_COLORS.length]}18` }}>
                  <span className="text-xs font-bold" style={{ color: POSITION_COLORS[i % POSITION_COLORS.length] }}>
                    #{i + 1}
                  </span>

                </div>

                {/* Vehicle */}
                <div className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl flex-shrink-0"
                  style={{ background: `${POSITION_COLORS[i % POSITION_COLORS.length]}18`, border: `1px solid ${POSITION_COLORS[i % POSITION_COLORS.length]}30` }}>
                  {p.vehicle}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#EADBB7] truncate"
                    style={{ fontFamily: "'Cairo', sans-serif" }}>
                    {p.name}
                  </p>
                  <p className="text-[10px]" style={{ color: POSITION_COLORS[i % POSITION_COLORS.length] }}>
                    {['هيلعب الاول','هيلعب التاني','هيلعب التالت','هيلعب الرابع'][i] ?? `هيلعب #${i+1}`}
                  </p>
                </div>

                {/* Color dot */}
                <div className="w-2.5 h-2.5 rounded-full mr-3 flex-shrink-0"
                  style={{ background: POSITION_COLORS[i % POSITION_COLORS.length], boxShadow: `0 0 8px ${POSITION_COLORS[i % POSITION_COLORS.length]}` }}/>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 px-4 pt-3 pb-4 flex-shrink-0">
        <button onClick={isOnlineGame && !isOnlineHost ? undefined : () => { void proceed(); }}
          disabled={(isOnlineGame && !isOnlineHost) || order.length === 0}
          className="w-full rounded-2xl py-4 font-bold transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            background: 'linear-gradient(135deg, #E8C040, #C49020)',
            color: '#0E1726',
            fontFamily: "'Cairo', sans-serif",
            fontSize: '1.1rem',
            boxShadow: '0 4px 20px rgba(224,180,60,0.4)',
          }}>
          {isOnlineGame && !isOnlineHost ? 'في انتظار الهوست يبدأ...' : 'ابدأ الجولة ✦'}
        </button>
      </div>
    </div>
  );
}
