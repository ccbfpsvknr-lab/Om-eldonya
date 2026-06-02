import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '@/components/layout';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/decor/Logo';
import { useModal } from '@/hooks/useModal';
import { useGameStore } from '@/store';
import { ROUTES } from '@/lib/constants';
import { useState } from 'react';

export function MainMenu() {
  const navigate = useNavigate();
  const { open, close } = useModal();
  const createGame = useGameStore((s) => s.createGame);

  /** يلا بينا — start a brand new game. */
  const handleStart = () => {
    createGame();
    navigate(ROUTES.create);
  };

  /** ادخل على لعبة — join via room code (placeholder UI, no backend yet). */
  const handleJoin = () => {
    open(<JoinGameForm onClose={() => close()} />, { title: 'ادخل على لعبة', size: 'sm' });
  };

  /** قواعد اللعب — show the rules. */
  const handleRules = () => {
    open(<RulesContent />, { title: 'قواعد اللعب', size: 'md' });
  };

  return (
    <ScreenContainer center>
      <div className="flex flex-col items-center gap-12">
        <Logo size="lg" withTagline />

        <div className="w-full space-y-3">
          <Button size="lg" block onClick={handleStart} leadingIcon={<span>🎲</span>}>
            يلا بينا
          </Button>
          <Button size="lg" block variant="secondary" onClick={handleJoin}>
            ادخل على لعبة
          </Button>
          <Button size="lg" block variant="ghost" onClick={handleRules}>
            قواعد اللعب
          </Button>
        </div>

        <p className="text-xs text-muted">نسخة تجريبية • أم الدنيا</p>
      </div>
    </ScreenContainer>
  );
}

/* ----------------------------- Join form ----------------------------- */

function JoinGameForm({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState('');
  return (
    <div className="space-y-5">
      <Input
        name="roomCode"
        label="كود الغرفة"
        placeholder="مثال: MASR4"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        maxLength={6}
        autoFocus
        dir="ltr"
        className="text-center tracking-[0.4em]"
      />
      <p className="text-xs text-muted">
        الانضمام للغرف هيشتغل بعد ما نوصّل اللعب بالسيرفر. دلوقتي ده شكل الشاشة بس.
      </p>
      <Button block disabled={code.length < 4} onClick={onClose}>
        انضم
      </Button>
    </div>
  );
}

/* ------------------------------ Rules -------------------------------- */

const RULES = [
  'اجمع من ٢ لـ ٨ لاعبين على نفس الموبايل أو في نفس الأوضة.',
  'كل لاعب بياخد دور بالترتيب اللي بيظهر في شاشة القرعة.',
  'اللعبة بتمشي على جولات، وكل جولة ليها نقاط.',
  'اللي يجمع أعلى نقاط في الآخر يكسب ويبقى «أم الدنيا».',
];

function RulesContent() {
  return (
    <ol className="space-y-3">
      {RULES.map((rule, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
            {i + 1}
          </span>
          <p className="pt-0.5 leading-relaxed text-content/90">{rule}</p>
        </li>
      ))}
    </ol>
  );
}
