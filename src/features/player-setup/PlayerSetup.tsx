import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlayersStore, selectCanStart, useGameStore } from '@/store';
import { useAuthStore } from '@/store/useAuthStore';
import { useModal } from '@/hooks/useModal';
import { ROUTES, PLAYER_LIMITS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { VEHICLES } from '@/lib/vehicles';
import { randomNickname } from '@/lib/nicknames';

export function PlayerSetup() {
  const navigate    = useNavigate();
  const { confirm } = useModal();
  const players     = usePlayersStore((s) => s.players);
  const addPlayer      = usePlayersStore((s) => s.addPlayer);
  const changeVehicle  = usePlayersStore((s) => s.changeVehicle);
  const removePlayer = usePlayersStore((s) => s.removePlayer);
  const toggleBot    = usePlayersStore((s) => s.toggleBot);
  const canStart    = usePlayersStore(selectCanStart);
  const setPhase    = useGameStore((s) => s.setPhase);
  const mode        = useGameStore((s) => s.config.mode);
  const maxPlayers  = mode === 'quick' ? 3 : 4;  // fast=3 classic=4

  const profile = useAuthStore((s) => s.profile);
  const resetPlayers = usePlayersStore((s) => s.resetPlayers);

  // Pre-fill first player with account nickname on mount
  useEffect(() => {
    resetPlayers();
    if (profile?.nickname) {
      const veh = VEHICLES[0]?.emoji ?? '🚗';
      addPlayer(profile.nickname, veh);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const takenVehicles   = new Set(players.map((p) => p.vehicle));
  const availableVehicles = VEHICLES.filter((v) => !takenVehicles.has(v.emoji));
  const firstAvailable  = availableVehicles[0]?.emoji ?? VEHICLES[0].emoji;
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState<string>(firstAvailable);
  const [pickingFor, setPickingFor] = useState<string | null>(null); // player id
  const full = players.length >= maxPlayers;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (full) return;
    const finalName    = name.trim() || randomNickname(players.map((p) => p.name));
    const finalVehicle = takenVehicles.has(vehicle) ? firstAvailable : vehicle;
    addPlayer(finalName, finalVehicle);
    setName('');
    const remaining = VEHICLES.filter((v) => !takenVehicles.has(v.emoji) && v.emoji !== finalVehicle);
    setVehicle(remaining[0]?.emoji ?? VEHICLES[0].emoji);
  };

  const handleRemove = async (id: string, playerName: string) => {
    const ok = await confirm({ title: 'إزالة لاعب', message: `تشيل «${playerName}»؟`, confirmLabel: 'شيله', danger: true });
    if (ok) removePlayer(id);
  };

  const start = () => { setPhase('reveal'); navigate(ROUTES.reveal); };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060d1e]" dir="rtl">

      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ background: 'radial-gradient(ellipse 100% 50% at 50% 100%, rgba(42,157,143,0.08), transparent)' }} className="absolute inset-0"/>
        <div style={{ background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(14,23,38,0.8), transparent)' }} className="absolute inset-0"/>
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,74,110,0.7)] bg-[rgba(14,23,38,0.8)] text-[#EADBB7]">
          ←
        </button>
        <h1 className="flex-1 font-extrabold text-[#EADBB7]"
          style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.1rem' }}>
          اللاعبين
        </h1>
        <span className="rounded-xl border border-[rgba(56,74,110,0.5)] bg-[rgba(14,23,38,0.7)] px-3 py-1 text-xs text-[#9AA6BC]">
          {players.length} / {maxPlayers}
        </span>
      </div>

      <div className="relative z-10 flex flex-col flex-1 min-h-0 gap-4 overflow-y-auto px-4 pb-4">

        {/* ── Add player form ── */}
        {!full && (
          <form onSubmit={submit} className="rounded-2xl border border-[rgba(56,74,110,0.5)] bg-[rgba(14,23,38,0.85)] overflow-hidden">
            {/* Name input */}
            <div className="px-4 pt-4 pb-3">
              <p className="text-xs font-bold text-[#9AA6BC] mb-2" style={{ fontFamily: "'Cairo', sans-serif" }}>
                اسم اللاعب (اختياري)
              </p>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="او سيبه فاضي، و تاخد اسم عشوائي"
                  maxLength={20}
                  autoComplete="off"
                  className="flex-1 rounded-xl border border-[rgba(56,74,110,0.6)] bg-[rgba(22,34,58,0.8)] px-3 py-2.5 text-sm text-[#EADBB7] placeholder-[rgba(154,166,188,0.5)] outline-none focus:border-[rgba(224,180,60,0.5)]"
                  style={{ fontFamily: "'Cairo', sans-serif" }}
                />
                <button type="submit"
                  className="rounded-xl px-5 py-2.5 font-bold transition-all active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #E8C040, #C49020)',
                    color: '#0E1726',
                    fontFamily: "'Cairo', sans-serif",
                    fontSize: '0.9rem',
                    boxShadow: '0 2px 12px rgba(224,180,60,0.3)',
                  }}>
                  ضيف
                </button>
              </div>
            </div>

            {/* Vehicle picker */}
            <div className="px-4 pb-4 border-t border-[rgba(56,74,110,0.3)] pt-3">
              <p className="text-xs font-bold text-[#9AA6BC] mb-3" style={{ fontFamily: "'Cairo', sans-serif" }}>
                اختار عربيتك
              </p>
              <div className="grid grid-cols-6 gap-2">
                {VEHICLES.map((v) => {
                  const taken  = takenVehicles.has(v.emoji);
                  const active = v.emoji === vehicle && !taken;
                  return (
                    <button key={v.id} type="button"
                      disabled={taken}
                      onClick={() => !taken && setVehicle(v.emoji)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl py-2 transition-all',
                        taken ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer active:scale-95',
                      )}
                      style={{
                        background: active ? 'rgba(224,180,60,0.2)' : 'rgba(22,34,58,0.6)',
                        border: `1.5px solid ${active ? 'rgba(224,180,60,0.7)' : 'rgba(56,74,110,0.4)'}`,
                        boxShadow: active ? '0 0 14px rgba(224,180,60,0.3)' : 'none',
                      }}>
                      <span className="text-2xl leading-none">{v.emoji}</span>
                      <span className="text-[8px] font-bold leading-none"
                        style={{ color: active ? '#E0B43C' : '#9AA6BC' }}>
                        {v.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        )}

        {/* ── Players list ── */}
        {players.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-[rgba(56,74,110,0.4)] py-12">
            <span className="text-5xl opacity-50">🚗</span>
            <p className="text-sm font-bold text-[#EADBB7] opacity-60"
              style={{ fontFamily: "'Cairo', sans-serif" }}>
              مفيش لاعبين لسه
            </p>
            <p className="text-xs text-[#9AA6BC] text-center max-w-[200px]">
              ضيف الاسامي، او سيبها فاضية و هنديلك اسم مصري 😂
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {players.map((p, idx) => (
              <div key={p.id} className="rounded-2xl overflow-hidden animate-scale-in"
                style={{ background: p.isBot ? 'rgba(30,20,50,0.85)' : 'rgba(14,23,38,0.85)',
                  border: p.isBot ? '1px solid rgba(99,102,241,0.3)' : '1px solid rgba(56,74,110,0.5)' }}>
              <div className="flex items-center gap-3">
                {/* Color stripe */}
                <div className="w-1 self-stretch" style={{ background: p.color }}/>

                {/* Vehicle — tap to change */}
                <button
                  onClick={() => setPickingFor(pickingFor === p.id ? null : p.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl relative transition-all active:scale-90"
                  style={{ background: `${p.color}22`, border: `1px solid ${p.color}44` }}
                  title="تغيير العربية">
                  {p.vehicle}
                  <span style={{ position: 'absolute', bottom: '-4px', right: '-4px',
                    fontSize: '8px', background: 'rgba(14,23,38,0.9)', borderRadius: '4px', padding: '1px 2px' }}>
                    ✏️
                  </span>
                </button>

                {/* Name + info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#EADBB7] truncate"
                    style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem' }}>
                    {p.name}
                  </p>
                  <p className="text-[10px] text-[#9AA6BC]">
                    {p.isBot ? '🤖 بوت' : `لاعب ${idx + 1}`}
                    {p.isHost && ' • المضيف'}
                  </p>
                </div>

                {/* Host badge */}
                {p.isHost && (
                  <span className="text-[10px] font-bold rounded-full px-2 py-0.5"
                    style={{ background: 'rgba(224,180,60,0.15)', color: '#E0B43C', border: '1px solid rgba(224,180,60,0.3)' }}>
                    👑
                  </span>
                )}

                {/* Bot toggle */}
                <button onClick={() => toggleBot(p.id)}
                  title={p.isBot ? 'تحويل لاعب حقيقي' : 'تحويل لبوت'}
                  className="flex h-7 w-7 items-center justify-center rounded-lg transition-all active:scale-90 text-sm"
                  style={{
                    background: p.isBot ? 'rgba(99,102,241,0.2)' : 'rgba(56,74,110,0.3)',
                    border: p.isBot ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(56,74,110,0.4)',
                    color: p.isBot ? '#A5B4FC' : '#9AA6BC',
                  }}>
                  {p.isBot ? '🤖' : '👤'}
                </button>

                {/* Remove */}
                <button onClick={() => handleRemove(p.id, p.name)}
                  className="mr-3 flex h-7 w-7 items-center justify-center rounded-lg text-[#9AA6BC] hover:text-[#E05656] transition-colors text-sm">
                  ✕
                </button>
              </div>

              {/* Vehicle picker — expands when tapping the vehicle */}
              {pickingFor === p.id && (
                <div style={{ padding: '8px 12px 10px', borderTop: '1px solid rgba(56,74,110,0.3)',
                  background: 'rgba(10,18,35,0.9)' }}>
                  <p style={{ fontFamily: "'Cairo'", fontSize: '0.72rem', color: '#9AA6BC', marginBottom: 8 }}>
                    اختر عربيتك 🚗
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                    {VEHICLES.map((v) => {
                      const takenByOther = players.some((o) => o.id !== p.id && o.vehicle === v.emoji);
                      const isSelected   = p.vehicle === v.emoji;
                      return (
                        <button key={v.emoji}
                          disabled={takenByOther}
                          onClick={() => { changeVehicle(p.id, v.emoji); setPickingFor(null); }}
                          style={{
                            padding: '8px 0', borderRadius: 8, border: 'none', fontSize: '1.4rem',
                            background: isSelected ? `${p.color}33` : 'rgba(22,34,58,0.8)',
                            outline: isSelected ? `2px solid ${p.color}` : 'none',
                            opacity: takenByOther ? 0.25 : 1,
                            cursor: takenByOther ? 'not-allowed' : 'pointer',
                            transition: 'all 0.15s',
                          }}
                          title={v.name}>
                          {v.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="relative z-10 px-4 pt-3 pb-4 flex-shrink-0">
        {canStart ? (
          <button onClick={start}
            className="w-full rounded-2xl py-4 font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #E8C040, #C49020)',
              color: '#0E1726',
              fontFamily: "'Cairo', sans-serif",
              fontSize: '1.1rem',
              boxShadow: '0 4px 20px rgba(224,180,60,0.4)',
            }}>
            يلا نبدأ اللعبة ✦
          </button>
        ) : (
          <div className="rounded-2xl border border-[rgba(56,74,110,0.4)] bg-[rgba(14,23,38,0.7)] py-4 text-center text-sm text-[#9AA6BC]"
            style={{ fontFamily: "'Cairo', sans-serif" }}>
            محتاجين {PLAYER_LIMITS.min} لاعبين على الأقل
          </div>
        )}
      </div>
    </div>
  );
}
