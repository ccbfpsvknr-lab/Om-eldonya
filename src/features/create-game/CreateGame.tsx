import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store';
import { ROUTES, PLAYER_LIMITS } from '@/lib/constants';
import type { GameMode } from '@/types';

/* ─── Mode definitions ──────────────────────────────────────────────────────── */
const MODES: {
  id: GameMode; title: string; tagline: string; icon: string;
  features: string[]; tiles: number;
  accent: string; glow: string; bg: string; border: string;
}[] = [
  {
    id: 'quick',
    title: 'سريعة',
    tagline: 'جولة كاملة في ٣٠ دقيقة',
    icon: '⚡',
    features: ['بدون ترقيات', 'بدون سلفة', 'نهاية سريعة'],
    tiles: 16,
    accent: '#E8A820',
    glow: 'rgba(232,168,32,0.35)',
    bg: 'linear-gradient(135deg, rgba(40,22,2,0.95) 0%, rgba(22,12,2,0.98) 100%)',
    border: 'rgba(232,168,32,0.6)',
  },
  {
    id: 'classic',
    title: 'كلاسيك',
    tagline: 'اللعبة الكاملة بكل تفاصيلها',
    icon: '🏛️',
    features: ['ترقيات ومساومات', 'سلفة واستراتيجية', '٢٤ خانة'],
    tiles: 24,
    accent: '#2A9D8F',
    glow: 'rgba(42,157,143,0.35)',
    bg: 'linear-gradient(135deg, rgba(2,22,18,0.95) 0%, rgba(2,12,10,0.98) 100%)',
    border: 'rgba(42,157,143,0.6)',
  },
  {
    id: 'custom',
    title: 'مخصصة',
    tagline: 'رحلة مصر الكاملة',
    icon: '🗺️',
    features: ['٤٠ خانة', 'أخبار وأحداث', 'كل الميزات'],
    tiles: 40,
    accent: '#9333EA',
    glow: 'rgba(147,51,234,0.35)',
    bg: 'linear-gradient(135deg, rgba(16,4,28,0.95) 0%, rgba(8,2,16,0.98) 100%)',
    border: 'rgba(147,51,234,0.6)',
  },
];

