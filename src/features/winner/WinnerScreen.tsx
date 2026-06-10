import { useNavigate } from 'react-router-dom';
import { useGameStore, usePlayersStore, useMatchStore } from '@/store';
import { ROUTES } from '@/lib/constants';
import type { Player } from '@/game/types';

interface TitleDef { name: string; icon: string; desc: string; holder: string; color: string }

function computeTitles(
  players: Player[],
  winnerId: string | null,
  eliminatedOrder: string[],
): TitleDef[] {
  const byId  = (id: string | null | undefined) =>
    id ? (players.find((p) => p.id === id)?.name ?? '—') : '—';
  const maxBy = (arr: Player[], fn: (p: Player) => number) =>
    arr.reduce((best, p) => fn(p) > fn(best) ? p : best, arr[0] ?? players[0]);

  const richest  = maxBy(players, (p) => p.cash);
  const jailbird = maxBy(players, (p) => p.jailCount);
  const firstOut = eliminatedOrder[0] ?? null;

  return [
    { name: 'الكبير أوي', icon: '🏆', desc: 'كسب المباراة وعمل كلكم حاجة',       holder: byId(winnerId),         color: '#E0B43C' },
    { name: 'عم دهب',     icon: '💰', desc: 'أغنى لاعب في نهاية اللعبة',         holder: richest?.name ?? '—',   color: '#F4CE5E' },
    { name: 'زبون البوكس',icon: '🚔', desc: 'أكتر واحد البوليس وداه السجن',       holder: jailbird?.name ?? '—',  color: '#C75B39' },
    { name: 'بليلة',      icon: '💀', desc: 'أول واحد أفلس وخرج من اللعبة',       holder: firstOut ? byId(firstOut) : '—', color: '#9AA6BC' },
  ];
}

