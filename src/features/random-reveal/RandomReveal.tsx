import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { usePlayersStore, useGameStore, useMatchStore } from '@/store';
import { ROUTES } from '@/lib/constants';
import { shuffle } from '@/lib/shuffle';

/**
 * The "draw" (القرعة). Randomises the play order from the setup players,
 * then creates the live match via the Stage 2A engine (useMatchStore).
 * Players keep their setup names; the randomness is the turn order + the
 * vehicle each player is assigned by their drawn position.
 */
export function RandomReveal() {
  const navigate = useNavigate();
  const players = usePlayersStore((s) => s.players);
  const mode = useGameStore((s) => s.config.mode);
  const setPhase = useGameStore((s) => s.setPhase);
  const createMatch = useMatchStore((s) => s.createMatch);

  // Shuffle once when the screen mounts (stable across re-renders).
  const order = useMemo(() => shuffle(players), [players]);

  const proceed = () => {
    // Create the match from the randomised order, carrying the selected
    // mode and the players' assigned (drawn) order + names.
    createMatch({ mode, players: order });
    setPhase('playing');
    navigate(ROUTES.board);
  };

  return (
    <ScreenContainer
      header={{ title: 'القرعة' }}
      footer={
        <Button block size="lg" disabled={order.length === 0} onClick={proceed}>
          ابدأ الجولة
        </Button>
      }
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-8">
        <Card accent padding="lg" className="w-full animate-pop-in text-center">
          <Badge tone="gold" className="mb-4">
            القرعة اتعملت
          </Badge>
          <div className="mb-4 text-6xl">🎴</div>
          <h3 className="mb-2 text-2xl text-gold-sheen">الترتيب اتحدد!</h3>
          <p className="text-sm leading-relaxed text-muted">
            ده ترتيب اللعب، وكل لاعب خد عربيته. اضغط «ابدأ الجولة» علشان تدخلوا اللوحة.
          </p>
        </Card>

        {order.length > 0 && (
          <div className="w-full space-y-2">
            <p className="text-center text-xs text-muted">ترتيب اللعب</p>
            <ul className="space-y-2">
              {order.map((p, i) => (
                <li
                  key={p.id}
                  className="flex animate-scale-in items-center gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-ink"
                    style={{ backgroundColor: p.color }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate font-bold text-content">{p.name}</span>
                  <span className="text-2xl" aria-hidden>
                    {p.vehicle}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}
