import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge } from '@/components/ui';
import { useModal } from '@/hooks/useModal';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import {
  useGameStore, usePlayersStore, useMatchStore, useModalStore,
  selectGame, selectCurrentPlayer, SALFA_AMOUNT,
} from '@/store';
import { canUpgrade, getUpgradeCost, MAX_UPGRADE_LEVEL } from '@/game/engine/upgradeEngine';
import { isRegionComplete } from '@/game/engine/economyEngine';
import { getCard } from '@/game/data/chanceCards';
import type { City, Player } from '@/game/types';

// ─── BOARD GEOMETRY ───────────────────────────────────────────────────────────
function getTileGridPos(index: number, boardLen: number) {
  const side = boardLen / 4;
  const size = side + 1;
  if (index < side)        return { col: size - index,           row: size };
  if (index < 2 * side)    return { col: 1,                     row: size - (index - side) };
  if (index < 3 * side)    return { col: index - 2 * side + 1,   row: 1 };
  return                          { col: size,                   row: index - 3 * side + 1 };
}

function inwardEdge(index: number, boardLen: number): 'top' | 'right' | 'bottom' | 'left' | '' {
  const side = boardLen / 4;
  if (index % side === 0) return '';
  if (index < side)        return 'top';
  if (index < 2 * side)    return 'right';
  if (index < 3 * side)    return 'bottom';
  return 'left';
}

// ─── VISUAL CONSTANTS ────────────────────────────────────────────────────────
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

const REGION_COLOR: Record<string, string> = {
  q1:'#D4A020', q2:'#2E8B7E', q3:'#C05030', q4:'#7C3AED', q5:'#C0392B',
  a: '#D4A020', b: '#2E8B7E', c: '#C05030', d: '#7C3AED', e: '#27AE60', f: '#C0392B',
  f1:'#D4A020', f2:'#2E8B7E', f3:'#1E6FA0', f4:'#27AE60',
  f5:'#7C3AED', f6:'#C0392B', f7:'#8B4513', f8:'#D4681C', f9:'#E91E8C',
};

const CITY_EMOJI: Record<string, string> = {
  'الإسكندرية':'🏰','مرسى مطروح':'🏖️','القاهرة':'🗼','الجيزة':'🔺',
  'الأقصر':'⛩️','أسوان':'💧','الغردقة':'🌊','شرم الشيخ':'🐠',
  'طنطا':'🕌','المنصورة':'🏛️','الزقازيق':'🌿','بنها':'🌾',
  'الفيوم':'🦢','بني سويف':'🐫','المنيا':'🏺','أسيوط':'🦅',
  'سوهاج':'🕍','قنا':'⛏️','دمياط':'🚢','بورسعيد':'⚓',
  'الإسماعيلية':'🌸','السويس':'🌊','كفر الشيخ':'🐟','دمنهور':'🌾',
  'العريش':'🏜️','سيوة':'🌴',
};

const CORNER_STYLE: Record<string, { bg: string; icon: string; label: string }> = {
  ramses: { bg: 'linear-gradient(135deg, #2a1a02, #1a1002)', icon: '🏁', label: 'ابدأ' },
  jail:   { bg: 'linear-gradient(135deg, #1a0a0a, #0e0604)', icon: '🔒', label: 'السجن' },
  rest:   { bg: 'linear-gradient(135deg, #041a10, #020e08)', icon: '🌴', label: 'استراحة' },
  police: { bg: 'linear-gradient(135deg, #1a0404, #0e0202)', icon: '🚔', label: 'روح السجن' },
};

