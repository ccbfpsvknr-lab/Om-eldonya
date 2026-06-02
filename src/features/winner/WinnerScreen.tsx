import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ScreenContainer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { useGameStore, usePlayersStore, useMatchStore } from '@/store';
import { ROUTES } from '@/lib/constants';
import type { Player } from '@/game/types';

interface TitleDef { name: string; icon: string; desc: string; holder: string }

function computeTitles(players: Player[], winnerId: string | null): TitleDef[] {
  const active = players.filter((p) => p.isActive);
  const all = players;

  const byId = (id: string | null | undefined) =>
    id ? (players.find((p) => p.id === id)?.name ?? '—') : '—';

  const maxBy = (arr: Player[], fn: (p: Player) => number) =>
    arr.reduce((best, p) => fn(p) > fn(best) ? p : best, arr[0] ?? players[0]);
  const minBy = (arr: Player[], fn: (p: Player) => number) =>
    arr.reduce((best, p) => fn(p) < fn(best) ? p : best, arr[0] ?? players[0]);

  const richest = maxBy(all, (p) => p.cash);
  const poorest = minBy(all.filter((p) => p.isActive), (p) => p.cash);
  const luckiest = maxBy(all, (p) => p.laps);
  const jailbird = maxBy(all, (p) => p.jailCount);
  const trader = maxBy(all, (p) => p.tradesCompleted);
  const earner = maxBy(all, (p) => p.totalEarned);

  return [
    { name: 'كبير البلد', icon: '👑', desc: 'الفائز بالمباراة', holder: byId(winnerId) },
    { name: 'بيل جيتس', icon: '💰', desc: 'أغنى لاعب في النهاية', holder: richest?.name ?? '—' },
    { name: 'فقري', icon: '🪙', desc: 'الأقل فلوس في النهاية', holder: poorest?.name ?? '—' },
    { name: 'ابن حظ', icon: '🍀', desc: 'أكتر واحد لفّ اللوحة', holder: luckiest?.name ?? '—' },
    { name: 'زبون البوكس', icon: '🚔', desc: 'أكتر واحد اتقبض عليه', holder: jailbird?.name ?? '—' },
    { name: 'كبير السماسرة', icon: '🤝', desc: 'أكتر واحد اتصفق', holder: trader?.name ?? '—' },
    { name: 'المعلم', icon: '🎩', desc: 'أكتر واحد كسب فلوس', holder: earner?.name ?? '—' },
  ];
}

export function WinnerScreen() {
  const navigate = useNavigate();
  const config = useGameStore((s) => s.config);
  const resetGame = useGameStore((s) => s.resetGame);
  const resetPlayers = usePlayersStore((s) => s.resetPlayers);
  const game = useMatchStore((s) => s.game);
  const resetMatch = useMatchStore((s) => s.resetMatch);

  const players = game?.players ?? [];
  const winnerId = game?.winnerId ?? null;
  const winner = players.find((p) => p.id === winnerId);
  const titles = computeTitles(players, winnerId);
  const stats = game?.statistics;

  const playAgain = () => {
    resetMatch();
    resetGame();
    resetPlayers();
    navigate(ROUTES.home);
  };

  const durationMs = (stats?.finishedAt ?? Date.now()) - (stats?.startedAt ?? Date.now());
  const durationMin = Math.round(durationMs / 60000);

  return (
    <ScreenContainer
      header={{ title: 'النتيجة النهائية', showBack: false }}
      footer={
        <div className="flex gap-3">
          <Button block size="lg" variant="ghost" onClick={() => navigate(ROUTES.home)}>الرئيسية</Button>
          <Button block size="lg" onClick={playAgain}>العب تاني</Button>
        </div>
      }
    >
      <div className="space-y-8">
        {/* Winner hero */}
        <Card accent padding="lg" className="animate-pop-in text-center">
          <div className="mb-3 text-7xl">👑</div>
          <Badge tone="gold" className="mb-3">الفائز</Badge>
          {winner ? (
            <>
              <span className="mb-2 block text-5xl">{winner.vehicle}</span>
              <h2 className="text-gold-sheen text-4xl">{winner.name}</h2>
              <p className="mt-2 text-sm text-muted">
                رصيده النهائي:{' '}
                <span className="font-extrabold text-gold">{winner.cash.toLocaleString('en-US')} جنيه</span>
              </p>
            </>
          ) : (
            <h2 className="text-gold-sheen text-3xl">انتهت المباراة</h2>
          )}
        </Card>

        {/* Final standings */}
        {players.length > 1 && (
          <section className="space-y-2">
            <SectionLabel>الترتيب النهائي</SectionLabel>
            <ul className="space-y-2">
              {[...players]
                .sort((a, b) => b.cash - a.cash)
                .map((p, i) => (
                  <li key={p.id}
                    className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3">
                    <span className="w-6 text-center font-mono text-sm text-muted">{i + 1}</span>
                    <span className="text-xl">{p.vehicle}</span>
                    <span className="flex-1 truncate font-bold text-content">{p.name}</span>
                    {!p.isActive && <Badge tone="clay">أفلس</Badge>}
                    <span className={`font-extrabold tabular-nums ${p.cash < 0 ? 'text-danger' : 'text-gold'}`}>
                      {p.cash.toLocaleString('en-US')}
                    </span>
                  </li>
                ))}
            </ul>
          </section>
        )}

        {/* Titles */}
        <section className="space-y-3">
          <SectionLabel>الألقاب</SectionLabel>
          <ul className="space-y-2">
            {titles.map((t) => (
              <li key={t.name}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-2xl">
                  {t.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-content">{t.name}</span>
                  <span className="block text-xs text-muted truncate">{t.desc}</span>
                </span>
                <Badge tone="neutral" className="shrink-0">{t.holder}</Badge>
              </li>
            ))}
          </ul>
        </section>

        {/* Statistics */}
        <section className="space-y-3">
          <SectionLabel>إحصائيات</SectionLabel>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label="اللاعبين" value={players.length} />
            <StatTile label="الجولات" value={game?.round ?? '—'} />
            <StatTile label="رميات الزهر" value={stats?.rolls ?? '—'} />
            <StatTile label="مرات رمسيس" value={stats?.ramsesPasses ?? '—'} />
            <StatTile label="مدة اللعب" value={durationMin > 0 ? `${durationMin} دقيقة` : '—'} />
            <StatTile label="اللوحة" value={
              game?.boardSize === 'fast' ? 'سريعة' :
              game?.boardSize === 'full' ? 'كاملة' : 'كلاسيك'
            } />
          </div>
        </section>
      </div>
    </ScreenContainer>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-sand/80">{children}</h3>
      <span className="hr-glyph flex-1" />
    </div>
  );
}
function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-surface/60 p-4 text-center">
      <div className="text-2xl font-extrabold tabular-nums text-gold">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}
