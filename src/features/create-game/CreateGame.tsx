import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ScreenContainer } from '@/components/layout';
import { Button, Badge } from '@/components/ui';
import { useGameStore } from '@/store';
import { ROUTES, PLAYER_LIMITS } from '@/lib/constants';
import { cn } from '@/lib/cn';
import type { GameMode } from '@/types';

const MODES: { id: GameMode; title: string; desc: string; icon: string }[] = [
  { id: 'classic', title: 'كلاسيك', desc: 'اللعبة الكاملة بكل الجولات', icon: '🏛️' },
  { id: 'quick', title: 'سريعة', desc: 'جولات أقل، متعة أسرع', icon: '⚡' },
  { id: 'custom', title: 'مخصصة', desc: 'انت اللي تحدد القواعد', icon: '🎛️' },
];

export function CreateGame() {
  const navigate = useNavigate();
  const config = useGameStore((s) => s.config);
  const setMode = useGameStore((s) => s.setMode);
  const updateConfig = useGameStore((s) => s.updateConfig);

  return (
    <ScreenContainer
      header={{ title: 'لعبة جديدة' }}
      footer={
        <Button block size="lg" onClick={() => navigate(ROUTES.players)}>
          كمّل
        </Button>
      }
    >
      <div className="space-y-8">
        {/* Room code */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/70 px-4 py-3">
          <span className="text-sm text-muted">كود الغرفة</span>
          <span dir="ltr" className="text-gold-sheen text-xl font-extrabold tracking-[0.3em]">
            {config.roomCode || '—'}
          </span>
        </div>

        {/* Mode selection */}
        <section className="space-y-3">
          <SectionLabel>نوع اللعبة</SectionLabel>
          <div className="grid grid-cols-1 gap-3">
            {MODES.map((mode) => {
              const active = config.mode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setMode(mode.id)}
                  className={cn(
                    'flex items-center gap-4 rounded-2xl border p-4 text-right transition-all',
                    active
                      ? 'border-gold/70 bg-gold/10 shadow-glow'
                      : 'border-border/70 bg-surface/60 hover:border-gold/40',
                  )}
                >
                  <span className="text-3xl">{mode.icon}</span>
                  <span className="flex-1">
                    <span className="block font-extrabold text-content">{mode.title}</span>
                    <span className="block text-sm text-muted">{mode.desc}</span>
                  </span>
                  {active && <Badge tone="gold">مختار</Badge>}
                </button>
              );
            })}
          </div>
        </section>

        {/* Player count */}
        <section className="space-y-3">
          <SectionLabel>عدد اللاعبين</SectionLabel>
          <Stepper
            value={config.maxPlayers}
            min={PLAYER_LIMITS.min}
            max={PLAYER_LIMITS.max}
            onChange={(v) => updateConfig({ maxPlayers: v })}
          />
        </section>

        {/* Rounds */}
        <section className="space-y-3">
          <SectionLabel>عدد الجولات</SectionLabel>
          <Stepper
            value={config.roundsCount}
            min={1}
            max={12}
            onChange={(v) => updateConfig({ roundsCount: v })}
          />
        </section>
      </div>
    </ScreenContainer>
  );
}

/* ------------------------------ helpers ------------------------------ */

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wide text-sand/80">{children}</h3>
      <span className="hr-glyph flex-1" />
    </div>
  );
}

interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}

function Stepper({ value, min, max, onChange }: StepperProps) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/60 p-2">
      <StepButton label="إنقاص" disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </StepButton>
      <span className="text-3xl font-extrabold text-gold tabular-nums">{value}</span>
      <StepButton label="زيادة" disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </StepButton>
    </div>
  );
}

function StepButton({
  children,
  label,
  disabled,
  onClick,
}: {
  children: ReactNode;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface-2 text-2xl font-bold text-content transition-colors hover:bg-gold/20 hover:text-gold disabled:opacity-40 disabled:hover:bg-surface-2 disabled:hover:text-content"
    >
      {children}
    </button>
  );
}