const SPECIAL_STYLE: Record<string, { border: string; icon: string }> = {
  chance:  { border: 'rgba(224,180,60,0.5)',  icon: '🎴' },
  news:    { border: 'rgba(42,157,143,0.5)',  icon: '📰' },
  tax:     { border: 'rgba(199,91,57,0.5)',   icon: '💸' },
  project: { border: 'rgba(42,157,143,0.4)',  icon: '🏗️' },
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function GameBoard() {
  const navigate   = useNavigate();
  const { confirm, open, close } = useModal();

  const game             = useMatchStore(selectGame);
  const cp               = useMatchStore(selectCurrentPlayer);
  const rollDice         = useMatchStore((s) => s.rollDice);
  const movePlayer       = useMatchStore((s) => s.moveCurrentPlayer);
  const endTurn          = useMatchStore((s) => s.endTurn);
  const buyCity          = useMatchStore((s) => s.buyCity);
  const payRent          = useMatchStore((s) => s.payRent);
  const upgradeCity      = useMatchStore((s) => s.upgradeCity);
  const goToJail         = useMatchStore((s) => s.goToJail);
  const resolveJailTurn  = useMatchStore((s) => s.resolveJailTurn);
  const decrementJailTurns = useMatchStore((s) => s.decrementJailTurns);
  const payTax           = useMatchStore((s) => s.payTax);
  const drawChance       = useMatchStore((s) => s.drawAndApplyChanceCard);
  const executeTrade     = useMatchStore((s) => s.executeTrade);
  const triggerNews      = useMatchStore((s) => s.triggerNewsEvent);
  const pendingNews      = useMatchStore((s) => s.pendingNewsEvent);
  const bankruptPlayer   = useMatchStore((s) => s.bankruptPlayer);
  const sellCity         = useMatchStore((s) => s.sellCity);
  const takeSalfa        = useMatchStore((s) => s.takeSalfa);
  const markSkipTurn     = useMatchStore((s) => s.markSkipTurn);
  const decrementSkipTurns = useMatchStore((s) => s.decrementSkipTurns);
  const resetMatch       = useMatchStore((s) => s.resetMatch);
  const resetGame        = useGameStore((s) => s.resetGame);
  const resetPlayers     = usePlayersStore((s) => s.resetPlayers);
  const openModalCount   = useModalStore((s) => s.stack.length);

  const [diceRolling, setDiceRolling]   = useState(false);
  const [diceDisplay, setDiceDisplay]   = useState<number | null>(null);
  const [animPos, setAnimPos]           = useState<number | null>(null);
  const [smokePos, setSmokePos]         = useState<number | null>(null);
  const [isMoving, setIsMoving]         = useState(false);
  const [lastRoll, setLastRoll]         = useState<number | null>(null);
  const [rollAgainPending, setRollAgainPending] = useState(false);
  const diceRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const smokeClearRef= useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (diceRef.current)      clearInterval(diceRef.current);
    if (moveRef.current)      clearInterval(moveRef.current);
    if (smokeClearRef.current) clearTimeout(smokeClearRef.current);
  }, []);

  // ── News events ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!pendingNews) return;
    triggerNews();
    const ev = pendingNews;
    const nid = open(
      <div className="space-y-3 text-center">
        <div className="text-5xl">📰</div>
        <Badge tone="clay">أخبار البلد</Badge>
        <h3 className="text-xl text-gold-sheen">{ev.title}</h3>
        <p className="text-sm text-content leading-relaxed">{ev.text}</p>
        {ev.cash !== 0 && <p className={cn('font-extrabold', ev.cash > 0 ? 'text-gold' : 'text-clay')}>{ev.cash > 0?'+':''}{ev.cash} جنيه لكل لاعب</p>}
        <Button block onClick={() => close(nid)}>فهمت</Button>
      </div>,
      { size: 'sm', hideClose: true }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNews]);

  // ── Winner navigation ─────────────────────────────────────────────────────
  useEffect(() => {
    if (game?.phase === 'finished') {
      const t = setTimeout(() => navigate(ROUTES.winner), 900);
      return () => clearTimeout(t);
    }
  }, [game?.phase, navigate]);

  // ── Auto end turn — FAST mode only ───────────────────────────────────────
  // Guard: wait for modals to close AND animation to finish AND no pending roll-again
  useEffect(() => {
    if (game?.phase !== 'turn-end' || game.mode !== 'quick') return;
    if (openModalCount > 0 || rollAgainPending || isMoving) return;
    const t = setTimeout(() => endTurn(), 700);
    return () => clearTimeout(t);
  }, [game?.phase, game?.mode, openModalCount, rollAgainPending, isMoving, endTurn]);

  // ── Skip-next-turn effect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!game || game.phase !== 'rolling') return;
    const current = game.players[game.currentPlayerIndex];
    if (!current || current.skipTurns <= 0) return;
    decrementSkipTurns(current.id);
    showToast(
      <div className="text-center">
        <div className="text-4xl mb-2">💻</div>
        <h3 className="text-xl text-gold-sheen">السيستم واقع!</h3>
        <p className="text-sm text-muted mt-1">دور {current.name} فات!</p>
      </div>,
      1800
    );
    const t = setTimeout(() => endTurn(), 1900);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.currentPlayerIndex, game?.phase]);

  const handleQuit = async () => {
    const ok = await confirm({ title: 'إنهاء اللعبة', message: 'لو خرجت دلوقتي، اللعبة راحت مع الريح. متأكد؟', confirmLabel: 'اخرج', danger: true });
    if (ok) { resetMatch(); resetGame(); resetPlayers(); navigate(ROUTES.home); }
  };

  if (!game || !cp) return (
    <div className="flex h-[100dvh] items-center justify-center bg-bg">
      <Button onClick={() => navigate(ROUTES.home)}>الرئيسية</Button>
    </div>
  );

  const isFast   = game.mode === 'quick';
  const phase    = game.phase;
  const isInJail = !isFast && cp.jailTurns > 0; // Fast mode never has jail state
  const canRoll  = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !isInJail && !diceRolling && !isMoving;
  const canEnd   = phase === 'turn-end' && !isMoving && !isFast;
  const myCities = Object.values(game.cities).filter((c) => c.ownerId === cp.id);
  const canUpgradeAny = !isFast && myCities.some((c) => canUpgrade(game, c, cp.id));
  const canTrade = !isFast && !game.tradeUsedThisTurn && game.players.filter((p) => p.isActive).length > 1;

  // Board visuals
  const cpVisualPos = animPos !== null ? animPos : cp.position;
  const occupantsByTile = new Map<number, Player[]>();
  game.players.forEach((p) => {
    if (!p.isActive) return;
    const pos = p.id === cp.id && animPos !== null ? animPos : p.position;
    const arr = occupantsByTile.get(pos) ?? [];
    arr.push(p);
    occupantsByTile.set(pos, arr);
  });
  const colorByPlayer = new Map(game.players.map((p) => [p.id, p.color]));
  const ownerColorByTile = new Map<number, string>();
  Object.values(game.cities).forEach((c) => {
    if (c.ownerId) { const col = colorByPlayer.get(c.ownerId); if (col) ownerColorByTile.set(c.tileIndex, col); }
  });
  const sortedPlayers = [...game.players].sort((a, b) => b.cash - a.cash);

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((content: ReactNode, ms = 2400) => {
    const id = open(content, { hideClose: true, size: 'sm', dismissable: true });
    setTimeout(() => close(id), ms);
  }, [open, close]);

  // ── Insolvency ────────────────────────────────────────────────────────────
  const checkInsolvency = useCallback((playerId: string) => {
    const g = useMatchStore.getState().game;
    const p = g?.players.find((pl) => pl.id === playerId);
    if (!p || p.cash >= 0) return;

    if (g?.mode === 'quick') {
      // Fast mode: instant bankruptcy, no recovery, no salfa, no selling
      bankruptPlayer(playerId);
      showToast(
        <div className="text-center">
          <div className="text-5xl mb-2">💀</div>
          <h3 className="text-2xl font-extrabold text-danger">{p.name} أفلس!</h3>
          <p className="text-sm text-muted mt-1">خرج من اللعبة</p>
        </div>,
        2200
      );
      setTimeout(() => endTurn(), 2300);
      return;
    }

    // Classic / Full: show recovery modal
    const bid = open(
      <BankruptcyModal playerId={playerId} onClose={() => close(bid)} />,
      { title: 'مفيش فلوس! 😬', size: 'md', dismissable: false, hideClose: true }
    );
  }, [open, close, bankruptPlayer, showToast, endTurn]);

  // ── Landing ───────────────────────────────────────────────────────────────
  const resolveLanding = useCallback(() => {
    const g = useMatchStore.getState().game;
    if (!g) return;
    const player = g.players[g.currentPlayerIndex];
    if (!player) return;
    const tile = g.board[player.position];
    if (!tile) return;

    if (tile.type === 'city' && tile.cityId) {
      const city = g.cities[tile.cityId];
      if (!city) return;
      if (city.ownerId === null) {
        const mid = open(
          <BuyCityModal city={city} canAfford={player.cash >= city.price}
            onBuy={() => {
              buyCity(city.id); close(mid);
              const after = useMatchStore.getState().game;
              if (after && isRegionComplete(after, city.region, player.id)) {
                showToast(<div className="text-center"><div className="text-4xl mb-2">🔥</div><h3 className="text-xl text-gold-sheen">يا سلام! كملت المنطقة 🏆</h3><p className="text-sm text-content mt-1">الإيجار بقى الضعف دلوقتي</p></div>);
              }
            }}
            onPass={() => close(mid)}
          />,
          { size: 'sm', hideClose: true, dismissable: false }
        );
      } else if (city.ownerId !== player.id) {
        const tx = payRent(city.id);
        if (tx) {
          const owner = g.players.find((p) => p.id === tx.toPlayerId);
          showToast(
            <div className="text-center">
              <div className="text-4xl mb-2">💸</div>
              <h3 className="text-xl text-gold-sheen">خلصوا فلوسك!</h3>
              <p className="mt-2 text-sm text-content">عشان أرض {owner?.name} في {city.name}</p>
              <p className="mt-1 text-lg font-extrabold text-clay">−{tx.amount.toLocaleString('en-US')} جنيه</p>
            </div>
          );
          checkInsolvency(player.id);
        }
      }

    } else if (tile.type === 'police') {
      if (isFast) {
        // Fast mode: immediate fine, no jail, no decisions
        const fine = payTax(); // 500
        showToast(
          <div className="text-center">
            <div className="text-4xl mb-2">🚔</div>
            <h3 className="text-xl text-gold-sheen">البوليس شافك!</h3>
            <p className="text-sm text-content mt-1">ادفع {fine.toLocaleString('en-US')} غرامة وامشي</p>
          </div>,
          1800
        );
        checkInsolvency(player.id);
      } else {
        // Classic / Full: go to jail
        goToJail(player.id);
        const pid = open(
          <div className="text-center space-y-5">
            <div className="text-8xl">🚔</div>
            <h2 className="text-4xl font-extrabold text-gold-sheen">كلابوووش!</h2>
            <p className="text-muted">السجن في الانتظار 🔒</p>
            <Button block size="lg" onClick={() => close(pid)}>حاضر يا باشا 🫡</Button>
          </div>,
          { size: 'sm', hideClose: true, dismissable: false }
        );
      }

    } else if (tile.type === 'chance') {
      const result = drawChance();
      if (!result) return;
      const card = getCard(result.cardId);
      const cid = open(
        <div className="space-y-4 text-center">
          <div className="text-5xl">🎴</div>
          <Badge tone="gold">نصيبك هيصيبك</Badge>
          <h3 className="text-2xl text-gold-sheen">{card.title}</h3>
          <p className="text-sm leading-relaxed text-content whitespace-pre-line">{card.text}</p>
          {card.type === 'money' && card.amount && (
            <p className={cn('text-xl font-extrabold', card.amount > 0 ? 'text-gold' : 'text-clay')}>
              {card.amount > 0 ? '+' : ''}{card.amount.toLocaleString('en-US')} جنيه
            </p>
          )}
          <Button block size="lg" onClick={() => {
            close(cid);
            if (card.skipNextTurn) {
              markSkipTurn(player.id); return;
            }
            if (card.type === 'move') {
              const cur = useMatchStore.getState().game?.players[game.currentPlayerIndex];
              if (!cur) return;
              const steps = card.toTile !== undefined
                ? ((card.toTile - cur.position + game.board.length) % game.board.length)
                : (card.spaces ?? 0);
              if (steps !== 0) { movePlayer(steps); setTimeout(resolveLanding, 80); }
            } else if (card.type === 'police') {
              if (!isFast) goToJail(player.id); // police card never in fast deck anyway
            } else if (card.type === 'bonus' && card.rollAgain) {
              setRollAgainPending(true);
            } else if ((card.type === 'money' || card.type === 'govt') && card.amount && card.amount < 0) {
              checkInsolvency(player.id);
            }
          }}>
            {card.type === 'bonus' && card.rollAgain ? 'ارمي تاني 🎲' : 'خلاص'}
          </Button>
        </div>,
        { size: 'sm', dismissable: false, hideClose: true }
      );

    } else if (tile.type === 'tax') {
      const paid = payTax();
      showToast(
        <div className="text-center">
          <div className="text-4xl mb-2">💸</div>
          <h3 className="text-xl text-gold-sheen">الحكومة طولت إيدها!</h3>
          <p className="text-sm text-muted mt-1">دفعت للدولة</p>
          <p className="font-extrabold text-clay">−{paid.toLocaleString('en-US')} جنيه</p>
        </div>
      );
      checkInsolvency(player.id);
    }
  }, [open, close, buyCity, payRent, payTax, goToJail, drawChance, movePlayer,
      showToast, checkInsolvency, endTurn, markSkipTurn, isFast, game]);

  // ── Movement animation ────────────────────────────────────────────────────
  const animateAndMove = useCallback((from: number, steps: number, boardLen: number, salary: number) => {
    if (steps <= 0) { resolveLanding(); return; }
    setIsMoving(true);
    setAnimPos(from);
    let step = 0;
    let lastPos = from;
    moveRef.current = setInterval(() => {
      step++;
      const nextPos = (from + step) % boardLen;
      setSmokePos(lastPos);
      if (smokeClearRef.current) clearTimeout(smokeClearRef.current);
      smokeClearRef.current = setTimeout(() => setSmokePos(null), 360);
      lastPos = nextPos;
      setAnimPos(nextPos);
      if (step >= steps) {
        clearInterval(moveRef.current!);
        setTimeout(() => {
          setAnimPos(null); setSmokePos(null);
          // FIX: resolve landing BEFORE clearing isMoving so auto-end
          // sees the open modal (openModalCount > 0) before firing
          if (salary > 0) showToast(
            <div className="text-center">
              <div className="text-5xl mb-2">💰</div>
              <h3 className="text-2xl text-gold-sheen">القبض نزل 💰</h3>
              <p className="text-xl font-extrabold text-gold mt-1">+{salary.toLocaleString('en-US')} جنيه</p>
            </div>
          );
          resolveLanding();   // open modal first (if any)
          setIsMoving(false); // then allow auto-end guard to pass
        }, 150);
      }
    }, 200);
  }, [resolveLanding, showToast]);

  // ── Unified roll handler ──────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (diceRolling || isMoving || (!canRoll && !isInJail)) return;
    const g = useMatchStore.getState().game;
    const before = g?.players[g.currentPlayerIndex];
    if (!before) return;

    setDiceRolling(true);
    setRollAgainPending(false);
    const storeValue = isInJail ? null : rollDice();
    const rollValue  = storeValue ?? Math.ceil(Math.random() * 6);

    diceRef.current = setInterval(() => setDiceDisplay(Math.ceil(Math.random() * 6)), 80);
    setTimeout(() => {
      clearInterval(diceRef.current!);
      setDiceDisplay(rollValue);
      setDiceRolling(false);

      setTimeout(() => {
        setLastRoll(rollValue);
        if (isInJail) {
          const fee = resolveJailTurn(rollValue);
          showToast(
            <div className="text-center">
              <div className="text-4xl mb-2">{rollValue === 6 ? '🤙' : '😅'}</div>
              <h3 className="text-xl text-gold-sheen">رميت {rollValue}</h3>
              <p className="text-sm text-content mt-1">
                {rollValue === 6 ? `اكسبت! ادفع ${fee.toLocaleString('en-US')} بس 🤙` : `ادفع ${fee.toLocaleString('en-US')} وامشي`}
              </p>
              <p className="text-sm font-bold text-teal mt-1">يلا طلعت برة 🏃</p>
            </div>,
            2000
          );
          checkInsolvency(before.id);
          movePlayer(rollValue);
          animateAndMove(before.position, rollValue, g!.board.length, 0);
        } else {
          const cashBefore = before.cash;
          movePlayer(rollValue);
          const after = useMatchStore.getState().game?.players[g!.currentPlayerIndex];
          const salary = Math.max(0, (after?.cash ?? cashBefore) - cashBefore);
          animateAndMove(before.position, rollValue, g!.board.length, salary);
        }
      }, 400);
    }, 850);
  }, [diceRolling, isMoving, canRoll, isInJail, rollDice, movePlayer,
      resolveJailTurn, animateAndMove, showToast, checkInsolvency]);

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    const uid = open(
      <UpgradeModal cities={myCities} playerId={cp.id} onUpgrade={(id) => upgradeCity(id)} onClose={() => close(uid)} />,
      { title: '🏗️ رقّي مدنك', size: 'md' }
    );
  };

  // ── Trade modal ───────────────────────────────────────────────────────────
  const openTradeModal = () => {
    const partners = game.players.filter((p) => p.isActive && p.id !== cp.id);
    const tid = open(
      <TradeModal currentPlayerId={cp.id} partners={partners}
        onTrade={(toId, oC, oX, rC, rX) => {
          executeTrade(cp.id, toId, oC, oX, rC, rX);
          close(tid);
          showToast(<div className="text-center"><div className="text-4xl mb-2">🤝</div><h3 className="text-xl text-gold-sheen">الصفقة اتمت!</h3></div>, 1600);
        }}
        onClose={() => close(tid)}
      />,
      { title: '🤝 التداول', size: 'lg' }
    );
  };

  const handleEndTurn = () => {
    setLastRoll(null); setRollAgainPending(false);
    endTurn();
  };

  // ── Board dimensions ──────────────────────────────────────────────────────
  const tilesPerSide = game.board.length / 4;
  const gridSize     = tilesPerSide + 1;

  // Dice button label
  const diceLabel = diceRolling
    ? (diceDisplay ? String(diceDisplay) : '?')
    : lastRoll !== null
      ? `🎲 ${lastRoll}`
      : isInJail
        ? '🎲 حاول تطلع!'
        : '🎲 هات الزهر!';

  const canDiceRoll = canRoll || isInJail;

  // ── Board render ──────────────────────────────────────────────────────────

  return (
    <div dir="rtl" className="flex h-[100dvh] w-full items-center justify-center overflow-hidden"
      style={{ background: '#080603' }}>
      <div style={{ width: 'min(100dvw, 100dvh)', height: 'min(100dvw, 100dvh)', padding: '3px' }}>
        <div className="relative w-full h-full rounded-xl overflow-hidden"
          style={{
            background: '#120d06',
            boxShadow: '0 0 0 2px rgba(224,180,60,0.8), 0 0 0 5px #080603, 0 0 50px rgba(224,180,60,0.25)',
            padding: '2px',
          }}>
          {/* Board grid — explicit LTR so left/right directions are physical */}
          <div className="w-full h-full" dir="ltr"
            style={{
              display: 'grid',
              gridTemplateColumns: `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`,
              gridTemplateRows: `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`,
              gap: '1px',
              background: '#0a0704',
            }}>

            {/* ── Perimeter tiles ── */}
            {game.board.map((tile) => {
              const { col, row } = getTileGridPos(tile.index, game.board.length);
              const edge         = inwardEdge(tile.index, game.board.length);
              const isCorner     = edge === '';
              const isCurrent    = tile.index === cpVisualPos;
              const occupants    = occupantsByTile.get(tile.index) ?? [];
              const ownerColor   = ownerColorByTile.get(tile.index);
              const upgradeLevel = tile.cityId ? (game.cities[tile.cityId]?.level ?? 0) : 0;
              const hasSmoke     = tile.index === smokePos && isMoving;
              const regionColor  = tile.cityId ? REGION_COLOR[game.cities[tile.cityId]?.region ?? ''] : undefined;
              const landmark     = tile.cityId ? (CITY_EMOJI[tile.name] ?? '🏙️') : undefined;
              const city         = tile.cityId ? game.cities[tile.cityId] : undefined;
              const cpJailedHere = tile.type === 'jail' && cp.position === tile.index && cp.jailTurns > 0 && !animPos;
              const isHoriz      = edge === 'left' || edge === 'right';
              const roadFirst    = edge === 'top' || edge === 'left';
              const cornerInfo   = isCorner ? CORNER_STYLE[tile.type] : null;
              const specialInfo  = SPECIAL_STYLE[tile.type];

              // Layout direction + road-strip positioning
              const flexDir = isHoriz ? 'row' : 'column';
              const ROAD_PCT = isCorner ? 0 : (isHoriz ? 28 : 30);

              const tileBg = isCorner
                ? (cornerInfo?.bg ?? '#120d06')
                : tile.type === 'city'
                  ? regionColor ? `linear-gradient(135deg, ${regionColor}22, ${regionColor}0e)` : '#1a1208'
                  : '#141008';

              const tileBorder = isCurrent
                ? `1.5px solid ${regionColor ?? '#E0B43C'}`
                : tile.type === 'city' && regionColor
                  ? `1px solid ${regionColor}30`
                  : `1px solid #1c1508`;

              return (
                <div key={tile.index}
                  className={cn('relative overflow-hidden', isCurrent && 'animate-tile-ping z-10')}
                  style={{ gridColumn: col, gridRow: row, background: tileBg, border: tileBorder,
                    boxShadow: isCurrent ? `0 0 10px ${regionColor ?? '#E0B43C'}60` : 'none',
                    display: 'flex', flexDirection: flexDir }}>

                  {/* Road strip — FIRST (top or left) */}
                  {!isCorner && roadFirst && (
                    <div style={{
                      flexShrink: 0,
                      background: '#050402',
                      ...(isHoriz ? { width: `${ROAD_PCT}%`, height: '100%' } : { width: '100%', height: `${ROAD_PCT}%` }),
                      position: 'relative',
                    }}>
                      {/* Lane dashes */}
                      <div style={{
                        position: 'absolute',
                        ...(isHoriz
                          ? { top: '50%', left: 2, right: 2, transform: 'translateY(-50%)',
                              height: '1px', background: `repeating-linear-gradient(to bottom, rgba(255,220,80,0.3) 0px, rgba(255,220,80,0.3) 3px, transparent 3px, transparent 6px)` }
                          : { left: '50%', top: 2, bottom: 2, transform: 'translateX(-50%)',
                              width: '1px', background: `repeating-linear-gradient(to right, rgba(255,220,80,0.3) 0px, rgba(255,220,80,0.3) 3px, transparent 3px, transparent 6px)` }),
                      }}/>
                      {/* Owner flag */}
                      {ownerColor && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          borderBottom: isHoriz ? 'none' : `2px solid ${ownerColor}`,
                          borderRight: isHoriz ? `2px solid ${ownerColor}` : 'none',
                          opacity: 0.8,
                        }}/>
                      )}
                    </div>
                  )}

                  {/* Tile content */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: isCorner ? 'center' : 'space-between',
                    padding: '1px', overflow: 'hidden', minWidth: 0 }}>

                    {isCorner ? (
                      <>
                        <div style={{ fontSize: tilesPerSide <= 4 ? '18px' : tilesPerSide <= 6 ? '14px' : '11px', lineHeight: 1,
                          filter: cpJailedHere ? 'none' : `drop-shadow(0 0 4px ${cornerInfo?.bg ?? '#E0B43C'})` }}>
                          {cpJailedHere ? '🔒' : cornerInfo?.icon ?? '👑'}
                        </div>
                        <div style={{ fontSize: tilesPerSide <= 4 ? '7px' : '5.5px', color: '#EADBB7',
                          fontFamily: "'Cairo'", fontWeight: 700, textAlign: 'center', lineHeight: 1.1, direction: 'rtl' }}>
                          {cpJailedHere ? 'محبوس' : cornerInfo?.label ?? tile.name}
                        </div>
                      </>
                    ) : tile.type === 'city' ? (
                      <>
                        {/* Landmark emoji */}
                        <div style={{ fontSize: tilesPerSide <= 4 ? '14px' : tilesPerSide <= 6 ? '11px' : '9px', lineHeight: 1 }}>
                          {landmark}
                        </div>
                        {/* City name */}
                        <div style={{ fontSize: tilesPerSide <= 4 ? '6.5px' : '5.5px', color: '#EADBB7',
                          fontFamily: "'Cairo'", fontWeight: 700, textAlign: 'center', lineHeight: 1, direction: 'rtl',
                          overflow: 'hidden', maxWidth: '100%' }}>
                          {tile.name}
                        </div>
                        {/* Price + rent OR upgrade stars */}
                        {upgradeLevel > 0 ? (
                          <div style={{ fontSize: '5px', color: '#E0B43C', lineHeight: 1 }}>
                            {'★'.repeat(upgradeLevel)}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                            <span style={{ fontSize: '4.5px', color: '#D4A020' }}>
                              🪙{city?.price ? (city.price >= 1000 ? `${(city.price/1000).toFixed(city.price%1000===0?0:1)}k` : city.price) : ''}
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: tilesPerSide <= 4 ? '13px' : '10px', lineHeight: 1,
                          filter: `drop-shadow(0 0 4px ${specialInfo?.border ?? 'rgba(224,180,60,0.4)'})` }}>
                          {specialInfo?.icon ?? '□'}
                        </div>
                        <div style={{ fontSize: '5px', color: '#9AA6BC', textAlign: 'center', direction: 'rtl', lineHeight: 1 }}>
                          {tile.name}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Road strip — LAST (bottom or right) */}
                  {!isCorner && !roadFirst && (
                    <div style={{
                      flexShrink: 0,
                      background: '#050402',
                      ...(isHoriz ? { width: `${ROAD_PCT}%`, height: '100%' } : { width: '100%', height: `${ROAD_PCT}%` }),
                      position: 'relative',
                    }}>
                      <div style={{
                        position: 'absolute',
                        ...(isHoriz
                          ? { top: '50%', left: 2, right: 2, transform: 'translateY(-50%)',
                              height: '1px', background: 'repeating-linear-gradient(to bottom, rgba(255,220,80,0.3) 0px, rgba(255,220,80,0.3) 3px, transparent 3px, transparent 6px)' }
                          : { left: '50%', top: 2, bottom: 2, transform: 'translateX(-50%)',
                              width: '1px', background: 'repeating-linear-gradient(to right, rgba(255,220,80,0.3) 0px, rgba(255,220,80,0.3) 3px, transparent 3px, transparent 6px)' }),
                      }}/>
                      {ownerColor && (
                        <div style={{
                          position: 'absolute', inset: 0,
                          borderTop: isHoriz ? 'none' : `2px solid ${ownerColor}`,
                          borderLeft: isHoriz ? `2px solid ${ownerColor}` : 'none',
                          opacity: 0.8,
                        }}/>
                      )}
                    </div>
                  )}

                  {/* Upgrade dots overlay */}
                  {upgradeLevel > 0 && (
                    <div style={{ position: 'absolute', top: 1, left: 1, display: 'flex', gap: '1px', zIndex: 8 }}>
                      {Array.from({ length: upgradeLevel }).map((_, i) => (
                        <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#E0B43C' }}/>
                      ))}
                    </div>
                  )}

                  {/* Tile index */}
                  <div style={{ position: 'absolute', top: 0, right: 1, fontSize: '4px', color: 'rgba(154,166,188,0.35)', fontFamily: 'monospace', lineHeight: 1, zIndex: 5 }}>
                    {tile.index}
                  </div>

                  {/* Smoke trail */}
                  {hasSmoke && (
                    <div className="animate-smoke-out" style={{ position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '13px', pointerEvents: 'none', zIndex: 25 }}>
                      💨
                    </div>
                  )}

                  {/* Vehicles */}
                  {occupants.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', zIndex: 20, pointerEvents: 'none' }}>
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {occupants.map((o) => (
                          <span key={o.id}
                            className={cn(isCurrent && o.id === cp.id ? 'animate-vehicle-land' : '')}
                            style={{ fontSize: isCurrent && o.id === cp.id ? '13px' : '11px', lineHeight: 1,
                              filter: o.id === cp.id ? 'drop-shadow(0 0 4px rgba(224,180,60,0.8))' : 'none' }}>
                            {o.vehicle}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* ── CENTER AREA ── */}
            <div style={{ gridColumn: `2/${gridSize}`, gridRow: `2/${gridSize}`, position: 'relative', overflow: 'hidden' }}>
              {/* Mini Egyptian landscape background */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
                <defs>
                  <linearGradient id="csky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#040810"/>
                    <stop offset="60%" stopColor="#0d1a30"/>
                    <stop offset="80%" stopColor="#4a2008"/>
                    <stop offset="100%" stopColor="#8a3c10"/>
                  </linearGradient>
                  <linearGradient id="cground" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2a1a06"/>
                    <stop offset="100%" stopColor="#0e0a04"/>
                  </linearGradient>
                </defs>
                <rect width="100" height="100" fill="url(#csky)"/>
                <polygon points="72,50 88,72 56,72" fill="#c47018" opacity="0.5"/>
                <polygon points="80,56 92,72 68,72" fill="#a86012" opacity="0.4"/>
                <polygon points="30,58 44,72 16,72" fill="#b86a15" opacity="0.4"/>
                <path d="M0,72 Q50,66 100,72 L100,100 L0,100 Z" fill="url(#cground)"/>
                <path d="M0,76 Q50,70 100,76" stroke="rgba(42,157,143,0.3)" strokeWidth="3" fill="none"/>
                <radialGradient id="cglow" cx="50%" cy="80%" r="30%">
                  <stop offset="0%" stopColor="#e08020" stopOpacity="0.4"/>
                  <stop offset="100%" stopColor="#e08020" stopOpacity="0"/>
                </radialGradient>
                <ellipse cx="50" cy="80" rx="40" ry="15" fill="url(#cglow)"/>
              </svg>

              {/* Dark overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,2,0.7)' }}/>

              {/* Controls */}
              <div style={{ position: 'relative', zIndex: 5, height: '100%', display: 'flex', flexDirection: 'column', padding: '3px', gap: '2px', direction: 'rtl' }}>

                {/* Logo + header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <h2 style={{ fontFamily: "'Rakkas', serif", fontSize: tilesPerSide <= 4 ? '11px' : tilesPerSide <= 6 ? '10px' : '9px',
                    background: 'linear-gradient(180deg, #F4CE5E, #E0B43C)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    lineHeight: 1, filter: 'drop-shadow(0 0 4px rgba(224,180,60,0.4))' }}>
                    أم الدنيا
                  </h2>
                  <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
                    {game.activeNewsEvent && <span style={{ fontSize: '8px', background: 'rgba(199,91,57,0.3)', borderRadius: '4px', padding: '0 3px', color: '#C75B39' }}>📰</span>}
                    <span style={{ fontSize: '7px', background: 'rgba(42,157,143,0.2)', borderRadius: '4px', padding: '0 3px', color: '#2A9D8F' }}>ج{game.round}</span>
                    <button onClick={handleQuit} style={{ fontSize: '7px', color: 'rgba(154,166,188,0.5)', cursor: 'pointer', background: 'none', border: 'none' }}>✕</button>
                  </div>
                </div>

                {/* ── Current player box ── */}
                <div style={{ borderRadius: '6px', border: '1px solid rgba(224,180,60,0.3)',
                  background: 'rgba(22,15,4,0.85)', padding: '4px', flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <span style={{ fontSize: tilesPerSide <= 4 ? '16px' : '13px' }}>{cp.vehicle}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: tilesPerSide <= 4 ? '8px' : '7px', fontWeight: 700, color: '#EADBB7',
                        fontFamily: "'Cairo'", lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cp.name}
                      </div>
                      <div style={{ fontSize: '6px', color: '#9AA6BC', lineHeight: 1 }}>
                        {isInJail ? '🔒 محبوس' : `خانة ${cpVisualPos}`}
                      </div>
                    </div>
                    <div style={{ fontSize: tilesPerSide <= 4 ? '9px' : '8px', fontWeight: 800,
                      color: cp.cash < 0 ? '#E05656' : '#E0B43C', fontFamily: 'monospace', lineHeight: 1, textAlign: 'left' }}>
                      {cp.cash.toLocaleString('en-US')}
                    </div>
                  </div>

                  {/* My cities */}
                  {myCities.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '3px' }}>
                      {myCities.slice(0, 6).map((c) => {
                        const rc = REGION_COLOR[c.region] ?? '#E0B43C';
                        return (
                          <span key={c.id} style={{ fontSize: '5px', borderRadius: '3px', padding: '0.5px 2px',
                            background: `${rc}20`, border: `1px solid ${rc}40`, color: rc, fontWeight: 700 }}>
                            {CITY_EMOJI[c.name] ?? '🏙️'}
                            {c.level > 0 ? '★'.repeat(c.level) : ''}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Dice button */}
                  <button onClick={handleRoll} disabled={!canDiceRoll || isMoving}
                    style={{
                      marginTop: '4px', width: '100%', borderRadius: '6px', border: 'none',
                      padding: tilesPerSide <= 4 ? '5px 4px' : '4px',
                      fontFamily: "'Cairo', sans-serif",
                      fontSize: tilesPerSide <= 4 ? '10px' : '8px',
                      fontWeight: 800, cursor: canDiceRoll ? 'pointer' : 'default',
                      opacity: (!canDiceRoll || isMoving) ? 0.45 : 1,
                      transition: 'all 0.15s',
                      background: diceRolling
                        ? 'linear-gradient(135deg, #E0B43C, #C49020)'
                        : lastRoll !== null
                          ? 'linear-gradient(135deg, #3a2a08, #2a1e06)'
                          : canDiceRoll
                            ? 'linear-gradient(135deg, #E8C040, #C49020)'
                            : 'rgba(30,22,8,0.8)',
                      color: diceRolling || (canDiceRoll && lastRoll === null) ? '#0E1726' : '#E0B43C',
                      boxShadow: canDiceRoll && !diceRolling && lastRoll === null ? '0 2px 12px rgba(224,180,60,0.4)' : 'none',
                    }}
                    className={diceRolling ? 'animate-dice-shake' : ''}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                      <span style={{ fontSize: diceRolling ? '14px' : '11px' }}>
                        {diceRolling ? (DICE_FACES[diceDisplay ?? 1] || '?') : lastRoll !== null ? DICE_FACES[lastRoll] : '🎲'}
                      </span>
                      <span>{diceLabel}</span>
                    </div>
                  </button>

                  {/* Action buttons */}
                  {(canEnd || canUpgradeAny || canTrade) && (
                    <div style={{ display: 'flex', gap: '2px', marginTop: '3px' }}>
                      {canUpgradeAny && (
                        <button onClick={openUpgradeModal}
                          style={{ flex: 1, borderRadius: '4px', padding: '2px', fontSize: '7px', fontWeight: 700,
                            background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', color: '#2A9D8F', cursor: 'pointer' }}>
                          🏗️ رقّي
                        </button>
                      )}
                      {canTrade && (
                        <button onClick={openTradeModal}
                          style={{ flex: 1, borderRadius: '4px', padding: '2px', fontSize: '7px', fontWeight: 700,
                            background: 'rgba(56,74,110,0.3)', border: '1px solid rgba(56,74,110,0.5)', color: '#9AA6BC', cursor: 'pointer' }}>
                          🤝 تداول
                        </button>
                      )}
                      {canEnd && (
                        <button onClick={handleEndTurn}
                          style={{ flex: 1, borderRadius: '4px', padding: '2px', fontSize: '7px', fontWeight: 700,
                            background: 'rgba(224,180,60,0.15)', border: '1px solid rgba(224,180,60,0.4)', color: '#E0B43C', cursor: 'pointer' }}>
                          يلا ←
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Leaderboard ── */}
                <div style={{ borderRadius: '6px', border: '1px solid rgba(56,74,110,0.3)',
                  background: 'rgba(14,10,4,0.8)', padding: '3px', flex: 1, minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: '6px', color: '#9AA6BC', marginBottom: '2px', fontFamily: "'Cairo'" }}>
                    مين فوق 💰
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {sortedPlayers.map((p, i) => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '2px',
                        borderRadius: '3px', padding: '1px 2px',
                        background: p.id === cp.id ? 'rgba(224,180,60,0.1)' : 'transparent',
                        opacity: p.isActive ? 1 : 0.4 }}>
                        <span style={{ fontSize: '6px', color: '#9AA6BC', width: '8px', textAlign: 'right', fontFamily: 'monospace' }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '10px', lineHeight: 1 }}>{p.vehicle}</span>
                        <span style={{ flex: 1, fontSize: tilesPerSide <= 4 ? '7px' : '6px', color: '#EADBB7',
                          fontFamily: "'Cairo'", fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {p.name}
                        </span>
                        {p.jailTurns > 0 && <span style={{ fontSize: '7px' }}>🔒</span>}
                        <span style={{ fontSize: tilesPerSide <= 4 ? '7px' : '6px', fontWeight: 800,
                          color: p.cash < 0 ? '#E05656' : '#E0B43C', fontFamily: 'monospace', lineHeight: 1 }}>
                          {p.isActive ? p.cash.toLocaleString('en-US') : '💀'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODALS ───────────────────────────────────────────────────────────────────

function BuyCityModal({ city, canAfford, onBuy, onPass }: {
  city: City; canAfford: boolean; onBuy: () => void; onPass: () => void;
}) {
  const regionColor = REGION_COLOR[city.region] ?? '#E0B43C';
  const landmark    = CITY_EMOJI[city.name] ?? '🏙️';
  return (
    <div className="overflow-hidden rounded-2xl" dir="rtl">
      {/* City artwork header */}
      <div style={{
        background: `linear-gradient(135deg, ${regionColor}40, ${regionColor}18, #0e0a04)`,
        padding: '24px 20px',
        textAlign: 'center',
        borderBottom: `1px solid ${regionColor}30`,
      }}>
        <div style={{ fontSize: '52px', lineHeight: 1, marginBottom: '8px',
          filter: `drop-shadow(0 0 16px ${regionColor}80)` }}>{landmark}</div>
        <h3 style={{ fontFamily: "'Rakkas', serif", fontSize: '1.6rem', lineHeight: 1,
          background: `linear-gradient(180deg, #F4CE5E, ${regionColor})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          {city.name}
        </h3>
        <div style={{ marginTop: '4px', fontSize: '10px', color: '#9AA6BC', fontFamily: "'Cairo'" }}>
          منطقة {city.region.toUpperCase()}
        </div>
      </div>
      {/* Stats */}
      <div style={{ display: 'flex', borderBottom: `1px solid rgba(56,74,110,0.3)` }}>
        {[
          { label: 'التمن', value: city.price.toLocaleString('en-US'), color: regionColor, icon: '🪙' },
          { label: 'الإيجار', value: city.baseRent.toLocaleString('en-US'), color: '#C75B39', icon: '🏠' },
          { label: 'لو كملت', value: (city.baseRent * 2).toLocaleString('en-US'), color: '#2A9D8F', icon: '🏠🏠' },
        ].map(({ label, value, color, icon }) => (
          <div key={label} style={{ flex: 1, padding: '12px 8px', textAlign: 'center',
            borderLeft: '1px solid rgba(56,74,110,0.2)' }}>
            <div style={{ fontSize: '13px', marginBottom: '3px' }}>{icon}</div>
            <div style={{ fontSize: '13px', fontWeight: 800, color, fontFamily: 'monospace' }}>{value}</div>
            <div style={{ fontSize: '9px', color: '#9AA6BC', fontFamily: "'Cairo'" }}>{label}</div>
          </div>
        ))}
      </div>
      {/* Buttons */}
      <div style={{ padding: '16px', display: 'flex', gap: '10px' }} dir="rtl">
        {canAfford ? (
          <>
            <button onClick={onPass} style={{ flex: 1, borderRadius: '12px', padding: '12px',
              background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)',
              color: '#9AA6BC', fontFamily: "'Cairo'", fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
              هدي وعدي
            </button>
            <button onClick={onBuy} style={{ flex: 1, borderRadius: '12px', padding: '12px',
              background: `linear-gradient(135deg, ${regionColor}, ${regionColor}AA)`,
              color: '#0E1726', fontFamily: "'Cairo'", fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer',
              boxShadow: `0 4px 16px ${regionColor}50` }}>
              اشتري
            </button>
          </>
        ) : (
          <>
            <div style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>😅</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#E05656', fontFamily: "'Cairo'" }}>
                الجيب فاضي يا نجم
              </div>
              <div style={{ fontSize: '11px', color: '#9AA6BC', fontFamily: "'Cairo'", marginTop: '2px' }}>
                يلا عدّي وسلامتك
              </div>
            </div>
            <button onClick={onPass} style={{ flex: 1, borderRadius: '12px', padding: '12px',
              background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)',
              color: '#9AA6BC', fontFamily: "'Cairo'", fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer' }}>
              هدي وعدي
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function UpgradeModal({ cities, playerId, onUpgrade, onClose }: {
  cities: City[]; playerId: string; onUpgrade: (id: string) => void; onClose: () => void;
}) {
  const game   = useMatchStore(selectGame);
  const player = game?.players.find((p) => p.id === playerId);
  if (!game) return null;
  const upgradeable = cities.filter((c) => canUpgrade(game, game.cities[c.id] ?? c, playerId));
  return (
    <div className="space-y-3" dir="rtl">
      {upgradeable.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">اكسب المنطقة الأول علشان ترقّي</p>
      ) : upgradeable.map((city) => {
        const live  = game.cities[city.id] ?? city;
        const cost  = getUpgradeCost(live);
        const rc    = REGION_COLOR[live.region] ?? '#E0B43C';
        const lm    = CITY_EMOJI[city.name] ?? '🏙️';
        return (
          <div key={city.id} style={{ borderRadius: '12px', overflow: 'hidden',
            background: `linear-gradient(135deg, ${rc}18, #120d06)`,
            border: `1px solid ${rc}30` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px' }}>
              <span style={{ fontSize: '28px', filter: `drop-shadow(0 0 8px ${rc}60)` }}>{lm}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Cairo'", fontWeight: 800, color: '#EADBB7', fontSize: '1rem', direction: 'rtl' }}>
                  {city.name}
                </div>
                <div style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                  {[0, 1, 2, 3].map((i) => (
                    <span key={i} style={{ fontSize: '12px', color: i < live.level ? rc : 'rgba(56,74,110,0.5)' }}>★</span>
                  ))}
                </div>
                <div style={{ fontSize: '11px', color: '#9AA6BC', fontFamily: "'Cairo'", marginTop: '2px' }}>
                  تكلفة الترقية: <span style={{ color: rc, fontWeight: 700 }}>{cost.toLocaleString('en-US')}</span>
                </div>
              </div>
              <button onClick={() => onUpgrade(city.id)}
                disabled={(player?.cash ?? 0) < cost || live.level >= MAX_UPGRADE_LEVEL}
                style={{ padding: '8px 14px', borderRadius: '10px', fontFamily: "'Cairo'", fontWeight: 800,
                  fontSize: '0.9rem', cursor: (player?.cash ?? 0) >= cost && live.level < MAX_UPGRADE_LEVEL ? 'pointer' : 'default',
                  background: (player?.cash ?? 0) >= cost && live.level < MAX_UPGRADE_LEVEL ? `linear-gradient(135deg, ${rc}, ${rc}CC)` : 'rgba(22,34,58,0.6)',
                  color: (player?.cash ?? 0) >= cost && live.level < MAX_UPGRADE_LEVEL ? '#0E1726' : '#9AA6BC',
                  opacity: (player?.cash ?? 0) < cost || live.level >= MAX_UPGRADE_LEVEL ? 0.6 : 1,
                  border: 'none' }}>
                {live.level >= MAX_UPGRADE_LEVEL ? 'ماكس' : (player?.cash ?? 0) < cost ? 'مش عندك' : 'رقّي'}
              </button>
            </div>
          </div>
        );
      })}
      <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
        background: 'rgba(22,34,58,0.6)', border: '1px solid rgba(56,74,110,0.4)', color: '#9AA6BC', cursor: 'pointer', fontSize: '0.9rem' }}>
        خلاص
      </button>
    </div>
  );
}

type TradeStep = 'pick' | 'configure' | 'confirm' | 'counter-configure' | 'counter-confirm';
function TradeModal({ currentPlayerId, partners, onTrade, onClose }: {
  currentPlayerId: string; partners: Player[];
  onTrade: (toId: string, oC: string[], oX: number, rC: string[], rX: number) => void;
  onClose: () => void;
}) {
  const game = useMatchStore(selectGame)!;
  const [step, setStep]     = useState<TradeStep>('pick');
  const [target, setTarget] = useState<Player | null>(null);
  const [offerC, setOfferC] = useState<string[]>([]);
  const [reqC,   setReqC]   = useState<string[]>([]);
  const [offerX, setOfferX] = useState(0);
  const [reqX,   setReqX]   = useState(0);
  const [ctrOC, setCtrOC]   = useState<string[]>([]);
  const [ctrRC, setCtrRC]   = useState<string[]>([]);
  const [ctrOX, setCtrOX]   = useState(0);
  const [ctrRX, setCtrRX]   = useState(0);
  const me    = game.players.find((p) => p.id === currentPlayerId)!;
  const them  = target ? game.players.find((p) => p.id === target.id) : null;
  const myC   = Object.values(game.cities).filter((c) => c.ownerId === currentPlayerId);
  const theirC = target ? Object.values(game.cities).filter((c) => c.ownerId === target.id) : [];
  const tog = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  const CityPicker = ({ label, cities, sel, setSel, cash, setCash, max, color }: {
    label: string; cities: typeof myC; sel: string[]; setSel: (v:string[])=>void;
    cash: number; setCash: (v:number)=>void; max: number; color: string;
  }) => (
    <div className="space-y-1.5">
      <p className="text-sm font-bold text-sand/80">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {cities.map((c) => {
          const rc = REGION_COLOR[c.region] ?? '#E0B43C';
          const lm = CITY_EMOJI[c.name] ?? '🏙️';
          return (
            <button key={c.id} onClick={() => tog(sel, setSel, c.id)}
              style={{ borderRadius: '8px', padding: '4px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer',
                background: sel.includes(c.id) ? `${rc}25` : 'rgba(22,34,58,0.6)',
                border: `1px solid ${sel.includes(c.id) ? rc + '70' : 'rgba(56,74,110,0.4)'}`,
                color: sel.includes(c.id) ? rc : '#9AA6BC', transition: 'all 0.15s' }}>
              {lm} {c.name}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted">فلوس:</span>
        <input type="number" min={0} max={max} step={100} value={cash}
          onChange={(e) => setCash(Math.min(Math.max(0,+e.target.value),max))}
          className="w-full rounded-xl border border-[rgba(56,74,110,0.7)] bg-[rgba(22,34,58,0.8)] px-3 py-2 text-content outline-none focus:border-[rgba(224,180,60,0.5)]"
          style={{ fontFamily: "'Cairo'" }} />
      </div>
    </div>
  );

  const Summary = ({ title, cIds, cash }: { title: string; cIds: string[]; cash: number }) => (
    <div dir="rtl">
      <p className="font-bold text-sand/80 text-sm">{title}</p>
      {cIds.length > 0 && <p className="text-sm">{cIds.map(id => `${CITY_EMOJI[game.cities[id]?.name??'']??'🏙️'} ${game.cities[id]?.name}`).join(' ، ')}</p>}
      {cash > 0 && <p className="text-sm">💰 {cash.toLocaleString('en-US')} جنيه</p>}
      {!cIds.length && !cash && <p className="text-sm text-muted">ولا حاجة</p>}
    </div>
  );

  if (step === 'pick') return (
    <div className="space-y-3" dir="rtl">
      <p className="text-center text-sm text-muted">اختار مين هتتصفق معاه</p>
      {partners.map((p) => (
        <button key={p.id} onClick={() => { setTarget(p); setStep('configure'); }}
          style={{ width: '100%', borderRadius: '14px', overflow: 'hidden', cursor: 'pointer',
            background: 'rgba(14,23,38,0.9)', border: '1px solid rgba(56,74,110,0.5)',
            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', textAlign: 'right',
            transition: 'border-color 0.2s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(224,180,60,0.4)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(56,74,110,0.5)')}>
          <span style={{ fontSize: '24px' }}>{p.vehicle}</span>
          <span style={{ flex: 1, fontFamily: "'Cairo'", fontWeight: 700, color: '#EADBB7' }}>{p.name}</span>
          <span style={{ fontFamily: 'monospace', color: '#E0B43C', fontWeight: 800 }}>{p.cash.toLocaleString('en-US')}</span>
        </button>
      ))}
      <button onClick={onClose} style={{ width: '100%', padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
        background: 'rgba(22,34,58,0.6)', border: '1px solid rgba(56,74,110,0.4)', color: '#9AA6BC', cursor: 'pointer' }}>
        لا خلاص
      </button>
    </div>
  );
  if (step === 'configure' && target) return (
    <div className="space-y-4" dir="rtl">
      <CityPicker label="اللي هتعرضه:" cities={myC} sel={offerC} setSel={setOfferC} cash={offerX} setCash={setOfferX} max={me.cash} color="text-gold" />
      <CityPicker label="اللي عايزه منه:" cities={theirC} sel={reqC} setSel={setReqC} cash={reqX} setCash={setReqX} max={them?.cash??0} color="text-teal" />
      <div className="flex gap-2">
        <button onClick={() => setStep('pick')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
          background: 'rgba(22,34,58,0.6)', border: '1px solid rgba(56,74,110,0.4)', color: '#9AA6BC', cursor: 'pointer' }}>رجوع</button>
        <button onClick={() => setStep('confirm')} disabled={!offerC.length&&!reqC.length&&!offerX&&!reqX}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'", fontWeight: 700,
            background: 'linear-gradient(135deg, #E8C040, #C49020)', color: '#0E1726', cursor: 'pointer', border: 'none',
            opacity: offerC.length||reqC.length||offerX||reqX ? 1 : 0.5 }}>ابعت العرض</button>
      </div>
    </div>
  );
  if (step === 'confirm' && target) return (
    <div className="space-y-4" dir="rtl">
      <div style={{ borderRadius: '12px', border: '1px solid rgba(224,180,60,0.2)', background: 'rgba(22,15,4,0.9)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p className="text-center text-xs text-muted">ديّ الموبايل لـ <strong className="text-content">{target.name}</strong></p>
        <Summary title={`${me.name} بيعرض:`} cIds={offerC} cash={offerX} />
        <Summary title={`${me.name} بيطلب:`} cIds={reqC} cash={reqX} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={onClose} style={{ padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
          background: 'rgba(199,91,57,0.2)', border: '1px solid rgba(199,91,57,0.4)', color: '#C75B39', cursor: 'pointer', fontSize: '0.9rem' }}>لا يا عم</button>
        <button onClick={() => setStep('counter-configure')} style={{ padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
          background: 'rgba(22,34,58,0.6)', border: '1px solid rgba(56,74,110,0.5)', color: '#9AA6BC', cursor: 'pointer', fontSize: '0.9rem' }}>هفاصل</button>
        <button onClick={() => onTrade(target.id, offerC, offerX, reqC, reqX)} style={{ padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'", fontWeight: 800,
          background: 'linear-gradient(135deg, #E8C040, #C49020)', color: '#0E1726', cursor: 'pointer', border: 'none', fontSize: '0.9rem' }}>موافق</button>
      </div>
    </div>
  );
  if (step === 'counter-configure' && target && them) return (
    <div className="space-y-3" dir="rtl">
      <p className="text-center text-xs font-bold text-content">{target.name} — عرض مضاد</p>
      <CityPicker label={`بتعرض (${target.name}):`} cities={theirC} sel={ctrOC} setSel={setCtrOC} cash={ctrOX} setCash={setCtrOX} max={them.cash} color="text-gold" />
      <CityPicker label={`بتطلب من ${me.name}:`} cities={myC} sel={ctrRC} setSel={setCtrRC} cash={ctrRX} setCash={setCtrRX} max={me.cash} color="text-teal" />
      <div className="flex gap-2">
        <button onClick={() => setStep('confirm')} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
          background: 'rgba(22,34,58,0.6)', border: '1px solid rgba(56,74,110,0.4)', color: '#9AA6BC', cursor: 'pointer' }}>رجوع</button>
        <button onClick={() => setStep('counter-confirm')} disabled={!ctrOC.length&&!ctrRC.length&&!ctrOX&&!ctrRX}
          style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'", fontWeight: 700,
            background: 'linear-gradient(135deg, #E8C040, #C49020)', color: '#0E1726', cursor: 'pointer', border: 'none' }}>ارسل</button>
      </div>
    </div>
  );
  if (step === 'counter-confirm' && target) return (
    <div className="space-y-4" dir="rtl">
      <div style={{ borderRadius: '12px', border: '1px solid rgba(42,157,143,0.2)', background: 'rgba(4,22,18,0.9)', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <p className="text-center text-xs text-muted">ديّ الموبايل لـ <strong className="text-content">{me.name}</strong></p>
        <Summary title={`${target.name} بيعرض:`} cIds={ctrOC} cash={ctrOX} />
        <Summary title={`${target.name} بيطلب:`} cIds={ctrRC} cash={ctrRX} />
      </div>
      <div className="flex gap-2">
        <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'",
          background: 'rgba(199,91,57,0.2)', border: '1px solid rgba(199,91,57,0.4)', color: '#C75B39', cursor: 'pointer' }}>لا يا عم</button>
        <button onClick={() => onTrade(target.id, ctrRC, ctrRX, ctrOC, ctrOX)} style={{ flex: 1, padding: '10px', borderRadius: '10px', fontFamily: "'Cairo'", fontWeight: 800,
          background: 'linear-gradient(135deg, #E8C040, #C49020)', color: '#0E1726', cursor: 'pointer', border: 'none' }}>موافق</button>
      </div>
    </div>
  );
  return null;
}

function BankruptcyModal({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const game           = useMatchStore(selectGame);
  const takeSalfa      = useMatchStore((s) => s.takeSalfa);
  const sellCity       = useMatchStore((s) => s.sellCity);
  const bankruptPlayer = useMatchStore((s) => s.bankruptPlayer);
  const endTurn        = useMatchStore((s) => s.endTurn);
  const player = game?.players.find((p) => p.id === playerId);
  const ownedCities = game ? Object.values(game.cities).filter((c) => c.ownerId === playerId) : [];
  useEffect(() => { if (player && player.cash >= 0) onClose(); }, [player?.cash, onClose]);
  if (!player || !game || player.cash >= 0) return null;
  const canTakeSalfa = player.cash + SALFA_AMOUNT >= 0;
  const hasOptions   = canTakeSalfa || ownedCities.length > 0;
  return (
    <div className="space-y-4" dir="rtl">
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>😰</div>
        <h3 style={{ fontFamily: "'Cairo'", fontWeight: 800, fontSize: '1.1rem', color: '#EADBB7' }}>مفيش فلوس!</h3>
        <p style={{ fontFamily: 'monospace', fontSize: '1.4rem', fontWeight: 800, color: '#E05656', marginTop: '4px' }}>
          {player.cash.toLocaleString('en-US')} جنيه
        </p>
      </div>
      {canTakeSalfa && (
        <div style={{ borderRadius: '12px', border: '2px solid rgba(42,157,143,0.4)', background: 'rgba(4,18,14,0.9)', padding: '12px' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#2A9D8F', fontFamily: "'Cairo'", marginBottom: '8px' }}>أسهل حل:</p>
          <button onClick={() => takeSalfa(playerId)} style={{ width: '100%', padding: '10px', borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(42,157,143,0.3), rgba(42,157,143,0.15))', border: '1px solid rgba(42,157,143,0.5)',
            color: '#2A9D8F', fontFamily: "'Cairo'", fontWeight: 700, cursor: 'pointer', fontSize: '0.95rem' }}>
            💳 اسلف {SALFA_AMOUNT.toLocaleString('en-US')} من البنك
          </button>
        </div>
      )}
      {ownedCities.length > 0 && (
        <div className="space-y-2">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9AA6BC', fontFamily: "'Cairo'" }}>بيع اللي عندك بنص التمن:</p>
          {ownedCities.map((c) => {
            const rc = REGION_COLOR[c.region] ?? '#E0B43C';
            const lm = CITY_EMOJI[c.name] ?? '🏙️';
            return (
              <button key={c.id} onClick={() => sellCity(c.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderRadius: '10px', border: `1px solid ${rc}30`, background: `${rc}10`,
                  padding: '10px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                <span style={{ fontFamily: "'Cairo'", fontWeight: 700, color: '#EADBB7', fontSize: '0.9rem' }}>
                  {lm} {c.name}
                </span>
                <span style={{ color: '#27AE60', fontWeight: 800, fontFamily: 'monospace' }}>
                  +{Math.round(c.price * 0.5).toLocaleString('en-US')}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!hasOptions && (
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: '1rem', fontWeight: 700, color: '#9AA6BC', fontFamily: "'Cairo'", marginBottom: '12px' }}>
            الدنيا قفلت معاك خالص 😭
          </p>
          <button onClick={() => { bankruptPlayer(playerId); onClose(); endTurn(); }}
            style={{ width: '100%', padding: '12px', borderRadius: '12px', fontFamily: "'Cairo'", fontWeight: 800, fontSize: '1rem',
              background: 'linear-gradient(135deg, rgba(199,91,57,0.4), rgba(199,91,57,0.2))',
              border: '1px solid rgba(199,91,57,0.5)', color: '#C75B39', cursor: 'pointer' }}>
            إفلاس 💀
          </button>
        </div>
      )}
    </div>
  );
}