/* ─── Main component ────────────────────────────────────────────────────────── */
export function CreateGame() {
  const navigate    = useNavigate();
  const config      = useGameStore((s) => s.config);
  const setMode     = useGameStore((s) => s.setMode);
  const updateConfig = useGameStore((s) => s.updateConfig);

  const selectedMode = MODES.find((m) => m.id === config.mode) ?? MODES[0];

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden bg-[#060d1e]" dir="rtl">

      {/* ── Background ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(14,23,38,0.9), transparent)' }}/>
        {/* Decorative road line */}
        <svg className="absolute bottom-0 left-0 right-0 w-full opacity-10" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path d="M0,60 Q100,40 200,60 Q300,80 400,60" stroke="#E0B43C" strokeWidth="2" fill="none" strokeDasharray="16,12"/>
        </svg>
        {/* Ambient glow based on selected mode */}
        <div className="absolute inset-0 transition-all duration-700"
          style={{ background: `radial-gradient(ellipse 60% 40% at 50% 100%, ${selectedMode.glow}, transparent)` }}/>
      </div>

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => navigate(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,74,110,0.7)] bg-[rgba(14,23,38,0.8)] text-[#EADBB7] transition-colors hover:border-[rgba(224,180,60,0.4)] backdrop-blur-sm">
          ←
        </button>
        <div className="flex-1">
          <h1 className="font-extrabold text-[#EADBB7] leading-tight"
            style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.1rem' }}>
            اختار نوع اللعبة
          </h1>
          <div dir="ltr" className="text-xs text-[rgba(224,180,60,0.7)] font-mono tracking-[0.2em]">
            {config.roomCode}
          </div>
        </div>
      </div>

      {/* ── Mode cards ── */}
      <div className="relative z-10 flex flex-col gap-3 px-4 flex-1 min-h-0 overflow-y-auto pb-2">
        {MODES.map((mode) => {
          const active = config.mode === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => setMode(mode.id)}
              className="relative w-full overflow-hidden rounded-2xl text-right transition-all duration-300"
              style={{
                background: mode.bg,
                border: `1.5px solid ${active ? mode.accent : 'rgba(56,74,110,0.4)'}`,
                boxShadow: active ? `0 0 24px ${mode.glow}, 0 4px 16px rgba(0,0,0,0.4)` : '0 2px 12px rgba(0,0,0,0.3)',
                transform: active ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {/* Card inner */}
              <div className="flex items-stretch gap-0">

                {/* Left: accent color stripe + icon */}
                <div className="flex w-20 flex-col items-center justify-center gap-1 py-5 flex-shrink-0"
                  style={{ background: `linear-gradient(180deg, ${mode.accent}22, ${mode.accent}11)`, borderLeft: `3px solid ${mode.accent}` }}>
                  <span className="text-4xl leading-none" style={{ filter: active ? `drop-shadow(0 0 12px ${mode.accent})` : 'none' }}>
                    {mode.icon}
                  </span>
                  <span className="text-[9px] font-bold tabular-nums" style={{ color: mode.accent, opacity: 0.8 }}>
                    {mode.tiles} خانة
                  </span>
                </div>

                {/* Right: content */}
                <div className="flex flex-1 flex-col justify-center px-4 py-4 gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-extrabold text-[#EADBB7] leading-none"
                      style={{ fontFamily: "'Cairo', sans-serif", fontSize: '1.2rem' }}>
                      {mode.title}
                    </h2>
                    {active && (
                      <span className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{ background: `${mode.accent}30`, color: mode.accent, border: `1px solid ${mode.accent}60` }}>
                        ✓ مختار
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#9AA6BC] leading-tight">{mode.tagline}</p>

                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    {mode.features.map((f) => (
                      <span key={f}
                        className="rounded-full px-2 py-0.5 text-[9px] font-bold"
                        style={{
                          background: active ? `${mode.accent}20` : 'rgba(56,74,110,0.3)',
                          color: active ? mode.accent : '#9AA6BC',
                          border: `1px solid ${active ? mode.accent + '40' : 'rgba(56,74,110,0.4)'}`,
                        }}>
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Selected shimmer overlay */}
              {active && (
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: `linear-gradient(90deg, transparent 0%, ${mode.accent}08 50%, transparent 100%)` }}/>
              )}
            </button>
          );
        })}

        {/* ── Player count ── */}
        <div className="rounded-2xl border border-[rgba(56,74,110,0.5)] bg-[rgba(14,23,38,0.85)] overflow-hidden mt-1">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[rgba(56,74,110,0.3)]">
            <span className="text-base">👥</span>
            <p className="flex-1 text-sm font-bold text-[#EADBB7]"
              style={{ fontFamily: "'Cairo', sans-serif" }}>
              عدد اللاعبين
            </p>
            <span className="text-xl font-extrabold text-[#E0B43C]"
              style={{ fontFamily: "'Cairo', sans-serif" }}>
              {config.maxPlayers}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-3 gap-2">
            {Array.from({ length: PLAYER_LIMITS.max - PLAYER_LIMITS.min + 1 }, (_, i) => {
              const n = i + PLAYER_LIMITS.min;
              const selected = config.maxPlayers === n;
              return (
                <button key={n}
                  onClick={() => updateConfig({ maxPlayers: n })}
                  className="flex-1 flex flex-col items-center gap-1 rounded-xl py-2 transition-all"
                  style={{
                    background: selected ? 'rgba(224,180,60,0.2)' : 'rgba(56,74,110,0.2)',
                    border: `1.5px solid ${selected ? 'rgba(224,180,60,0.6)' : 'rgba(56,74,110,0.4)'}`,
                    boxShadow: selected ? '0 0 12px rgba(224,180,60,0.25)' : 'none',
                  }}>
                  <span className="text-base leading-none">
                    {['🛺','🏍️','🚕','🚐','🚌','🚚'][i]}
                  </span>
                  <span className="text-[10px] font-bold"
                    style={{ color: selected ? '#E0B43C' : '#9AA6BC' }}>
                    {n}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Footer button ── */}
      <div className="relative z-10 px-4 pt-3 pb-4 flex-shrink-0">
        <button
          onClick={() => navigate(ROUTES.players)}
          className="relative w-full overflow-hidden rounded-2xl py-4 font-bold transition-all active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, ${selectedMode.accent} 0%, ${selectedMode.accent}CC 100%)`,
            boxShadow: `0 4px 20px ${selectedMode.glow}, 0 1px 0 rgba(255,255,255,0.15) inset`,
            fontFamily: "'Cairo', sans-serif",
            fontSize: '1.1rem',
            color: selectedMode.id === 'custom' ? '#fff' : '#0E1726',
          }}>
          <span className="flex items-center justify-center gap-2">
            <span>يلا نختار اللاعبين</span>
            <span>←</span>
          </span>
        </button>
      </div>
    </div>
  );
}
