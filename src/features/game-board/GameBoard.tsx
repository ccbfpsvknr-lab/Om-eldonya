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
  if (index < side)        return { col: size - index,          row: size };
  if (index < 2 * side)    return { col: 1,                    row: size - (index - side) };
  if (index < 3 * side)    return { col: index - 2 * side + 1,  row: 1 };
  return                          { col: size,                  row: index - 3 * side + 1 };
}

/** Which edge of the tile faces inward (toward board center) */
function inwardEdge(index: number, boardLen: number): 'top' | 'right' | 'bottom' | 'left' | '' {
  const side = boardLen / 4;
  if (index % side === 0) return '';
  if (index < side)        return 'top';
  if (index < 2 * side)    return 'right';
  if (index < 3 * side)    return 'bottom';
  return 'left';
}

const EDGE_CLASS = {
  top:    'absolute top-0 left-0 right-0 h-[3px] z-10',
  bottom: 'absolute bottom-0 left-0 right-0 h-[3px] z-10',
  left:   'absolute top-0 left-0 bottom-0 w-[3px] z-10',
  right:  'absolute top-0 right-0 bottom-0 w-[3px] z-10',
  '':     'hidden',
} as const;

const TILE_BG: Record<string, string> = {
  ramses: 'bg-gold/30 border-gold/70',
  city:   'bg-surface/70 border-border/55',
  chance: 'bg-gold/12 border-gold/35',
  police: 'bg-danger/20 border-danger/50',
  jail:   'bg-clay/15 border-clay/40',
  rest:   'bg-teal/10 border-teal/30',
  tax:    'bg-clay/12 border-clay/35',
  news:   'bg-teal/10 border-teal/28',
  project:'bg-teal/14 border-teal/38',
};
const TILE_ICON: Record<string, string> = {
  ramses:'👑', city:'🏙️', chance:'🎴', police:'🚔', jail:'🔒', rest:'🌴', tax:'💸', news:'📰', project:'🏗️',
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function GameBoard() {
  const navigate   = useNavigate();
  const { confirm, open, close } = useModal();

  const game           = useMatchStore(selectGame);
  const cp             = useMatchStore(selectCurrentPlayer);
  const rollDice       = useMatchStore((s) => s.rollDice);
  const movePlayer     = useMatchStore((s) => s.moveCurrentPlayer);
  const endTurn        = useMatchStore((s) => s.endTurn);
  const buyCity        = useMatchStore((s) => s.buyCity);
  const payRent        = useMatchStore((s) => s.payRent);
  const upgradeCity    = useMatchStore((s) => s.upgradeCity);
  const sellCity       = useMatchStore((s) => s.sellCity);
  const goToJail       = useMatchStore((s) => s.goToJail);
  const resolveJailTurn    = useMatchStore((s) => s.resolveJailTurn);
  const markSkipTurn       = useMatchStore((s) => s.markSkipTurn);
  const decrementSkipTurns = useMatchStore((s) => s.decrementSkipTurns);
  const payTax         = useMatchStore((s) => s.payTax);
  const drawChance     = useMatchStore((s) => s.drawAndApplyChanceCard);
  const executeTrade   = useMatchStore((s) => s.executeTrade);
  const triggerNews    = useMatchStore((s) => s.triggerNewsEvent);
  const pendingNews    = useMatchStore((s) => s.pendingNewsEvent);
  const resetMatch     = useMatchStore((s) => s.resetMatch);
  const resetGame      = useGameStore((s) => s.resetGame);
  const resetPlayers   = usePlayersStore((s) => s.resetPlayers);
  const openModalCount = useModalStore((s) => s.stack.length);

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

  // ── Auto end turn in FAST mode ────────────────────────────────────────────
  useEffect(() => {
    if (game?.phase !== 'turn-end' || game.mode !== 'quick') return;
    if (openModalCount > 0 || rollAgainPending) return;
    const t = setTimeout(() => endTurn(), 700);
    return () => clearTimeout(t);
  }, [game?.phase, game?.mode, openModalCount, rollAgainPending, endTurn]);

  const handleQuit = async () => {
    const ok = await confirm({ title: 'إنهاء اللعبة', message: 'هتفقد اللعبة الحالية. متأكد؟', confirmLabel: 'اخرج', danger: true });
    if (ok) { resetMatch(); resetGame(); resetPlayers(); navigate(ROUTES.home); }
  };

  if (!game || !cp) return (
    <div className="flex h-[100dvh] items-center justify-center bg-bg">
      <Button onClick={() => navigate(ROUTES.home)}>الرئيسية</Button>
    </div>
  );

  const phase    = game.phase;
  const isInJail = cp.jailTurns > 0;
  const canRoll  = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !diceRolling && !isMoving;
  const canEnd   = phase === 'turn-end' && !isMoving && game.mode !== 'quick';
  const myCities = Object.values(game.cities).filter((c) => c.ownerId === cp.id);
  const canUpgradeAny = game.mode !== 'quick' && myCities.some((c) => canUpgrade(game, c, cp.id));
  const canTrade = game.mode !== 'quick' && !game.tradeUsedThisTurn && game.players.filter((p) => p.isActive).length > 1;

  // Board visual maps
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

  // Leaderboard: sorted by cash descending
  const sortedPlayers = [...game.players].sort((a, b) => b.cash - a.cash);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = useCallback((content: ReactNode, ms = 2400) => {
    const id = open(content, { hideClose: true, size: 'sm', dismissable: true });
    setTimeout(() => close(id), ms);
  }, [open, close]);

  const checkInsolvency = useCallback((playerId: string) => {
    const p = useMatchStore.getState().game?.players.find((pl) => pl.id === playerId);
    if (!p || p.cash >= 0) return;
    const bid = open(
      <BankruptcyModal playerId={playerId} onClose={() => close(bid)} />,
      { title: 'محتاج فلوس! 😰', size: 'md', dismissable: false, hideClose: true }
    );
  }, [open, close]);

  // ── Landing resolution ────────────────────────────────────────────────────
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
                showToast(<div className="text-center"><div className="text-4xl mb-2">🏆</div><h3 className="text-xl text-gold-sheen">كمّلت المنطقة!</h3><p className="text-sm text-content mt-1">الإيجار بقى الضعف</p></div>);
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
          showToast(<div className="text-center"><div className="text-4xl mb-2">💸</div><h3 className="text-xl text-gold-sheen">دفعت إيجار</h3><p className="mt-2 text-sm text-content">في «{city.name}» لـ <strong>{owner?.name}</strong></p><p className="mt-1 text-lg font-extrabold text-clay">−{tx.amount.toLocaleString('en-US')} جنيه</p></div>);
          checkInsolvency(player.id);
        }
      }
    } else if (tile.type === 'police') {
      goToJail(player.id);
      const pid = open(
        <div className="text-center space-y-5">
          <div className="text-8xl">🚔</div>
          <h2 className="text-4xl font-extrabold text-gold-sheen">كلابوووش!</h2>
          <p className="text-muted">روح السجن!</p>
          <Button block size="lg" onClick={() => close(pid)}>حاضر يا باشا 🫡</Button>
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
            <p className={cn('text-xl font-extrabold', card.amount > 0 ? 'text-gold' : 'text-clay')}>
              {card.amount > 0 ? '+' : ''}{card.amount.toLocaleString('en-US')} جنيه
            </p>
          )}
          <Button block size="lg" onClick={() => {
            close(cid);
            if (card.skipNextTurn) {
              // Mark NEXT turn as skipped; current turn continues normally
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
      showToast(<div className="text-center"><div className="text-4xl mb-2">💸</div><h3 className="text-xl text-gold-sheen">ضرائب!</h3><p className="text-sm text-muted mt-1">دفعت للحكومة</p><p className="font-extrabold text-clay">−{paid.toLocaleString('en-US')} جنيه</p></div>);
      checkInsolvency(player.id);
    }
  }, [open, close, buyCity, payRent, payTax, goToJail, drawChance, movePlayer, showToast, checkInsolvency, endTurn, game]);

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
          setAnimPos(null); setSmokePos(null); setIsMoving(false);
          if (salary > 0) showToast(<div className="text-center"><div className="text-5xl mb-2">💰</div><h3 className="text-2xl text-gold-sheen">قبضت مرتبك</h3><p className="text-xl font-extrabold text-gold mt-1">+{salary.toLocaleString('en-US')} جنيه</p></div>);
          resolveLanding();
        }, 150);
      }
    }, 200);
  }, [resolveLanding, showToast]);

  // ── Unified roll handler (normal + jail) ──────────────────────────────────
  const handleRoll = useCallback(() => {
    if (diceRolling || isMoving || (!canRoll && !isInJail)) return;
    const g = useMatchStore.getState().game;
    const before = g?.players[g.currentPlayerIndex];
    if (!before) return;

    setDiceRolling(true);
    setRollAgainPending(false);

    // For normal turns, commit the roll to the store immediately
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
          // New jail rule: always pay (2% on 6, 4% on other), always freed
          const fee = resolveJailTurn(rollValue);
          const feeLabel = rollValue === 6
            ? `رميت ٦! ادفع ${fee.toLocaleString('en-US')} بس (٢٪)`
            : `ادفع ${fee.toLocaleString('en-US')} علشان تطلع (٤٪)`;
          showToast(
            <div className="text-center">
              <div className="text-4xl mb-2">{rollValue === 6 ? '🍀' : '😅'}</div>
              <h3 className="text-xl text-gold-sheen">رميت {rollValue}</h3>
              <p className="text-sm text-content mt-1">{feeLabel}</p>
              <p className="text-sm font-bold text-teal mt-1">طلعت من السجن ✓</p>
            </div>,
            2000
          );
          checkInsolvency(before.id);
          // Move from jail tile
          movePlayer(rollValue);
          animateAndMove(before.position, rollValue, g!.board.length, 0);
        } else {
          const cashBefore = before.cash;
          // movePlayer was already called via rollDice → phase is now moving → call again only to compute
          // Actually rollDice only sets phase to 'moving', movePlayer sets position+salary
          movePlayer(rollValue);
          const after = useMatchStore.getState().game?.players[g!.currentPlayerIndex];
          const salary = Math.max(0, (after?.cash ?? cashBefore) - cashBefore);
          animateAndMove(before.position, rollValue, g!.board.length, salary);
        }
      }, 400);
    }, 850);
  }, [diceRolling, isMoving, canRoll, isInJail, rollDice, movePlayer, resolveJailTurn, animateAndMove, showToast, checkInsolvency]);

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    const uid = open(
      <UpgradeModal cities={myCities} playerId={cp.id} onUpgrade={(id) => upgradeCity(id)} onClose={() => close(uid)} />,
      { title: 'ترقية المدن 🏗️', size: 'md' }
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
      { title: 'التداول 🤝', size: 'lg' }
    );
  };

  const handleEndTurn = () => {
    setLastRoll(null); setRollAgainPending(false);
    endTurn();
  };

  // ── Board dimensions ──────────────────────────────────────────────────────
  const tilesPerSide = game.board.length / 4;
  const gridSize     = tilesPerSide + 1;
  const gridCols     = `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`;
  const gridRows     = `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`;

  // Dice button label
  const diceLabel = diceRolling
    ? (diceDisplay ? String(diceDisplay) : '?')
    : lastRoll !== null
      ? `🎲 ${lastRoll}`
      : isInJail
        ? '🎲 ارمي (السجن)'
        : '🎲 ارمي الزهر';

  const canDiceRoll = canRoll || isInJail;

  return (
    <div dir="rtl" className="flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-bg">
      {/* Board fills the smaller dimension (square) */}
      <div
        style={{ width: 'min(100dvw, 100dvh)', height: 'min(100dvw, 100dvh)', padding: '4px' }}
        className="relative"
      >
        {/* Outer gold border */}
        <div
          className="relative w-full h-full rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgb(14 23 38), rgb(22 34 58))',
            boxShadow: '0 0 0 2px rgb(224 180 60 / 0.7), 0 0 0 4px rgb(14 23 38), 0 0 40px rgb(224 180 60 / 0.15)',
            padding: '2px',
          }}
        >
          {/* Board grid */}
          <div
            className="w-full h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              gap: '1px',
              background: 'rgb(30 45 74 / 0.6)',
            }}
          >
            {/* Perimeter tiles */}
            {game.board.map((tile) => {
              const { col, row } = getTileGridPos(tile.index, game.board.length);
              const isCurrent    = tile.index === cpVisualPos;
              const occupants    = occupantsByTile.get(tile.index) ?? [];
              const ownerColor   = ownerColorByTile.get(tile.index);
              const edge         = inwardEdge(tile.index, game.board.length);
              const upgradeLevel = tile.cityId ? (game.cities[tile.cityId]?.level ?? 0) : 0;
              const hasSmoke     = tile.index === smokePos && isMoving;
              const cpJailedHere = tile.type === 'jail' && cp.position === tile.index && cp.jailTurns > 0 && !animPos;
              const isCorner     = tile.index % tilesPerSide === 0;

              return (
                <div
                  key={tile.index}
                  className={cn(
                    'relative flex flex-col items-center overflow-hidden border',
                    TILE_BG[tile.type] ?? 'bg-surface/60 border-border/50',
                    isCurrent && 'animate-tile-ping z-10',
                  )}
                  style={{ gridColumn: col, gridRow: row }}
                >
                  {/* Inward-facing owner stripe */}
                  {ownerColor && edge && (
                    <div className={EDGE_CLASS[edge]} style={{ background: ownerColor }} />
                  )}
                  {/* Upgrade dots */}
                  {upgradeLevel > 0 && (
                    <div className="absolute top-0.5 left-0.5 flex gap-[1px]">
                      {Array.from({ length: upgradeLevel }).map((_, i) => (
                        <div key={i} className="h-[4px] w-[4px] rounded-full bg-gold" />
                      ))}
                    </div>
                  )}
                  {/* Tile index */}
                  <div className="absolute top-0 right-[1px] text-[5px] font-mono text-muted/40 leading-none">{tile.index}</div>

                  {/* Smoke trail */}
                  {hasSmoke && (
                    <div className="animate-smoke-out absolute inset-0 flex items-center justify-center text-[14px] pointer-events-none z-20">💨</div>
                  )}

                  {/* Main content */}
                  <div className="flex flex-1 items-center justify-center">
                    {occupants.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-[1px]">
                        {occupants.map((o) => (
                          <span key={o.id}
                            className={cn('leading-none', isCurrent && o.id === cp.id ? 'text-[13px] animate-vehicle-land' : 'text-[11px]')}>
                            {o.vehicle}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="opacity-70" style={{ fontSize: isCorner ? '14px' : '11px' }}>
                        {cpJailedHere ? '🔒' : (TILE_ICON[tile.type] ?? '□')}
                      </span>
                    )}
                  </div>

                  {/* Tile name */}
                  <div className="w-full px-[1px] pb-[1px] text-center font-bold text-content leading-none truncate"
                    style={{ fontSize: isCorner ? '7px' : '6px' }}>
                    {cpJailedHere ? 'مسجون' : tile.name}
                  </div>
                </div>
              );
            })}

            {/* ─── CENTER AREA ─── */}
            <div
              className="flex flex-col gap-1 p-1.5 overflow-hidden"
              style={{
                gridColumn: `2 / ${gridSize}`,
                gridRow: `2 / ${gridSize}`,
                background: 'rgb(10 16 28 / 0.92)',
              }}
            >
              {/* Quit button */}
              <div className="flex justify-between items-center">
                <button onClick={handleQuit} className="text-[8px] text-muted/60 hover:text-danger transition-colors">✕</button>
                <div className="flex gap-1">
                  {game.activeNewsEvent && <Badge tone="clay" className="text-[7px]">📰</Badge>}
                  <Badge tone="teal" className="text-[7px]">ج{game.round}</Badge>
                </div>
              </div>

              {/* ── Box 1: Current player + Dice ── */}
              <div className="rounded-lg border border-gold/30 bg-surface/70 p-1.5 space-y-1 flex-shrink-0">
                {/* Player row */}
                <div className="flex items-center gap-1">
                  <span style={{ fontSize: '14px' }}>{cp.vehicle}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-content truncate leading-none" style={{ fontSize: '9px' }}>{cp.name}</p>
                    <p className="text-muted leading-none" style={{ fontSize: '7px' }}>
                      {isInJail ? '🔒 مسجون' : `خانة ${cpVisualPos}`}
                      {cp.solfaDebt > 0 ? ` · سلفة` : ''}
                    </p>
                  </div>
                  <p className={cn('font-extrabold tabular-nums leading-none', cp.cash < 0 ? 'text-danger' : 'text-gold')}
                    style={{ fontSize: '10px' }}>
                    {cp.cash.toLocaleString('en-US')}
                  </p>
                </div>

                {/* My cities */}
                {myCities.length > 0 && (
                  <div className="flex flex-wrap gap-[2px]">
                    {myCities.map((c) => (
                      <span key={c.id} className="rounded-full border border-border/50 bg-surface-2/60 px-1 font-bold text-content leading-none"
                        style={{ fontSize: '6px', paddingTop: '1px', paddingBottom: '1px' }}>
                        {c.name}{c.level > 0 ? ` ${'⭐'.repeat(c.level)}` : ''}
                      </span>
                    ))}
                  </div>
                )}

                {/* Merged dice button */}
                <button
                  onClick={handleRoll}
                  disabled={!canDiceRoll || isMoving}
                  className={cn(
                    'w-full rounded-md border font-extrabold leading-none transition-all',
                    'disabled:opacity-40 disabled:pointer-events-none',
                    diceRolling
                      ? 'animate-dice-shake border-gold/60 bg-gold/20 text-gold'
                      : lastRoll !== null
                        ? 'border-gold/50 bg-gold/10 text-gold-sheen'
                        : canDiceRoll
                          ? 'border-gold/70 bg-gold/20 text-gold hover:bg-gold/30 active:scale-95'
                          : 'border-border/40 text-muted',
                  )}
                  style={{ padding: '5px 4px', fontSize: '11px' }}
                >
                  {diceLabel}
                </button>

                {/* Action buttons */}
                {(canEnd || canUpgradeAny || canTrade) && (
                  <div className="flex gap-1">
                    {canUpgradeAny && (
                      <button onClick={openUpgradeModal}
                        className="flex-1 rounded border border-teal/50 bg-teal/10 text-teal font-bold leading-none hover:bg-teal/20 transition-colors"
                        style={{ padding: '3px', fontSize: '8px' }}>
                        🏗️ رقّي
                      </button>
                    )}
                    {canTrade && (
                      <button onClick={openTradeModal}
                        className="flex-1 rounded border border-border/50 bg-surface/60 text-content font-bold leading-none hover:border-gold/40 transition-colors"
                        style={{ padding: '3px', fontSize: '8px' }}>
                        🤝 تداول
                      </button>
                    )}
                    {canEnd && (
                      <button onClick={handleEndTurn}
                        className="flex-1 rounded border border-gold/50 bg-gold/15 text-gold font-bold leading-none hover:bg-gold/25 transition-colors"
                        style={{ padding: '3px', fontSize: '8px' }}>
                        إنهاء ←
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* ── Box 2: Leaderboard (sorted by cash) ── */}
              <div className="rounded-lg border border-border/30 bg-surface/50 p-1.5 flex-1 min-h-0 overflow-hidden">
                <p className="text-muted leading-none mb-1" style={{ fontSize: '7px' }}>الترتيب</p>
                <div className="space-y-[3px]">
                  {sortedPlayers.map((p, i) => (
                    <div key={p.id} className={cn(
                      'flex items-center gap-1 rounded px-1',
                      p.id === cp.id ? 'bg-gold/10' : '',
                      !p.isActive ? 'opacity-40' : '',
                    )}>
                      <span className="text-muted leading-none w-2" style={{ fontSize: '7px' }}>{i + 1}</span>
                      <span style={{ fontSize: '10px' }}>{p.vehicle}</span>
                      <span className="flex-1 truncate font-bold text-content leading-none" style={{ fontSize: '8px' }}>{p.name}</span>
                      {p.jailTurns > 0 && <span style={{ fontSize: '8px' }}>🔒</span>}
                      <span className={cn('tabular-nums font-bold leading-none', p.cash < 0 ? 'text-danger' : 'text-gold')}
                        style={{ fontSize: '8px' }}>
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
  );
}

// ─── CITY BUY MODAL ───────────────────────────────────────────────────────────
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
          <Button block size="lg" onClick={onBuy}>اشتري</Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-lg font-bold text-danger leading-relaxed">معاكش فلوس يا فقير<br />شوف انت رايح فين 😂</p>
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
  const game   = useMatchStore(selectGame);
  const player = game?.players.find((p) => p.id === playerId);
  if (!game) return null;
  const upgradeable = cities.filter((c) => canUpgrade(game, game.cities[c.id] ?? c, playerId));
  return (
    <div className="space-y-3">
      {upgradeable.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">لازم تكمّل المنطقة الأول</p>
      ) : upgradeable.map((city) => {
        const live = game.cities[city.id] ?? city;
        const cost = getUpgradeCost(live);
        return (
          <div key={city.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-surface/70 p-3">
            <div>
              <p className="font-bold text-content">{city.name}</p>
              <p className="text-xs text-muted">{'⭐'.repeat(live.level) || '—'} → {'⭐'.repeat(live.level + 1)} · {cost.toLocaleString('en-US')}</p>
            </div>
            <Button size="sm" disabled={(player?.cash ?? 0) < cost || live.level >= MAX_UPGRADE_LEVEL}
              onClick={() => onUpgrade(city.id)}>
              {live.level >= MAX_UPGRADE_LEVEL ? 'ماكس' : (player?.cash ?? 0) < cost ? 'مش عندك' : 'رقّي'}
            </Button>
          </div>
        );
      })}
      <Button variant="ghost" block onClick={onClose}>خلاص</Button>
    </div>
  );
}

// ─── TRADE MODAL ─────────────────────────────────────────────────────────────
type TradeStep = 'pick' | 'configure' | 'confirm' | 'counter-configure' | 'counter-confirm';
function TradeModal({ currentPlayerId, partners, onTrade, onClose }: {
  currentPlayerId: string; partners: Player[];
  onTrade: (toId: string, oC: string[], oX: number, rC: string[], rX: number) => void;
  onClose: () => void;
}) {
  const game = useMatchStore(selectGame)!;
  const [step, setStep]   = useState<TradeStep>('pick');
  const [target, setTarget] = useState<Player | null>(null);
  const [offerC, setOfferC] = useState<string[]>([]);
  const [reqC,   setReqC]   = useState<string[]>([]);
  const [offerX, setOfferX] = useState(0);
  const [reqX,   setReqX]   = useState(0);
  const [ctrOC, setCtrOC]   = useState<string[]>([]);
  const [ctrRC, setCtrRC]   = useState<string[]>([]);
  const [ctrOX, setCtrOX]   = useState(0);
  const [ctrRX, setCtrRX]   = useState(0);
  const me = game.players.find((p) => p.id === currentPlayerId)!;
  const them = target ? game.players.find((p) => p.id === target.id) : null;
  const myC   = Object.values(game.cities).filter((c) => c.ownerId === currentPlayerId);
  const theirC = target ? Object.values(game.cities).filter((c) => c.ownerId === target.id) : [];
  const tog = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);
  if (step === 'pick') return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted">اختار لاعب</p>
      {partners.map((p) => (
        <button key={p.id} onClick={() => { setTarget(p); setStep('configure'); }}
          className="w-full flex items-center gap-3 rounded-2xl border border-border/70 bg-surface/60 p-3 text-right hover:border-gold/50">
          <span className="text-2xl">{p.vehicle}</span>
          <span className="flex-1 font-bold text-content">{p.name}</span>
          <span className="text-sm text-gold tabular-nums">{p.cash.toLocaleString('en-US')}</span>
        </button>
      ))}
      <Button variant="ghost" block onClick={onClose}>إلغاء</Button>
    </div>
  );
  const CityPicker = ({ label, cities, sel, setSel, cash, setCash, max, color }: { label: string; cities: typeof myC; sel: string[]; setSel: (v:string[])=>void; cash: number; setCash: (v:number)=>void; max: number; color: string }) => (
    <div className="space-y-1.5">
      <p className="font-bold text-sand/80 text-sm">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {cities.map((c) => <button key={c.id} onClick={() => tog(sel, setSel, c.id)}
          className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', sel.includes(c.id) ? `border-current bg-current/20 ${color}` : 'border-border/70 bg-surface/60 text-muted')}>{c.name}</button>)}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="shrink-0 text-muted">فلوس:</span>
        <input type="number" min={0} max={max} step={100} value={cash}
          onChange={(e) => setCash(Math.min(Math.max(0,+e.target.value),max))}
          className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-1.5 text-content outline-none focus:border-gold/60" />
      </div>
    </div>
  );
  if (step === 'configure' && target) return (
    <div className="space-y-4">
      <CityPicker label={`بتعرض (${me.name}):`} cities={myC} sel={offerC} setSel={setOfferC} cash={offerX} setCash={setOfferX} max={me.cash} color="text-gold" />
      <CityPicker label={`بتطلب من (${target.name}):`} cities={theirC} sel={reqC} setSel={setReqC} cash={reqX} setCash={setReqX} max={them?.cash??0} color="text-teal" />
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => setStep('pick')}>رجوع</Button>
        <Button block onClick={() => setStep('confirm')} disabled={!offerC.length&&!reqC.length&&!offerX&&!reqX}>عرض</Button>
      </div>
    </div>
  );
  const Summary = ({ title, cIds, cash }: { title: string; cIds: string[]; cash: number }) => (
    <div><p className="font-bold text-sand/80 text-sm">{title}</p>
      {cIds.length>0&&<p className="text-sm">🏙️ {cIds.map(id=>game.cities[id]?.name).join('، ')}</p>}
      {cash>0&&<p className="text-sm">💰 {cash.toLocaleString('en-US')} جنيه</p>}
      {!cIds.length&&!cash&&<p className="text-sm text-muted">لا شيء</p>}
    </div>
  );
  if (step === 'confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 space-y-2">
        <p className="text-center text-xs text-muted">ديّ الموبايل لـ <strong className="text-content">{target.name}</strong></p>
        <Summary title={`${me.name} بيعرض:`} cIds={offerC} cash={offerX} />
        <Summary title={`${me.name} بيطلب:`} cIds={reqC} cash={reqX} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="danger" size="sm" onClick={onClose}>لا يا عم</Button>
        <Button variant="secondary" size="sm" onClick={() => setStep('counter-configure')}>هفاصل</Button>
        <Button size="sm" onClick={() => onTrade(target.id, offerC, offerX, reqC, reqX)}>موافق</Button>
      </div>
    </div>
  );
  if (step === 'counter-configure' && target && them) return (
    <div className="space-y-3">
      <p className="text-center text-xs font-bold text-content">{target.name} — عرض مضاد</p>
      <CityPicker label={`بتعرض (${target.name}):`} cities={theirC} sel={ctrOC} setSel={setCtrOC} cash={ctrOX} setCash={setCtrOX} max={them.cash} color="text-gold" />
      <CityPicker label={`بتطلب من ${me.name}:`} cities={myC} sel={ctrRC} setSel={setCtrRC} cash={ctrRX} setCash={setCtrRX} max={me.cash} color="text-teal" />
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => setStep('confirm')}>رجوع</Button>
        <Button block onClick={() => setStep('counter-confirm')} disabled={!ctrOC.length&&!ctrRC.length&&!ctrOX&&!ctrRX}>ارسل</Button>
      </div>
    </div>
  );
  if (step === 'counter-confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4 space-y-2">
        <p className="text-center text-xs text-muted">ديّ الموبايل لـ <strong className="text-content">{me.name}</strong></p>
        <Summary title={`${target.name} بيعرض:`} cIds={ctrOC} cash={ctrOX} />
        <Summary title={`${target.name} بيطلب:`} cIds={ctrRC} cash={ctrRX} />
      </div>
      <div className="flex gap-2">
        <Button variant="danger" block onClick={onClose}>لا يا عم</Button>
        <Button block onClick={() => onTrade(target.id, ctrRC, ctrRX, ctrOC, ctrOX)}>موافق</Button>
      </div>
    </div>
  );
  return null;
}

// ─── BANKRUPTCY MODAL ─────────────────────────────────────────────────────────
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
  const hasOptions = canTakeSalfa || ownedCities.length > 0;
  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="text-5xl mb-1">😰</div>
        <h3 className="text-lg font-extrabold text-gold-sheen">محتاج فلوس!</h3>
        <p className="text-2xl font-extrabold text-danger tabular-nums">{player.cash.toLocaleString('en-US')} جنيه</p>
      </div>
      {canTakeSalfa && (
        <div className="rounded-2xl border-2 border-teal/40 bg-teal/10 p-3 space-y-1.5">
          <p className="text-xs font-bold text-teal">الحل الأسهل:</p>
          <Button block onClick={() => takeSalfa(playerId)}>💳 خد سلفة {SALFA_AMOUNT.toLocaleString('en-US')} من البنك</Button>
        </div>
      )}
      {ownedCities.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold text-sand/80">بيع أملاكك بـ ٥٠٪:</p>
          {ownedCities.map((c) => (
            <button key={c.id} onClick={() => sellCity(c.id)}
              className="w-full flex items-center justify-between rounded-xl border border-border/70 bg-surface/60 px-3 py-2.5 text-sm hover:border-gold/50">
              <span className="font-bold text-content">{c.name}</span>
              <span className="text-gold tabular-nums">+{Math.round(c.price * 0.5).toLocaleString('en-US')}</span>
            </button>
          ))}
        </div>
      )}
      {!hasOptions && (
        <div className="text-center space-y-3">
          <p className="text-base font-bold text-muted">الدنيا قفلت معاك خالص 😭</p>
          <Button variant="danger" block onClick={() => { bankruptPlayer(playerId); onClose(); endTurn(); }}>إفلاس 💀</Button>
        </div>
      )}
    </div>
  );
}
