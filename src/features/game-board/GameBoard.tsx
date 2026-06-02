import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenContainer } from '@/components/layout';
import { Button, Card, Badge } from '@/components/ui';
import { useModal } from '@/hooks/useModal';
import { ROUTES } from '@/lib/constants';
import { cn } from '@/lib/cn';
import {
  useGameStore, usePlayersStore, useMatchStore,
  selectGame, selectCurrentPlayer, SALFA_AMOUNT,
} from '@/store';
import { canUpgrade, getUpgradeCost, MAX_UPGRADE_LEVEL } from '@/game/engine/upgradeEngine';
import { isRegionComplete } from '@/game/engine/economyEngine';
import { getCard } from '@/game/data/chanceCards';
import type { BoardSize, BoardTile, City, Player } from '@/game/types';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const SIZE_LABEL: Record<BoardSize, string> = { fast: 'سريعة', regular: 'كلاسيك', full: 'كاملة' };

const TILE_STYLE: Record<string, { bg: string; ring: string; icon: string }> = {
  ramses:  { bg: 'bg-gold/25 border-gold/65',      ring: 'ring-gold',    icon: '👑' },
  city:    { bg: 'bg-surface/60 border-border/55',  ring: 'ring-gold',    icon: '🏙️' },
  project: { bg: 'bg-teal/15  border-teal/40',      ring: 'ring-teal',    icon: '🏗️' },
  chance:  { bg: 'bg-gold/12  border-gold/30',      ring: 'ring-gold',    icon: '🎴' },
  news:    { bg: 'bg-teal/10  border-teal/30',      ring: 'ring-teal',    icon: '📰' },
  tax:     { bg: 'bg-clay/15  border-clay/40',      ring: 'ring-clay',    icon: '💸' },
  police:  { bg: 'bg-danger/15 border-danger/45',   ring: 'ring-danger',  icon: '🚔' },
  jail:    { bg: 'bg-clay/12  border-clay/35',      ring: 'ring-clay',    icon: '🔒' },
  rest:    { bg: 'bg-teal/10  border-teal/28',      ring: 'ring-teal',    icon: '🌴' },
};

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GameBoard() {
  const navigate = useNavigate();
  const { confirm, open, close } = useModal();

  // Store slices
  const game        = useMatchStore(selectGame);
  const cp          = useMatchStore(selectCurrentPlayer); // current player
  const rollDice    = useMatchStore((s) => s.rollDice);
  const movePlayer  = useMatchStore((s) => s.moveCurrentPlayer);
  const endTurn     = useMatchStore((s) => s.endTurn);
  const buyCity     = useMatchStore((s) => s.buyCity);
  const payRent     = useMatchStore((s) => s.payRent);
  const upgradeCity = useMatchStore((s) => s.upgradeCity);
  const sellCity    = useMatchStore((s) => s.sellCity);
  const goToJail    = useMatchStore((s) => s.goToJail);
  const releaseFromJail   = useMatchStore((s) => s.releaseFromJail);
  const decrementJailTurns = useMatchStore((s) => s.decrementJailTurns);
  const payTax      = useMatchStore((s) => s.payTax);
  const drawChance  = useMatchStore((s) => s.drawAndApplyChanceCard);
  const executeTrade = useMatchStore((s) => s.executeTrade);
  const triggerNews = useMatchStore((s) => s.triggerNewsEvent);
  const pendingNews = useMatchStore((s) => s.pendingNewsEvent);
  const resetMatch  = useMatchStore((s) => s.resetMatch);
  const resetGame   = useGameStore((s) => s.resetGame);
  const resetPlayers = usePlayersStore((s) => s.resetPlayers);
  const roomCode    = useGameStore((s) => s.config.roomCode);

  // Animation states
  const [diceRolling, setDiceRolling]   = useState(false);
  const [diceDisplay, setDiceDisplay]   = useState<number | null>(null);
  const [animPos, setAnimPos]           = useState<number | null>(null); // visual position override
  const [isMoving, setIsMoving]         = useState(false);
  const [lastRoll, setLastRoll]         = useState<number | null>(null);
  const [fromPos, setFromPos]           = useState<number | null>(null);
  const [rollAgainPending, setRollAgainPending] = useState(false);
  const diceTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup animation timers on unmount
  useEffect(() => () => {
    if (diceTimerRef.current)  clearInterval(diceTimerRef.current);
    if (moveTimerRef.current)  clearInterval(moveTimerRef.current);
  }, []);

  // News event: shown when endTurn flags it
  useEffect(() => {
    if (!pendingNews) return;
    triggerNews(); // applies effects + clears pendingNews
    const ev = pendingNews; // captured before clearing
    setTimeout(() => {
      const nid = open(
        <div className="space-y-3 text-center">
          <div className="text-5xl">📰</div>
          <Badge tone="clay">أخبار البلد</Badge>
          <h3 className="text-xl text-gold-sheen">{ev.title}</h3>
          <p className="text-sm text-content leading-relaxed">{ev.text}</p>
          {ev.cash !== 0 && (
            <p className={cn('font-extrabold', ev.cash > 0 ? 'text-gold' : 'text-clay')}>
              {ev.cash > 0 ? '+' : ''}{ev.cash} جنيه لكل لاعب
            </p>
          )}
          <Button block onClick={() => close(nid)}>خلاص فهمت</Button>
        </div>,
        { size: 'sm', hideClose: true }
      );
    }, 200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNews]);

  // Navigate to winner after game ends
  useEffect(() => {
    if (game?.phase === 'finished') {
      const t = setTimeout(() => navigate(ROUTES.winner), 900);
      return () => clearTimeout(t);
    }
  }, [game?.phase, navigate]);

  // ── Quit ─────────────────────────────────────────────────────────────────────
  const handleQuit = async () => {
    const ok = await confirm({ title: 'إنهاء اللعبة', message: 'هتفقد اللعبة الحالية. متأكد؟', confirmLabel: 'اخرج', danger: true });
    if (ok) { resetMatch(); resetGame(); resetPlayers(); navigate(ROUTES.home); }
  };

  if (!game || !cp) {
    return (
      <ScreenContainer header={{ title: 'اللعبة', onBack: () => navigate(ROUTES.home) }} center>
        <Card padding="lg" className="text-center">
          <div className="mb-3 text-5xl opacity-70">🎲</div>
          <h3 className="mb-2 text-xl text-gold-sheen">مفيش لعبة شغالة</h3>
          <Button block onClick={() => navigate(ROUTES.home)}>الرئيسية</Button>
        </Card>
      </ScreenContainer>
    );
  }

  const phase     = game.phase;
  const isInJail  = cp.jailTurns > 0;
  const canRoll   = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !isInJail && !diceRolling && !isMoving;
  const canEnd    = phase === 'turn-end' && !isMoving;
  const myCities  = Object.values(game.cities).filter((c) => c.ownerId === cp.id);
  const canUpgradeAny = game.mode !== 'quick' && myCities.some((c) => canUpgrade(game, c, cp.id));
  const canTrade  = game.mode !== 'quick' && !game.tradeUsedThisTurn && game.players.filter((p) => p.isActive).length > 1;

  // Board visuals: use animPos to override current player's visual position
  const occupantsByTile = new Map<number, Player[]>();
  game.players.forEach((p) => {
    if (!p.isActive) return;
    const pos = (p.id === cp.id && animPos !== null) ? animPos : p.position;
    const arr = occupantsByTile.get(pos) ?? [];
    arr.push(p);
    occupantsByTile.set(pos, arr);
  });
  const colorByPlayer = new Map(game.players.map((p) => [p.id, p.color]));
  const ownerColorByTile = new Map<number, string>();
  Object.values(game.cities).forEach((c) => {
    if (c.ownerId) { const col = colorByPlayer.get(c.ownerId); if (col) ownerColorByTile.set(c.tileIndex, col); }
  });
  const ownedCountByPlayer = new Map<string, number>();
  Object.values(game.cities).forEach((c) => {
    if (c.ownerId) ownedCountByPlayer.set(c.ownerId, (ownedCountByPlayer.get(c.ownerId) ?? 0) + 1);
  });
  // Visual position for the current player (during animation or real)
  const cpVisualPos = animPos !== null ? animPos : cp.position;

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((content: ReactNode, delay = 2400) => {
    const id = open(content, { hideClose: true, size: 'sm', dismissable: true });
    setTimeout(() => close(id), delay);
  }, [open, close]);

  // ── Insolvency check ─────────────────────────────────────────────────────────
  const checkInsolvency = useCallback((playerId: string) => {
    const p = useMatchStore.getState().game?.players.find((pl) => pl.id === playerId);
    if (!p || p.cash >= 0) return;
    const id = open(
      <BankruptcyModal playerId={playerId} onClose={() => close(id)} />,
      { title: 'محتاج فلوس! 😰', size: 'md', dismissable: false, hideClose: true }
    );
  }, [open, close]);

  // ── Landing resolver (reads live store, called AFTER movePlayer) ──────────────
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
        // unowned → offer to buy
        const canAfford = player.cash >= city.price;
        const mid = open(
          <BuyCityModal
            city={city}
            canAfford={canAfford}
            onBuy={() => {
              buyCity(city.id); close(mid);
              const after = useMatchStore.getState().game;
              if (after && isRegionComplete(after, city.region, player.id)) {
                showToast(
                  <div className="text-center">
                    <div className="mb-2 text-4xl">🏆</div>
                    <h3 className="text-xl text-gold-sheen">كمّلت المنطقة!</h3>
                    <p className="mt-1 text-sm text-content">الإيجار في مدنها بقى الضعف</p>
                  </div>
                );
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
              <div className="mb-2 text-4xl">💸</div>
              <h3 className="text-xl text-gold-sheen">دفعت إيجار</h3>
              <p className="mt-2 text-sm text-content">في «{city.name}» لـ <strong>{owner?.name}</strong></p>
              <p className="mt-1 text-lg font-extrabold text-clay">−{tx.amount.toLocaleString('en-US')} جنيه</p>
            </div>
          );
          checkInsolvency(player.id);
        }
      }
    } else if (tile.type === 'police') {
      goToJail(player.id);
      const pid = open(
        <div className="text-center space-y-5">
          <div className="text-7xl">🚔</div>
          <h3 className="text-3xl text-gold-sheen">كلابوووش!</h3>
          <p className="text-sm text-muted">روح السجن على طول!</p>
          <Button block onClick={() => close(pid)}>حاضر يا باشا</Button>
        </div>,
        { size: 'sm', hideClose: true, dismissable: false }
      );
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
            <p className={cn('text-lg font-extrabold', card.amount > 0 ? 'text-gold' : 'text-clay')}>
              {card.amount > 0 ? '+' : ''}{card.amount.toLocaleString('en-US')} جنيه
            </p>
          )}
          <Button block onClick={() => {
            close(cid);
            if (card.type === 'move') {
              const cur = useMatchStore.getState().game?.players[game.currentPlayerIndex];
              if (!cur) return;
              const steps = card.toTile !== undefined
                ? ((card.toTile - cur.position + game.board.length) % game.board.length)
                : (card.spaces ?? 0);
              if (steps !== 0) {
                movePlayer(steps);
                setTimeout(resolveLanding, 80);
              }
            } else if (card.type === 'police') {
              goToJail(player.id);
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
          <div className="mb-2 text-4xl">💸</div>
          <h3 className="text-xl text-gold-sheen">ضرائب!</h3>
          <p className="mt-1 text-sm text-muted">دفعت للحكومة</p>
          <p className="mt-1 font-extrabold text-clay">−{paid.toLocaleString('en-US')} جنيه</p>
        </div>
      );
      checkInsolvency(player.id);
    }
  }, [open, close, buyCity, payRent, payTax, goToJail, drawChance, movePlayer, showToast, checkInsolvency, game]);

  // ── Movement animation ────────────────────────────────────────────────────────
  const animateAndMove = useCallback((from: number, steps: number, boardLen: number, salary: number) => {
    if (steps <= 0) { resolveLanding(); return; }
    setIsMoving(true);
    setAnimPos(from);
    let step = 0;
    moveTimerRef.current = setInterval(() => {
      step++;
      const pos = (from + step) % boardLen;
      setAnimPos(pos);
      if (step >= steps) {
        clearInterval(moveTimerRef.current!);
        setTimeout(() => {
          setAnimPos(null);
          setIsMoving(false);
          // Show Ramses salary toast after landing
          if (salary > 0) {
            showToast(
              <div className="text-center">
                <div className="mb-2 text-5xl">💰</div>
                <h3 className="text-2xl text-gold-sheen">قبضت مرتبك</h3>
                <p className="mt-2 text-lg font-extrabold text-gold">+{salary.toLocaleString('en-US')} جنيه</p>
              </div>
            );
          }
          resolveLanding();
        }, 120);
      }
    }, 200);
  }, [resolveLanding, showToast]);

  // ── Normal dice + move ────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (diceRolling || isMoving) return;
    const g = useMatchStore.getState().game;
    const before = g?.players[g.currentPlayerIndex];
    if (!before) return;
    setFromPos(before.position);
    setDiceRolling(true);
    setRollAgainPending(false);

    // Roll immediately (updates store dice state & phase: 'moving')
    const value = rollDice();
    if (!value) { setDiceRolling(false); return; }

    // Cycle dice faces for 850ms then reveal
    diceTimerRef.current = setInterval(() => {
      setDiceDisplay(Math.ceil(Math.random() * 6));
    }, 80);
    setTimeout(() => {
      clearInterval(diceTimerRef.current!);
      setDiceDisplay(value);
      setDiceRolling(false);

      // Wait 400ms showing the result, then animate movement
      setTimeout(() => {
        const cashBefore = before.cash;
        movePlayer(value); // updates store: position, salary, phase: 'turn-end'
        const after = useMatchStore.getState().game?.players[g.currentPlayerIndex];
        const salary = Math.max(0, (after?.cash ?? cashBefore) - cashBefore);
        setLastRoll(value);
        animateAndMove(before.position, value, g.board.length, salary);
      }, 400);
    }, 850);
  }, [diceRolling, isMoving, rollDice, movePlayer, animateAndMove]);

  // ── Jail actions ──────────────────────────────────────────────────────────────
  const openJailModal = () => {
    const isFast = game.mode === 'quick';
    const jid = open(
      <JailModal
        playerId={cp.id}
        isFast={isFast}
        onRoll={() => {
          close(jid);
          // Animate jail dice roll (no store rollDice here — jail uses separate roll)
          setDiceRolling(true);
          diceTimerRef.current = setInterval(() => {
            setDiceDisplay(Math.ceil(Math.random() * 6));
          }, 80);
          setTimeout(() => {
            clearInterval(diceTimerRef.current!);
            const val = Math.ceil(Math.random() * 6);
            setDiceDisplay(val);
            setDiceRolling(false);
            setLastRoll(val);

            setTimeout(() => {
              const g = useMatchStore.getState().game;
              const player = g?.players.find((p) => p.id === cp.id);
              if (!player) return;
              if (val === 6) {
                releaseFromJail(cp.id, false);
                movePlayer(val);
                const after = useMatchStore.getState().game?.players.find((p) => p.id === cp.id);
                setLastRoll(val);
                animateAndMove(player.position, val, g!.board.length, 0);
              } else {
                // Failed
                if (isFast) {
                  releaseFromJail(cp.id, false); // always free after 1 attempt in fast
                } else {
                  decrementJailTurns(cp.id);
                }
                endTurn();
              }
            }, 400);
          }, 850);
        }}
        onPay={() => {
          close(jid);
          releaseFromJail(cp.id, true); // deducts 500 from store
          // After paying, phase is still 'rolling'; player can now roll normally
          // Check if paying made them insolvent
          const updated = useMatchStore.getState().game?.players.find((p) => p.id === cp.id);
          if (updated && updated.cash < 0) checkInsolvency(cp.id);
        }}
        onSkip={() => {
          close(jid);
          decrementJailTurns(cp.id);
          endTurn();
        }}
      />,
      { title: '🔒 في السجن', size: 'sm', dismissable: false, hideClose: true }
    );
  };

  // ── Upgrade modal ─────────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    const upgradeable = myCities.filter((c) => canUpgrade(game, c, cp.id));
    const uid = open(
      <UpgradeModal
        cities={upgradeable}
        playerId={cp.id}
        onUpgrade={(cityId) => upgradeCity(cityId)}
        onClose={() => close(uid)}
      />,
      { title: 'ترقية المدن 🏗️', size: 'md' }
    );
  };

  // ── Trade modal ───────────────────────────────────────────────────────────────
  const openTradeModal = () => {
    const partners = game.players.filter((p) => p.isActive && p.id !== cp.id);
    const tid = open(
      <TradeModal
        currentPlayerId={cp.id}
        partners={partners}
        onTrade={(toId, offerC, offerCash, reqC, reqCash) => {
          executeTrade(cp.id, toId, offerC, offerCash, reqC, reqCash);
          close(tid);
          showToast(
            <div className="text-center"><div className="mb-2 text-4xl">🤝</div>
            <h3 className="text-xl text-gold-sheen">الصفقة اتمت!</h3></div>,
            1600
          );
        }}
        onClose={() => close(tid)}
      />,
      { title: 'التداول 🤝', size: 'lg' }
    );
  };

  // ── End turn ──────────────────────────────────────────────────────────────────
  const handleEndTurn = () => {
    setLastRoll(null); setFromPos(null); setRollAgainPending(false);
    endTurn();
  };

  // ── Footer ────────────────────────────────────────────────────────────────────
  const footer = canEnd ? (
    <div className="space-y-2">
      {canUpgradeAny && (
        <Button block variant="secondary" onClick={openUpgradeModal}>🏗️ رقّي مدنك</Button>
      )}
      {canTrade && (
        <Button block variant="secondary" onClick={openTradeModal}>🤝 تداول</Button>
      )}
      <Button block size="lg" onClick={handleEndTurn}>إنهاء الدور ←</Button>
    </div>
  ) : isInJail ? (
    <Button block size="lg" onClick={openJailModal} leadingIcon={<span>🔓</span>}>محاولة الهروب</Button>
  ) : (
    <Button block size="lg" onClick={handleRoll} disabled={!canRoll} leadingIcon={<span>{diceRolling ? '🎰' : '🎲'}</span>}>
      {diceRolling ? 'جاري الرمي…' : isMoving ? 'جاري التحريك…' : rollAgainPending ? 'ارمي تاني!' : 'ارمي الزهر'}
    </Button>
  );

  return (
    <ScreenContainer
      header={{
        title: 'اللعبة', onBack: handleQuit,
        actions: (
          <Badge tone="neutral" className="font-mono text-xs">
            <span dir="ltr">{roomCode}</span>
          </Badge>
        ),
      }}
      footer={footer}
    >
      <div className="flex flex-1 flex-col gap-4">

        {/* Status strip */}
        <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-surface/70 px-4 py-2.5 text-sm">
          <span className="text-muted">الجولة <span className="font-bold text-content">{game.round}</span></span>
          <div className="flex items-center gap-1.5">
            {game.activeNewsEvent && <Badge tone="clay">📰</Badge>}
            {cp.solfaDebt > 0 && <Badge tone="clay">سلفة</Badge>}
            <Badge tone="teal">{SIZE_LABEL[game.boardSize]}</Badge>
          </div>
        </div>

        {/* Current player card */}
        <Card accent padding="md">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl text-2xl"
                style={{ backgroundColor: cp.color }}>
                {cp.vehicle}
              </span>
              {isInJail && <span className="absolute -top-1 -end-1 text-sm">🔒</span>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-muted">{isInJail ? 'في السجن' : 'دور دلوقتي'}</p>
              <p className="truncate text-lg font-extrabold text-content">{cp.name}</p>
            </div>
            <div className="text-end">
              <p className="text-[10px] text-muted">الفلوس</p>
              <p className={cn('font-extrabold tabular-nums text-lg', cp.cash < 0 ? 'text-danger' : 'text-gold')}>
                {cp.cash.toLocaleString('en-US')}
              </p>
              {cp.solfaDebt > 0 && (
                <p className="text-[10px] text-clay">سلفة {cp.solfaDebt.toLocaleString('en-US')}</p>
              )}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
            <span>خانة <span className="font-bold text-content">{cpVisualPos}</span></span>
            <span>لفّات <span className="font-bold text-content">{cp.laps}</span></span>
            {cp.hasRentFreePass && <Badge tone="teal" className="text-[10px]">🛡️ محمي</Badge>}
            {isInJail && <span>محاولات: <span className="font-bold text-content">{cp.jailTurns}</span></span>}
          </div>
          {myCities.length > 0 && (
            <div className="mt-2 border-t border-border/40 pt-2">
              <div className="flex flex-wrap gap-1">
                {myCities.map((c) => (
                  <span key={c.id} className="rounded-full border border-border/60 bg-surface-2/60 px-2 py-0.5 text-[10px] font-bold text-content">
                    {c.name}{c.level > 0 ? ' ' + '⭐'.repeat(c.level) : ''}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Dice display */}
        <DiceDisplay rolling={diceRolling} displayValue={diceDisplay} lastRoll={lastRoll} fromPos={fromPos} toPos={cp.position} />

        {/* Board */}
        <section>
          <div className={cn(
            'grid gap-1',
            game.board.length <= 16 ? 'grid-cols-4' :
            game.board.length <= 24 ? 'grid-cols-4 sm:grid-cols-6' :
            'grid-cols-5',
          )}>
            {game.board.map((tile) => (
              <BoardTileView
                key={tile.index}
                tile={tile}
                isCurrent={tile.index === cpVisualPos}
                occupants={occupantsByTile.get(tile.index) ?? []}
                ownerColor={ownerColorByTile.get(tile.index)}
                upgradeLevel={tile.cityId ? (game.cities[tile.cityId]?.level ?? 0) : 0}
                currentPlayerId={cp.id}
              />
            ))}
          </div>
        </section>

        {/* Players strip */}
        <ul className="grid grid-cols-2 gap-1.5">
          {game.players.map((p) => {
            const isCurrent = p.id === cp.id;
            return (
              <li key={p.id} className={cn(
                'flex items-center gap-2 rounded-xl border p-2',
                !p.isActive ? 'opacity-35 border-border/20 bg-surface/25' :
                isCurrent ? 'border-gold/70 bg-gold/10' : 'border-border/60 bg-surface/50',
              )}>
                <span className="text-lg">{p.vehicle}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-bold text-content">{p.name}</span>
                  <span className={cn('text-[10px]', p.cash < 0 ? 'text-danger' : 'text-muted')}>
                    {p.isActive ? p.cash.toLocaleString('en-US') : '💀 أفلس'}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] text-muted">
                  🏙️{ownedCountByPlayer.get(p.id) ?? 0}
                  {p.jailTurns > 0 ? ' 🔒' : ''}
                </span>
              </li>
            );
          })}
        </ul>

      </div>
    </ScreenContainer>
  );
}

// ─── BOARD TILE ───────────────────────────────────────────────────────────────

function BoardTileView({ tile, isCurrent, occupants, ownerColor, upgradeLevel, currentPlayerId }: {
  tile: BoardTile; isCurrent: boolean; occupants: Player[];
  ownerColor?: string; upgradeLevel: number; currentPlayerId: string;
}) {
  const style = TILE_STYLE[tile.type] ?? TILE_STYLE.city;
  const isCorner = tile.type === 'ramses' || tile.type === 'jail' || tile.type === 'rest' || tile.type === 'police';

  return (
    <div className={cn(
      'relative flex flex-col items-center rounded-lg border overflow-hidden',
      'aspect-square text-[8px] leading-tight select-none',
      style.bg,
      isCurrent && `animate-tile-ping outline outline-2 outline-offset-0 outline-gold z-10`,
    )}>
      {/* Owner color stripe at bottom */}
      {ownerColor && (
        <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: ownerColor }} />
      )}
      {/* Upgrade stars top-left */}
      {upgradeLevel > 0 && (
        <div className="absolute start-0.5 top-0.5 text-[7px] leading-none">
          {'⭐'.repeat(upgradeLevel)}
        </div>
      )}
      {/* Tile index top-right */}
      <div className="absolute end-0.5 top-0.5 font-mono text-[7px] text-muted/60 leading-none">
        {tile.index}
      </div>

      {/* Main icon */}
      <div className={cn(
        'flex flex-1 items-center justify-center',
        occupants.length > 0 ? 'mt-3' : 'mt-2',
      )}>
        {occupants.length > 0 ? (
          <div className="flex flex-wrap justify-center gap-0.5">
            {occupants.map((o) => (
              <span key={o.id}
                className={cn('text-[14px] leading-none', o.id === currentPlayerId && isCurrent && 'animate-bounce')}>
                {o.vehicle}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[13px] leading-none opacity-80">{style.icon}</span>
        )}
      </div>

      {/* Name */}
      <div className={cn(
        'w-full px-0.5 pb-1 text-center font-bold leading-tight text-content',
        isCorner ? 'text-[8px]' : 'text-[7.5px]',
      )}>
        {tile.name}
      </div>
    </div>
  );
}

// ─── DICE DISPLAY ─────────────────────────────────────────────────────────────

function DiceDisplay({ rolling, displayValue, lastRoll, fromPos, toPos }: {
  rolling: boolean; displayValue: number | null;
  lastRoll: number | null; fromPos: number | null; toPos: number;
}) {
  if (!rolling && lastRoll === null) {
    return (
      <Card padding="sm" className="flex items-center justify-center gap-3 py-3">
        <span className="text-3xl opacity-40">🎲</span>
        <p className="text-sm text-muted">ارمي الزهر علشان تتحرك</p>
      </Card>
    );
  }
  return (
    <Card padding="sm" className="flex items-center justify-between gap-4 py-3">
      <div className={cn(
        'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 text-4xl font-black tabular-nums',
        rolling
          ? 'animate-dice-shake border-gold/40 bg-gold/10 text-gold'
          : 'animate-pop-in border-gold bg-gold/20 text-gold-sheen',
      )}>
        {DICE_FACES[displayValue ?? 1]}
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {rolling ? (
          <p className="text-muted">جاري الرمي…</p>
        ) : (
          <>
            <p className="font-bold text-content">رمية: <span className="text-gold">{lastRoll}</span></p>
            {fromPos !== null && (
              <p className="text-muted text-xs">
                {fromPos} ← <span className="text-content font-bold">{toPos}</span>
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}

// ─── JAIL MODAL (reads live store) ───────────────────────────────────────────

function JailModal({ playerId, isFast, onRoll, onPay, onSkip }: {
  playerId: string; isFast: boolean; onRoll: () => void; onPay: () => void; onSkip: () => void;
}) {
  const game = useMatchStore(selectGame);
  const player = game?.players.find((p) => p.id === playerId);
  const cash = player?.cash ?? 0;
  const jailTurns = player?.jailTurns ?? 0;

  return (
    <div className="space-y-5 text-center">
      <div className="text-5xl">🔒</div>
      <div>
        <h3 className="text-xl text-gold-sheen">في السجن</h3>
        {isFast
          ? <p className="mt-1 text-sm text-muted">ارمي ٦ علشان تطلع — لو فشلت خسرت الدور وبتطلع</p>
          : <p className="mt-1 text-sm text-muted">محاولات متبقية: <span className="font-bold text-content">{jailTurns}</span></p>
        }
      </div>
      <div className="space-y-2.5">
        <Button block onClick={onRoll} leadingIcon={<span>🎲</span>}>
          ارمي الزهر {isFast ? '(لازم ٦)' : '(٦ = حرية)'}
        </Button>
        {!isFast && (
          <Button block variant="secondary" disabled={cash < 500} onClick={onPay}>
            💰 ادفع ٥٠٠ وأخرج {cash < 500 ? '(مش عندك)' : ''}
          </Button>
        )}
        <Button block variant="ghost" onClick={onSkip}>⏭️ خلّي لدور جاي</Button>
      </div>
    </div>
  );
}

// ─── BUY CITY MODAL ───────────────────────────────────────────────────────────

function BuyCityModal({ city, canAfford, onBuy, onPass }: {
  city: City; canAfford: boolean; onBuy: () => void; onPass: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="text-5xl">🏙️</div>
      <h3 className="text-2xl text-gold-sheen">{city.name}</h3>
      <div className="flex justify-center gap-8 text-sm">
        <div><p className="text-muted">السعر</p><p className="font-extrabold text-gold">{city.price.toLocaleString('en-US')}</p></div>
        <div><p className="text-muted">إيجار</p><p className="font-extrabold text-content">{city.baseRent.toLocaleString('en-US')}</p></div>
        <div><p className="text-muted">منطقة كاملة</p><p className="font-extrabold text-teal">{(city.baseRent * 2).toLocaleString('en-US')}</p></div>
      </div>
      {canAfford ? (
        <div className="flex gap-3">
          <Button variant="ghost" block onClick={onPass}>هدي وعدي</Button>
          <Button block onClick={onBuy}>اشتري</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-base font-bold text-danger leading-relaxed">
            معاكش فلوس يا فقير<br />شوف انت رايح فين 😂
          </p>
          <Button variant="ghost" block onClick={onPass}>هدي وعدي</Button>
        </div>
      )}
    </div>
  );
}

// ─── UPGRADE MODAL ────────────────────────────────────────────────────────────

function UpgradeModal({ cities, playerId, onUpgrade, onClose }: {
  cities: City[]; playerId: string; onUpgrade: (id: string) => void; onClose: () => void;
}) {
  const game = useMatchStore(selectGame);
  const player = game?.players.find((p) => p.id === playerId);
  const cash = player?.cash ?? 0;

  if (!game) return null;
  const upgradeable = cities.filter((c) => canUpgrade(game, game.cities[c.id] ?? c, playerId));

  return (
    <div className="space-y-3">
      {upgradeable.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لازم تكمّل المنطقة الأول</p>
      ) : upgradeable.map((city) => {
        const liveCity = game.cities[city.id] ?? city;
        const cost = getUpgradeCost(liveCity);
        const canAfford = cash >= cost;
        const atMax = liveCity.level >= MAX_UPGRADE_LEVEL;
        return (
          <div key={city.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3">
            <div>
              <p className="font-bold text-content">{city.name}</p>
              <p className="text-xs text-muted">
                {'⭐'.repeat(liveCity.level) || '—'} → {'⭐'.repeat(liveCity.level + 1)}
                {' · '}{cost.toLocaleString('en-US')}
              </p>
            </div>
            <Button size="sm" disabled={!canAfford || atMax} onClick={() => onUpgrade(city.id)}>
              {atMax ? 'ماكس' : !canAfford ? 'مش عندك' : 'رقّي'}
            </Button>
          </div>
        );
      })}
      <Button variant="ghost" block onClick={onClose}>خلاص</Button>
    </div>
  );
}

// ─── TRADE MODAL (with counter-offer) ────────────────────────────────────────

type TradeStep = 'pick' | 'configure' | 'confirm' | 'counter-configure' | 'counter-confirm';

function TradeModal({ currentPlayerId, partners, onTrade, onClose }: {
  currentPlayerId: string; partners: Player[];
  onTrade: (toId: string, offerC: string[], offerCash: number, reqC: string[], reqCash: number) => void;
  onClose: () => void;
}) {
  const game = useMatchStore(selectGame)!;
  const [step, setStep] = useState<TradeStep>('pick');
  const [target, setTarget] = useState<Player | null>(null);
  const [offerCities, setOfferCities] = useState<string[]>([]);
  const [reqCities,   setReqCities]   = useState<string[]>([]);
  const [offerCash,   setOfferCash]   = useState(0);
  const [reqCash,     setReqCash]     = useState(0);
  // Counter-offer (from target's perspective)
  const [ctrOfferC, setCtrOfferC] = useState<string[]>([]);
  const [ctrReqC,   setCtrReqC]   = useState<string[]>([]);
  const [ctrOfferCash, setCtrOfferCash] = useState(0);
  const [ctrReqCash,   setCtrReqCash]   = useState(0);

  const me = game.players.find((p) => p.id === currentPlayerId)!;
  const them = target ? game.players.find((p) => p.id === target.id) : null;
  const myCities    = Object.values(game.cities).filter((c) => c.ownerId === currentPlayerId);
  const theirCities = target ? Object.values(game.cities).filter((c) => c.ownerId === target.id) : [];

  const toggle = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  if (step === 'pick') return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted">اختار لاعب تتداول معاه</p>
      {partners.map((p) => (
        <button key={p.id}
          className="w-full flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/60 p-3 text-right hover:border-gold/50"
          onClick={() => { setTarget(p); setStep('configure'); }}>
          <span className="text-2xl">{p.vehicle}</span>
          <span className="flex-1 font-bold text-content">{p.name}</span>
          <span className="text-sm text-gold tabular-nums">{p.cash.toLocaleString('en-US')}</span>
        </button>
      ))}
      <Button variant="ghost" block onClick={onClose}>إلغاء</Button>
    </div>
  );

  if (step === 'configure' && target) return (
    <div className="space-y-4 text-sm">
      <p className="text-center text-xs text-muted">تتفاوض مع <strong className="text-content">{target.name}</strong></p>
      <div className="space-y-2">
        <p className="font-bold text-sand/80">بتعرض من عندك:</p>
        <div className="flex flex-wrap gap-1.5">
          {myCities.map((c) => (
            <button key={c.id} onClick={() => toggle(offerCities, setOfferCities, c.id)}
              className={cn('rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                offerCities.includes(c.id) ? 'border-gold/70 bg-gold/20 text-gold' : 'border-border/70 bg-surface/60 text-muted')}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted">فلوس:</span>
          <input type="number" min={0} max={me.cash} step={500} value={offerCash}
            onChange={(e) => setOfferCash(Math.min(Math.max(0, +e.target.value), me.cash))}
            className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-2 text-content outline-none focus:border-gold/60" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-bold text-sand/80">بتطلب منه:</p>
        <div className="flex flex-wrap gap-1.5">
          {theirCities.map((c) => (
            <button key={c.id} onClick={() => toggle(reqCities, setReqCities, c.id)}
              className={cn('rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                reqCities.includes(c.id) ? 'border-teal/70 bg-teal/20 text-teal' : 'border-border/70 bg-surface/60 text-muted')}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted">فلوس:</span>
          <input type="number" min={0} max={them?.cash ?? 0} step={500} value={reqCash}
            onChange={(e) => setReqCash(Math.min(Math.max(0, +e.target.value), them?.cash ?? 0))}
            className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-2 text-content outline-none focus:border-gold/60" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" block onClick={() => setStep('pick')}>رجوع</Button>
        <Button block onClick={() => setStep('confirm')}
          disabled={!offerCities.length && !reqCities.length && !offerCash && !reqCash}>
          عرض الصفقة
        </Button>
      </div>
    </div>
  );

  // Target sees the offer
  if (step === 'confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-gold/8 p-4 text-sm space-y-2">
        <p className="text-center text-xs text-muted mb-3">ديّ الموبايل لـ <strong className="text-content">{target.name}</strong></p>
        <p className="font-bold text-sand/80">{me.name} بيعرض:</p>
        {offerCities.length > 0 && <p>🏙️ {offerCities.map((id) => game.cities[id]?.name).filter(Boolean).join('، ')}</p>}
        {offerCash > 0 && <p>💰 {offerCash.toLocaleString('en-US')} جنيه</p>}
        {!offerCities.length && !offerCash && <p className="text-muted">لا شيء</p>}
        <p className="font-bold text-sand/80 mt-2">{me.name} بيطلب:</p>
        {reqCities.length > 0 && <p>🏙️ {reqCities.map((id) => game.cities[id]?.name).filter(Boolean).join('، ')}</p>}
        {reqCash > 0 && <p>💰 {reqCash.toLocaleString('en-US')} جنيه</p>}
        {!reqCities.length && !reqCash && <p className="text-muted">لا شيء</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="danger" size="sm" onClick={onClose}>لا يا عم</Button>
        <Button variant="secondary" size="sm" onClick={() => setStep('counter-configure')}>هفاصل</Button>
        <Button size="sm" onClick={() => onTrade(target.id, offerCities, offerCash, reqCities, reqCash)}>موافق</Button>
      </div>
    </div>
  );

  // Counter-offer: target configures THEIR offer (roles swapped)
  if (step === 'counter-configure' && target && them) return (
    <div className="space-y-4 text-sm">
      <p className="text-center text-xs text-muted font-bold text-content">{target.name} — عمل عرض مضاد</p>
      <div className="space-y-2">
        <p className="font-bold text-sand/80">بتعرض من عندك ({target.name}):</p>
        <div className="flex flex-wrap gap-1.5">
          {theirCities.map((c) => (
            <button key={c.id} onClick={() => toggle(ctrOfferC, setCtrOfferC, c.id)}
              className={cn('rounded-full border px-3 py-1 text-xs font-bold',
                ctrOfferC.includes(c.id) ? 'border-gold/70 bg-gold/20 text-gold' : 'border-border/70 bg-surface/60 text-muted')}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted">فلوس:</span>
          <input type="number" min={0} max={them.cash} step={500} value={ctrOfferCash}
            onChange={(e) => setCtrOfferCash(Math.min(Math.max(0,+e.target.value), them.cash))}
            className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-2 text-content outline-none focus:border-gold/60" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="font-bold text-sand/80">بتطلب من {me.name}:</p>
        <div className="flex flex-wrap gap-1.5">
          {myCities.map((c) => (
            <button key={c.id} onClick={() => toggle(ctrReqC, setCtrReqC, c.id)}
              className={cn('rounded-full border px-3 py-1 text-xs font-bold',
                ctrReqC.includes(c.id) ? 'border-teal/70 bg-teal/20 text-teal' : 'border-border/70 bg-surface/60 text-muted')}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-muted">فلوس:</span>
          <input type="number" min={0} max={me.cash} step={500} value={ctrReqCash}
            onChange={(e) => setCtrReqCash(Math.min(Math.max(0,+e.target.value), me.cash))}
            className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-2 text-content outline-none focus:border-gold/60" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => setStep('confirm')}>رجوع</Button>
        <Button block onClick={() => setStep('counter-confirm')}
          disabled={!ctrOfferC.length && !ctrReqC.length && !ctrOfferCash && !ctrReqCash}>
          ارسل العرض
        </Button>
      </div>
    </div>
  );

  // Original player sees the counter-offer — can only accept or decline
  if (step === 'counter-confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal/30 bg-teal/8 p-4 text-sm space-y-2">
        <p className="text-center text-xs text-muted mb-3">ديّ الموبايل لـ <strong className="text-content">{me.name}</strong></p>
        <p className="font-bold text-sand/80">{target.name} بيعرض:</p>
        {ctrOfferC.length > 0 && <p>🏙️ {ctrOfferC.map((id) => game.cities[id]?.name).filter(Boolean).join('، ')}</p>}
        {ctrOfferCash > 0 && <p>💰 {ctrOfferCash.toLocaleString('en-US')} جنيه</p>}
        {!ctrOfferC.length && !ctrOfferCash && <p className="text-muted">لا شيء</p>}
        <p className="font-bold text-sand/80 mt-2">{target.name} بيطلب:</p>
        {ctrReqC.length > 0 && <p>🏙️ {ctrReqC.map((id) => game.cities[id]?.name).filter(Boolean).join('، ')}</p>}
        {ctrReqCash > 0 && <p>💰 {ctrReqCash.toLocaleString('en-US')} جنيه</p>}
        {!ctrReqC.length && !ctrReqCash && <p className="text-muted">لا شيء</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="danger" block onClick={onClose}>لا يا عم</Button>
        {/* counter: target gives ctrOfferC+cash, receives ctrReqC+cash FROM me */}
        <Button block onClick={() => onTrade(target.id, ctrReqC, ctrReqCash, ctrOfferC, ctrOfferCash)}>موافق</Button>
      </div>
    </div>
  );

  return null;
}

// ─── BANKRUPTCY MODAL (live store hooks, sequential flow) ────────────────────

function BankruptcyModal({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const game = useMatchStore(selectGame);
  const takeSalfa    = useMatchStore((s) => s.takeSalfa);
  const sellCity     = useMatchStore((s) => s.sellCity);
  const bankruptPlayer = useMatchStore((s) => s.bankruptPlayer);
  const endTurn      = useMatchStore((s) => s.endTurn);

  const player = game?.players.find((p) => p.id === playerId);
  const ownedCities = game ? Object.values(game.cities).filter((c) => c.ownerId === playerId) : [];

  // Auto-close when player becomes solvent
  useEffect(() => {
    if (player && player.cash >= 0) onClose();
  }, [player?.cash, onClose]);

  if (!player || !game) return null;
  if (player.cash >= 0) return null;

  const canTakeSalfa = player.cash + SALFA_AMOUNT >= 0;
  const hasAnything  = canTakeSalfa || ownedCities.length > 0;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-5xl mb-1">😰</div>
        <h3 className="text-lg font-extrabold text-gold-sheen">محتاج فلوس!</h3>
        <p className="text-2xl font-extrabold text-danger tabular-nums">{player.cash.toLocaleString('en-US')} جنيه</p>
      </div>

      {/* Salfa — shown FIRST and prominently (spec: never force selling if salfa can solve) */}
      {canTakeSalfa && (
        <div className="rounded-2xl border-2 border-teal/40 bg-teal/10 p-3 space-y-1.5">
          <p className="text-xs font-bold text-teal">الحل الأسهل:</p>
          <Button block onClick={() => takeSalfa(playerId)}>
            💳 خد سلفة {SALFA_AMOUNT.toLocaleString('en-US')} من البنك
          </Button>
        </div>
      )}

      {/* Sell cities — shown second */}
      {ownedCities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-sand/80">بيع أملاكك بـ ٥٠٪:</p>
          {ownedCities.map((c) => (
            <button key={c.id}
              className="w-full flex items-center justify-between rounded-xl border border-border/70 bg-surface/60 px-3 py-2.5 text-sm hover:border-gold/50 transition-colors"
              onClick={() => sellCity(c.id)}>
              <span className="font-bold text-content">{c.name}</span>
              <span className="text-gold tabular-nums">+{Math.round(c.price * 0.5).toLocaleString('en-US')}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bankrupt — only when truly no options */}
      {!hasAnything && (
        <div className="text-center space-y-3">
          <p className="text-base font-bold text-muted">الدنيا قفلت معاك خالص 😭</p>
          <Button variant="danger" block onClick={() => { bankruptPlayer(playerId); onClose(); endTurn(); }}>
            إفلاس 💀
          </Button>
        </div>
      )}
    </div>
  );
}
