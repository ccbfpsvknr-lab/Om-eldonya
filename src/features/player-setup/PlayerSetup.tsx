import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '@/components/layout';
import { Button, Input, IconButton, Badge } from '@/components/ui';
import { usePlayersStore, selectCanStart, useGameStore } from '@/store';
import { useModal } from '@/hooks/useModal';
import { ROUTES, PLAYER_LIMITS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import { VEHICLES } from '@/lib/vehicles';
import { randomNickname } from '@/lib/nicknames';

export function PlayerSetup() {
  const navigate = useNavigate();
  const { confirm } = useModal();

  const players = usePlayersStore((s) => s.players);
  const addPlayer = usePlayersStore((s) => s.addPlayer);
  const removePlayer = usePlayersStore((s) => s.removePlayer);
  const canStart = usePlayersStore(selectCanStart);

  const setPhase = useGameStore((s) => s.setPhase);
  const maxPlayers = useGameStore((s) => s.config.maxPlayers);

  // Track which vehicles are already taken
  const takenVehicles = new Set(players.map((p) => p.vehicle));
  const availableVehicles = VEHICLES.filter((v) => !takenVehicles.has(v.emoji));
  const firstAvailable = availableVehicles[0]?.emoji ?? VEHICLES[0].emoji;

  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState<string>(firstAvailable);
  const full = players.length >= Math.min(maxPlayers, PLAYER_LIMITS.max);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (full) return;
    const trimmed = name.trim();
    // Empty name → random Egyptian nickname (not already used)
    const finalName = trimmed || randomNickname(players.map((p) => p.name));
    // Use currently selected vehicle (if taken, pick first available)
    const finalVehicle = takenVehicles.has(vehicle) ? firstAvailable : vehicle;
    addPlayer(finalName, finalVehicle);
    setName('');
    // Advance selection to next available vehicle
    const remaining = VEHICLES.filter((v) => !takenVehicles.has(v.emoji) && v.emoji !== finalVehicle);
    setVehicle(remaining[0]?.emoji ?? VEHICLES[0].emoji);
  };

  const handleRemove = async (id: string, playerName: string) => {
    const ok = await confirm({
      title: 'إزالة لاعب',
      message: `متأكد إنك عايز تشيل «${playerName}»؟`,
      confirmLabel: 'شيله',
      danger: true,
    });
    if (ok) removePlayer(id);
  };

  const start = () => {
    setPhase('reveal');
    navigate(ROUTES.reveal);
  };

  return (
    <ScreenContainer
      header={{ title: 'اللاعبين' }}
      footer={
        <Button block size="lg" disabled={!canStart} onClick={start}>
          {canStart ? 'يلا نبدأ' : `محتاجين ${PLAYER_LIMITS.min} لاعبين على الأقل`}
        </Button>
      }
    >
      <div className="space-y-6">
        <form onSubmit={submit} className="flex gap-2">
          <Input
            name="playerName"
            placeholder="اكتب اسم اللاعب (أو اتركه فارغ للاسم العشوائي)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            disabled={full}
            autoFocus
          />
          <Button type="submit" disabled={full} className="shrink-0 px-5">
            ضيف
          </Button>
        </form>

        {/* Vehicle picker — only available (unchosen) vehicles are shown */}
        {!full && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-sand/90">اختار عربيتك</p>
            <div className="grid grid-cols-3 gap-2">
              {VEHICLES.map((v) => {
                const taken = takenVehicles.has(v.emoji);
                const active = v.emoji === vehicle && !taken;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => !taken && setVehicle(v.emoji)}
                    disabled={taken}
                    aria-pressed={active}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-2xl border p-3 transition-all',
                      taken
                        ? 'cursor-not-allowed border-border/30 bg-surface/30 opacity-40'
                        : active
                        ? 'border-gold/70 bg-gold/10 shadow-glow'
                        : 'border-border/70 bg-surface/60 hover:border-gold/40',
                    )}
                  >
                    <span className="text-3xl" aria-hidden>{v.emoji}</span>
                    <span className="text-xs font-bold text-content">{v.name}</span>
                    {taken && <span className="text-[9px] text-muted">محجوز</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">
            {players.length} / {Math.min(maxPlayers, PLAYER_LIMITS.max)}
          </span>
          {full && <Badge tone="clay">اكتمل العدد</Badge>}
        </div>

        {players.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="space-y-2">
            {players.map((p) => (
              <li
                key={p.id}
                className="flex animate-scale-in items-center gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-xl"
                  style={{ backgroundColor: p.color }}
                  aria-hidden
                >
                  {p.vehicle}
                </span>
                <span className="flex-1 truncate font-bold text-content">{p.name}</span>
                {p.isHost && <Badge tone="gold">المضيف</Badge>}
                <IconButton
                  label={`إزالة ${p.name}`}
                  size="sm"
                  onClick={() => handleRemove(p.id, p.name)}
                  className="hover:border-danger/50 hover:text-danger"
                >
                  ✕
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ScreenContainer>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border/70 px-6 py-12 text-center">
      <span className="text-5xl opacity-70">🧑‍🤝‍🧑</span>
      <p className="font-bold text-content">لسه مفيش لاعبين</p>
      <p className="text-sm text-muted">
        ضيف أسامي أصحابك، أو اتركها فارغة وهيطلع اسم مصري عشوائي 😄
      </p>
    </div>
  );
}