export function WinnerScreen() {
  const navigate     = useNavigate();
  const resetGame    = useGameStore((s) => s.resetGame);
  const config       = useGameStore((s) => s.config);
  const resetPlayers = usePlayersStore((s) => s.resetPlayers);
  const lobbyPlayers = usePlayersStore((s) => s.players);
  const game         = useMatchStore((s) => s.game);
  const resetMatch   = useMatchStore((s) => s.resetMatch);
  const createMatch  = useMatchStore((s) => s.createMatch);

  const players         = game?.players ?? [];
  const winnerId        = game?.winnerId ?? null;
  const eliminatedOrder = game?.eliminatedOrder ?? [];
  const winner          = players.find((p) => p.id === winnerId);
  const titles          = computeTitles(players, winnerId, eliminatedOrder);
  const stats           = game?.statistics;
  const durationMs      = (stats?.finishedAt ?? Date.now()) - (stats?.startedAt ?? Date.now());
  const durationMin     = Math.round(durationMs / 60000);

  const playAgain = () => {
    resetMatch();                          // wipe old match state
    createMatch(config, lobbyPlayers);     // new game — same players & mode
    navigate(ROUTES.reveal);              // re-randomize who goes first
  };

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden" dir="rtl"
      style={{ background: '#060d1e' }}>

      {/* ── Background ── */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden
        viewBox="0 0 400 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="wgold" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#E0B43C" stopOpacity="0.12"/>
            <stop offset="100%" stopColor="#E0B43C" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="wbottom" cx="50%" cy="100%" r="60%">
            <stop offset="0%" stopColor="#C75B39" stopOpacity="0.08"/>
            <stop offset="100%" stopColor="#C75B39" stopOpacity="0"/>
          </radialGradient>
        </defs>
        <rect width="400" height="900" fill="#060d1e"/>
        <rect width="400" height="900" fill="url(#wgold)"/>
        <rect width="400" height="900" fill="url(#wbottom)"/>
        {/* Stars */}
        {[28,14,72,36,118,22,165,8,210,44,255,18,298,32,342,50,14,68,48,12,95,56,140,
          28,188,42,232,16,278,60,322,38,368,24].reduce<number[][]>((acc,v,i)=>
            i%2===0 ? [...acc,[v]] : [...acc.slice(0,-1),[...acc[acc.length-1],v]], [])
          .map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r={i%3===0?1.2:i%3===1?0.9:0.7}
            fill="white" opacity={0.2+((i*7)%5)*0.1}/>
        ))}
        {/* Decorative bottom pyramids */}
        <polygon points="200,820 260,900 140,900" fill="#c47018" opacity="0.06"/>
        <polygon points="300,840 350,900 250,900" fill="#c47018" opacity="0.05"/>
      </svg>

      {/* ── Header ── */}
      <div className="relative z-10 flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <button onClick={() => navigate(ROUTES.home)}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,74,110,0.6)] bg-[rgba(14,23,38,0.8)]"
          style={{ color: '#EADBB7', fontSize: '14px' }}>
          ←
        </button>
        <h1 style={{ fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '1.05rem', color: '#EADBB7' }}>
          انتهت اللعبة
        </h1>
        <div style={{ width: '36px' }}/>
      </div>

      {/* ── Scrollable content ── */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 pb-4 space-y-4">

        {/* ── Winner hero ── */}
        <div className="rounded-2xl overflow-hidden animate-pop-in text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(40,28,4,0.97), rgba(22,15,2,0.99))',
            border: '1.5px solid rgba(224,180,60,0.55)',
            boxShadow: '0 0 40px rgba(224,180,60,0.2), 0 8px 32px rgba(0,0,0,0.5)',
          }}>
          {/* Gold top bar */}
          <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, transparent, #E0B43C 30%, #F4CE5E 50%, #E0B43C 70%, transparent)' }}/>

          <div className="px-6 py-7">
            {/* Trophy glow */}
            <div style={{ fontSize: '64px', lineHeight: 1, marginBottom: '12px',
              filter: 'drop-shadow(0 0 24px rgba(224,180,60,0.7))' }}>🏆</div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '6px' }}>
              <div className="h-px flex-1 max-w-12" style={{ background: 'linear-gradient(to left, rgba(224,180,60,0.6), transparent)' }}/>
              <span style={{ fontSize: '10px', letterSpacing: '0.25em', color: 'rgba(224,180,60,0.7)', fontFamily: "'Cairo'" }}>الكبير أوي</span>
              <div className="h-px flex-1 max-w-12" style={{ background: 'linear-gradient(to right, rgba(224,180,60,0.6), transparent)' }}/>
            </div>

            {winner ? (
              <>
                <div style={{ fontSize: '48px', lineHeight: 1, marginBottom: '8px',
                  filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.5))' }}>{winner.vehicle}</div>
                <h2 style={{ fontFamily: "'Rakkas', serif", fontSize: '2.2rem', lineHeight: 1,
                  background: 'linear-gradient(180deg, #F4CE5E, #E0B43C)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 12px rgba(224,180,60,0.4))' }}>
                  {winner.name}
                </h2>
                <p style={{ marginTop: '8px', fontSize: '13px', color: '#9AA6BC', fontFamily: "'Cairo'" }}>
                  معاه دلوقتي:{' '}
                  <span style={{ color: '#E0B43C', fontWeight: 800 }}>
                    {winner.cash.toLocaleString('en-US')} جنيه
                  </span>
                </p>
              </>
            ) : (
              <h2 style={{ fontFamily: "'Rakkas', serif", fontSize: '1.8rem', color: '#F4CE5E' }}>
                انتهت اللعبة
              </h2>
            )}
          </div>
        </div>

        {/* ── Final standings ── */}
        {players.length > 1 && (
          <div>
            <SectionLabel icon="📊">الترتيب الأخير</SectionLabel>
            <div className="space-y-2 mt-2">
              {[...players].sort((a, b) => b.cash - a.cash).map((p, i) => (
                <div key={p.id}
                  className="flex items-center gap-3 rounded-2xl overflow-hidden"
                  style={{
                    background: i === 0 ? 'rgba(40,28,4,0.9)' : 'rgba(14,23,38,0.85)',
                    border: `1.5px solid ${i === 0 ? 'rgba(224,180,60,0.4)' : 'rgba(56,74,110,0.4)'}`,
                    padding: '10px 12px',
                  }}>
                  {/* Rank */}
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: i === 0 ? 'rgba(224,180,60,0.2)' : 'rgba(56,74,110,0.3)',
                    fontFamily: 'monospace', fontWeight: 800, fontSize: '13px',
                    color: i === 0 ? '#E0B43C' : '#9AA6BC',
                  }}>
                    {i + 1}
                  </div>
                  {/* Vehicle */}
                  <span style={{ fontSize: '22px', lineHeight: 1 }}>{p.vehicle}</span>
                  {/* Name */}
                  <span style={{ flex: 1, fontFamily: "'Cairo'", fontWeight: 700,
                    color: i === 0 ? '#EADBB7' : '#9AA6BC', fontSize: '0.95rem',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.name}
                  </span>
                  {/* Bankrupt badge */}
                  {!p.isActive && (
                    <span style={{ fontSize: '10px', borderRadius: '6px', padding: '2px 6px',
                      background: 'rgba(199,91,57,0.2)', border: '1px solid rgba(199,91,57,0.4)', color: '#C75B39' }}>
                      أفلس 💀
                    </span>
                  )}
                  {/* Cash */}
                  <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '13px',
                    color: p.cash < 0 ? '#E05656' : i === 0 ? '#E0B43C' : '#9AA6BC' }}>
                    {p.cash.toLocaleString('en-US')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Titles ── */}
        <div>
          <SectionLabel icon="🎭">الألقاب</SectionLabel>
          <div className="space-y-2 mt-2">
            {titles.map((t) => (
              <div key={t.name}
                className="flex items-center gap-3 rounded-2xl overflow-hidden"
                style={{
                  background: 'rgba(14,23,38,0.85)',
                  border: `1px solid ${t.color}25`,
                  padding: '10px 12px',
                }}>
                {/* Icon */}
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${t.color}15`, border: `1px solid ${t.color}30`,
                  fontSize: '20px' }}>
                  {t.icon}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Cairo'", fontWeight: 800, color: t.color, fontSize: '0.95rem', lineHeight: 1.2 }}>
                    {t.name}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9AA6BC', fontFamily: "'Cairo'", marginTop: '2px' }}>
                    {t.desc}
                  </div>
                </div>
                {/* Holder */}
                <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: "'Cairo'",
                  background: `${t.color}18`, border: `1px solid ${t.color}35`,
                  color: t.color, borderRadius: '8px', padding: '4px 10px',
                  flexShrink: 0, maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.holder}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div>
          <SectionLabel icon="📈">أرقام اللعبة</SectionLabel>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {[
              { label: 'لاعبين',      value: players.length,        icon: '👥' },
              { label: 'جولات',       value: game?.round ?? '—',    icon: '🔄' },
              { label: 'رميات الزهر', value: stats?.rolls ?? '—',   icon: '🎲' },
              { label: 'مرات رمسيس', value: stats?.ramsesPasses ?? '—', icon: '👑' },
              { label: 'مدة اللعب',  value: durationMin > 0 ? `${durationMin}د` : '—', icon: '⏱️' },
              { label: 'اللوحة',     value: game?.boardSize === 'fast' ? 'سريعة' : game?.boardSize === 'full' ? 'كاملة' : 'كلاسيك', icon: '🗺️' },
            ].map(({ label, value, icon }) => (
              <div key={label}
                className="rounded-xl text-center"
                style={{ background: 'rgba(14,23,38,0.85)', border: '1px solid rgba(56,74,110,0.4)', padding: '10px 6px' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
                <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '14px', color: '#E0B43C' }}>{value}</div>
                <div style={{ fontSize: '9px', color: '#9AA6BC', fontFamily: "'Cairo'", marginTop: '2px' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer buttons ── */}
      <div className="relative z-10 px-4 pt-3 pb-4 flex-shrink-0 flex gap-3">
        <button onClick={() => navigate(ROUTES.home)}
          className="rounded-2xl py-3.5 transition-all active:scale-95"
          style={{ flex: 1, background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)',
            color: '#9AA6BC', fontFamily: "'Cairo', sans-serif", fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
          الرئيسية
        </button>
        <button onClick={playAgain}
          className="rounded-2xl py-3.5 transition-all active:scale-[0.98]"
          style={{ flex: 2, background: 'linear-gradient(135deg, #E8C040, #C49020)',
            color: '#0E1726', fontFamily: "'Cairo', sans-serif", fontSize: '1rem', fontWeight: 800,
            boxShadow: '0 4px 20px rgba(224,180,60,0.35)', border: 'none', cursor: 'pointer' }}>
          نعيد؟ 🎲
        </button>
      </div>
    </div>
  );
}

function SectionLabel({ icon, children }: { icon: string; children: string }) {
  return (
    <div className="flex items-center gap-2" dir="rtl">
      <span style={{ fontSize: '13px' }}>{icon}</span>
      <h3 style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(234,219,183,0.6)',
        letterSpacing: '0.08em', fontFamily: "'Cairo', sans-serif" }}>
        {children}
      </h3>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(to left, rgba(56,74,110,0.5), transparent)' }}/>
    </div>
  );
}
