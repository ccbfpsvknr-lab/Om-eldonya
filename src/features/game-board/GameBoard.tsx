import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Badge } from '@/components/ui';
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
import type { City, Player } from '@/game/types';

// ─── BOARD GEOMETRY ───────────────────────────────────────────────────────────

function getTileGridPos(index: number, boardLen: number) {
  const side = boardLen / 4;
  const size = side + 1;
  if (index < side)          return { col: size - index,         row: size };
  if (index < 2 * side)      return { col: 1,                   row: size - (index - side) };
  if (index < 3 * side)      return { col: index - 2 * side + 1, row: 1 };
  return                            { col: size,                 row: index - 3 * side + 1 };
}

function isCornerTile(index: number, boardLen: number) {
  return index % (boardLen / 4) === 0;
}

// ─── TILE STYLES ──────────────────────────────────────────────────────────────

const TILE_BG: Record<string, string> = {
  ramses:  'bg-gradient-to-br from-gold/40 to-gold/20 border-gold/70',
  city:    'bg-surface/70 border-border/50',
  project: 'bg-teal/15 border-teal/40',
  chance:  'bg-gold/15 border-gold/35',
  news:    'bg-teal/10 border-teal/30',
  tax:     'bg-clay/15 border-clay/40',
  police:  'bg-danger/20 border-danger/50',
  jail:    'bg-clay/15 border-clay/40',
  rest:    'bg-teal/12 border-teal/30',
};

const TILE_ICON: Record<string, string> = {
  ramses: '👑', city: '🏙️', project: '🏗️', chance: '🎴',
  news: '📰', tax: '💸', police: '🚔', jail: '🔒', rest: '🌴',
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function GameBoard() {
  const navigate  = useNavigate();
  const { confirm, open, close } = useModal();

  const game         = useMatchStore(selectGame);
  const cp           = useMatchStore(selectCurrentPlayer);
  const rollDice     = useMatchStore((s) => s.rollDice);
  const movePlayer   = useMatchStore((s) => s.moveCurrentPlayer);
  const endTurn      = useMatchStore((s) => s.endTurn);
  const buyCity      = useMatchStore((s) => s.buyCity);
  const payRent      = useMatchStore((s) => s.payRent);
  const upgradeCity  = useMatchStore((s) => s.upgradeCity);
  const sellCity     = useMatchStore((s) => s.sellCity);
  const goToJail     = useMatchStore((s) => s.goToJail);
  const releaseFromJail     = useMatchStore((s) => s.releaseFromJail);
  const decrementJailTurns  = useMatchStore((s) => s.decrementJailTurns);
  const payTax       = useMatchStore((s) => s.payTax);
  const drawChance   = useMatchStore((s) => s.drawAndApplyChanceCard);
  const executeTrade = useMatchStore((s) => s.executeTrade);
  const triggerNews  = useMatchStore((s) => s.triggerNewsEvent);
  const pendingNews  = useMatchStore((s) => s.pendingNewsEvent);
  const resetMatch   = useMatchStore((s) => s.resetMatch);
  const resetGame    = useGameStore((s) => s.resetGame);
  const resetPlayers = usePlayersStore((s) => s.resetPlayers);

  // Animation states
  const [diceRolling, setDiceRolling]   = useState(false);
  const [diceDisplay, setDiceDisplay]   = useState<number | null>(null);
  const [animPos, setAnimPos]           = useState<number | null>(null);
  const [smokePos, setSmokePos]         = useState<number | null>(null);
  const smokeClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isMoving, setIsMoving]         = useState(false);
  const [lastRoll, setLastRoll]         = useState<number | null>(null);
  const [fromPos, setFromPos]           = useState<number | null>(null);
  const [rollAgainPending, setRollAgainPending] = useState(false);
  const diceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const moveRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (diceRef.current)   clearInterval(diceRef.current);
    if (moveRef.current)   clearInterval(moveRef.current);
    if (smokeClearRef.current) clearTimeout(smokeClearRef.current);
  }, []);

  // News events
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
        {ev.cash !== 0 && (
          <p className={cn('font-extrabold', ev.cash > 0 ? 'text-gold' : 'text-clay')}>
            {ev.cash > 0 ? '+' : ''}{ev.cash} جنيه لكل لاعب
          </p>
        )}
        <Button block onClick={() => close(nid)}>فهمت</Button>
      </div>,
      { size: 'sm', hideClose: true }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingNews]);

  // Winner navigation
  useEffect(() => {
    if (game?.phase === 'finished') {
      const t = setTimeout(() => navigate(ROUTES.winner), 900);
      return () => clearTimeout(t);
    }
  }, [game?.phase, navigate]);

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
  const canRoll  = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !isInJail && !diceRolling && !isMoving;
  const canEnd   = phase === 'turn-end' && !isMoving;
  const myCities = Object.values(game.cities).filter((c) => c.ownerId === cp.id);
  const canUpgradeAny = game.mode !== 'quick' && myCities.some((c) => canUpgrade(game, c, cp.id));
  const canTrade = game.mode !== 'quick' && !game.tradeUsedThisTurn && game.players.filter((p) => p.isActive).length > 1;

  // Board visuals — use animPos for current player's visual position
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
  const cpVisualPos = animPos !== null ? animPos : cp.position;

  // ── Toast ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((content: ReactNode, ms = 2400) => {
    const id = open(content, { hideClose: true, size: 'sm', dismissable: true });
    setTimeout(() => close(id), ms);
  }, [open, close]);

  // ── Insolvency ────────────────────────────────────────────────────────────
  const checkInsolvency = useCallback((playerId: string) => {
    const p = useMatchStore.getState().game?.players.find((pl) => pl.id === playerId);
    if (!p || p.cash >= 0) return;
    const bid = open(
      <BankruptcyModal playerId={playerId} onClose={() => close(bid)} />,
      { title: 'محتاج فلوس! 😰', size: 'md', dismissable: false, hideClose: true }
    );
  }, [open, close]);

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
                showToast(<div className="text-center"><div className="text-4xl mb-2">🏆</div><h3 className="text-xl text-gold-sheen">كمّلت المنطقة!</h3><p className="mt-1 text-sm text-content">الإيجار بقى الضعف</p></div>);
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
          <p className="text-base text-muted">روح السجن على طول!</p>
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
      showToast(<div className="text-center"><div className="text-4xl mb-2">💸</div><h3 className="text-xl text-gold-sheen">ضرائب!</h3><p className="mt-1 text-sm text-muted">دفعت للحكومة</p><p className="mt-1 font-extrabold text-clay">−{paid.toLocaleString('en-US')} جنيه</p></div>);
      checkInsolvency(player.id);
    }
  }, [open, close, buyCity, payRent, payTax, goToJail, drawChance, movePlayer, showToast, checkInsolvency, game]);

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
      smokeClearRef.current = setTimeout(() => setSmokePos(null), 380);
      lastPos = nextPos;
      setAnimPos(nextPos);
      if (step >= steps) {
        clearInterval(moveRef.current!);
        setTimeout(() => {
          setAnimPos(null);
          setSmokePos(null);
          setIsMoving(false);
          if (salary > 0) {
            showToast(<div className="text-center"><div className="text-5xl mb-2">💰</div><h3 className="text-2xl text-gold-sheen">قبضت مرتبك</h3><p className="text-xl font-extrabold text-gold mt-1">+{salary.toLocaleString('en-US')} جنيه</p></div>);
          }
          resolveLanding();
        }, 150);
      }
    }, 200);
  }, [resolveLanding, showToast]);

  // ── Roll handler ──────────────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (diceRolling || isMoving) return;
    const g = useMatchStore.getState().game;
    const before = g?.players[g.currentPlayerIndex];
    if (!before) return;
    setFromPos(before.position);
    setDiceRolling(true);
    setRollAgainPending(false);
    const value = rollDice();
    if (!value) { setDiceRolling(false); return; }
    diceRef.current = setInterval(() => setDiceDisplay(Math.ceil(Math.random() * 6)), 80);
    setTimeout(() => {
      clearInterval(diceRef.current!);
      setDiceDisplay(value);
      setDiceRolling(false);
      setTimeout(() => {
        const cashBefore = before.cash;
        movePlayer(value);
        const after = useMatchStore.getState().game?.players[g.currentPlayerIndex];
        const salary = Math.max(0, (after?.cash ?? cashBefore) - cashBefore);
        setLastRoll(value);
        animateAndMove(before.position, value, g.board.length, salary);
      }, 400);
    }, 850);
  }, [diceRolling, isMoving, rollDice, movePlayer, animateAndMove]);

  // ── Jail modal ────────────────────────────────────────────────────────────
  const openJailModal = () => {
    const isFast = game.mode === 'quick';
    const jid = open(
      <JailModal playerId={cp.id} isFast={isFast}
        onRoll={() => {
          close(jid);
          setDiceRolling(true);
          diceRef.current = setInterval(() => setDiceDisplay(Math.ceil(Math.random() * 6)), 80);
          setTimeout(() => {
            clearInterval(diceRef.current!);
            const val = Math.ceil(Math.random() * 6);
            setDiceDisplay(val);
            setDiceRolling(false);
            setLastRoll(val);
            setTimeout(() => {
              const g = useMatchStore.getState().game;
              const player = g?.players.find((p) => p.id === cp.id);
              if (!player || !g) return;
              if (val === 6) {
                releaseFromJail(cp.id, false);
                movePlayer(val);
                animateAndMove(player.position, val, g.board.length, 0);
              } else {
                if (isFast) releaseFromJail(cp.id, false);
                else decrementJailTurns(cp.id);
                endTurn();
              }
            }, 400);
          }, 850);
        }}
        onPay={() => {
          close(jid);
          releaseFromJail(cp.id, true);
          const updated = useMatchStore.getState().game?.players.find((p) => p.id === cp.id);
          if (updated && updated.cash < 0) checkInsolvency(cp.id);
        }}
        onSkip={() => { close(jid); decrementJailTurns(cp.id); endTurn(); }}
      />,
      { title: '🔒 في السجن', size: 'sm', dismissable: false, hideClose: true }
    );
  };

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    const uid = open(
      <UpgradeModal cities={myCities} playerId={cp.id}
        onUpgrade={(id) => upgradeCity(id)}
        onClose={() => close(uid)}
      />,
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
    setLastRoll(null); setFromPos(null); setRollAgainPending(false);
    endTurn();
  };

  // ── RENDER ────────────────────────────────────────────────────────────────
  const tilesPerSide = game.board.length / 4;
  const gridSize     = tilesPerSide + 1;

  return (
    <div
      dir="rtl"
      className="flex h-[100dvh] overflow-hidden bg-bg"
      style={{ flexDirection: 'row' }}
    >
      {/* ═══ BOARD (left) ═══ */}
      <div
        className="relative flex-shrink-0"
        style={{ width: 'min(55vw, 100dvh)', height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '6px' }}
      >
        {/* Decorative border */}
        <div
          className="relative w-full aspect-square rounded-lg overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, rgb(14 23 38), rgb(22 34 58))',
            boxShadow: '0 0 0 3px rgb(224 180 60 / 0.6), 0 0 0 5px rgb(22 34 58), 0 0 30px rgb(224 180 60 / 0.2)',
            padding: '3px',
          }}
        >
          {/* Inner board grid */}
          <div
            className="relative w-full h-full"
            style={{
              display: 'grid',
              gridTemplateColumns: `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`,
              gridTemplateRows: `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`,
              gap: '1px',
              background: 'rgb(56 74 110 / 0.5)',
            }}
          >
            {/* Board tiles */}
            {game.board.map((tile) => {
              const { col, row } = getTileGridPos(tile.index, game.board.length);
              const isCorner = isCornerTile(tile.index, game.board.length);
              const occupants = occupantsByTile.get(tile.index) ?? [];
              const ownerColor = ownerColorByTile.get(tile.index);
              const upgradeLevel = tile.cityId ? (game.cities[tile.cityId]?.level ?? 0) : 0;
              const isCurrent   = tile.index === cpVisualPos;
              const hasSmokeHere = tile.index === smokePos && isMoving;
              // Jail: current player is imprisoned on this tile
              const cpIsJailed = tile.type === 'jail' && cp.position === tile.index && cp.jailTurns > 0 && animPos === null;
              // Any player imprisoned here
              const isJailOccupied = tile.type === 'jail' && occupants.some(o => o.jailTurns > 0);

              return (
                <div
                  key={tile.index}
                  className={cn(
                    'relative flex flex-col items-center justify-between overflow-hidden border',
                    TILE_BG[tile.type] ?? 'bg-surface/60 border-border/50',
                    isCurrent && 'animate-tile-ping z-10',
                    isCorner && 'z-5',
                  )}
                  style={{ gridColumn: col, gridRow: row }}
                >
                  {/* Owner stripe */}
                  {ownerColor && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: ownerColor }} />
                  )}
                  {/* Upgrade dots */}
                  {upgradeLevel > 0 && (
                    <div className="absolute top-0.5 left-0.5 flex gap-0.5">
                      {Array.from({ length: upgradeLevel }).map((_, i) => (
                        <div key={i} className="h-1 w-1 rounded-full bg-gold" />
                      ))}
                    </div>
                  )}
                  {/* Tile index */}
                  <div className="absolute top-0 right-0.5 text-[6px] font-mono text-muted/50">{tile.index}</div>

                  {/* Smoke trail */}
                  {hasSmokeHere && (
                    <div className="animate-smoke-out pointer-events-none absolute inset-0 flex items-center justify-center text-base z-20">
                      💨
                    </div>
                  )}

                  {/* Main icon / occupants */}
                  <div className="flex flex-1 items-center justify-center relative">
                    {occupants.length > 0 ? (
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {occupants.map((o) => (
                          <span
                            key={o.id}
                            className={cn(
                              'leading-none',
                              o.id === cp.id && isCurrent ? 'text-[13px] animate-vehicle-land' : 'text-[11px]',
                            )}
                          >
                            {o.vehicle}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[12px] opacity-75">{TILE_ICON[tile.type] ?? '□'}</span>
                    )}
                  </div>

                  {/* Tile name */}
                  <div className="w-full px-0.5 pb-0.5 text-center leading-none" style={{ fontSize: isCorner ? '7px' : '6px' }}>
                    <span className="font-bold text-content">
                      {cpIsJailed ? '🔒 مسجون' : isJailOccupied ? '🔒' : ''}{tile.name}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Center area */}
            <div
              className="flex flex-col items-center justify-center gap-1 p-2"
              style={{ gridColumn: `2 / ${gridSize}`, gridRow: `2 / ${gridSize}`, background: 'rgb(14 23 38 / 0.85)' }}
            >
              {/* Logo */}
              <div className="text-center">
                <div className="text-[10px] font-extrabold text-gold-sheen leading-tight">أم الدنيا</div>
                <div className="text-[7px] text-muted/70">مصر كلها في لعبة</div>
              </div>
              {/* Current player indicator */}
              <div className="flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-1.5 py-0.5">
                <span className="text-[9px]">{cp.vehicle}</span>
                <span className="text-[8px] font-bold text-gold">{cp.name.length > 6 ? cp.name.slice(0,6)+'…' : cp.name}</span>
              </div>
              {/* Dice */}
              <div className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md border text-base font-black tabular-nums',
                diceRolling ? 'animate-dice-shake border-gold/60 bg-gold/15 text-gold' : 'border-gold/40 bg-gold/10 text-gold-sheen',
              )}>
                {diceDisplay ?? '?'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTROLS (right) ═══ */}
      <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden p-2 gap-2">

        {/* Header row */}
        <div className="flex items-center justify-between gap-2">
          <button onClick={handleQuit} className="text-xs text-muted hover:text-danger transition-colors">خروج ✕</button>
          <div className="flex items-center gap-1.5">
            {game.activeNewsEvent && <Badge tone="clay" className="text-[10px]">📰</Badge>}
            <Badge tone="teal" className="text-[10px]">ج{game.round}</Badge>
          </div>
        </div>

        {/* Current player */}
        <div className={cn(
          'rounded-xl border p-2.5',
          isInJail ? 'border-clay/60 bg-clay/10' : 'border-gold/60 bg-gold/10',
        )}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{cp.vehicle}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-muted">{isInJail ? '🔒 في السجن' : 'دورك'}</p>
              <p className="font-extrabold text-content text-sm truncate">{cp.name}</p>
            </div>
            <div className="text-end">
              <p className={cn('font-extrabold tabular-nums text-base', cp.cash < 0 ? 'text-danger' : 'text-gold')}>
                {cp.cash.toLocaleString('en-US')}
              </p>
              {cp.solfaDebt > 0 && <p className="text-[9px] text-clay">سلفة {cp.solfaDebt.toLocaleString('en-US')}</p>}
            </div>
          </div>
          {lastRoll && (
            <p className="mt-1.5 text-center text-[11px] text-muted">
              🎲 {lastRoll} · من {fromPos} ← <span className="font-bold text-content">{cpVisualPos}</span>
            </p>
          )}
        </div>

        {/* My cities */}
        {myCities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {myCities.map((c) => (
              <span key={c.id} className="rounded-full border border-border/60 bg-surface-2/60 px-1.5 py-0.5 text-[9px] font-bold text-content">
                {c.name}{c.level > 0 ? ' ' + '⭐'.repeat(c.level) : ''}
              </span>
            ))}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Players */}
        <div className="space-y-1">
          {game.players.filter((p) => p.id !== cp.id).map((p) => (
            <div key={p.id} className={cn(
              'flex items-center gap-1.5 rounded-lg border px-2 py-1',
              !p.isActive ? 'opacity-40 border-border/20' : 'border-border/50 bg-surface/40',
            )}>
              <span className="text-base">{p.vehicle}</span>
              <span className="flex-1 truncate text-[11px] font-bold text-content">{p.name}</span>
              <span className={cn('text-[10px] tabular-nums', p.cash < 0 ? 'text-danger' : 'text-muted')}>
                {p.isActive ? p.cash.toLocaleString('en-US') : '💀'}
              </span>
              {p.jailTurns > 0 && <span className="text-[10px]">🔒</span>}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="space-y-1.5 pb-1">
          {canEnd && canUpgradeAny && (
            <Button block size="sm" variant="secondary" onClick={openUpgradeModal}>🏗️ رقّي</Button>
          )}
          {canEnd && canTrade && (
            <Button block size="sm" variant="secondary" onClick={openTradeModal}>🤝 تداول</Button>
          )}
          {canEnd ? (
            <Button block size="lg" onClick={handleEndTurn}>إنهاء الدور ←</Button>
          ) : isInJail ? (
            <Button block size="lg" onClick={openJailModal} leadingIcon={<span>🔓</span>}>محاولة الهروب</Button>
          ) : (
            <Button block size="lg" onClick={handleRoll} disabled={!canRoll}
              leadingIcon={<span>{diceRolling ? '🎰' : '🎲'}</span>}>
              {diceRolling ? 'جاري الرمي…' : isMoving ? 'جاري التحريك…' : rollAgainPending ? 'ارمي تاني!' : 'ارمي الزهر'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function JailModal({ playerId, isFast, onRoll, onPay, onSkip }: {
  playerId: string; isFast: boolean; onRoll: () => void; onPay: () => void; onSkip: () => void;
}) {
  const game = useMatchStore(selectGame);
  const player = game?.players.find((p) => p.id === playerId);
  return (
    <div className="space-y-5 text-center">
      <div className="text-6xl">🔒</div>
      <div>
        <h3 className="text-xl text-gold-sheen">في السجن</h3>
        <p className="mt-1 text-sm text-muted">
          {isFast ? 'ارمي ٦ علشان تطلع — لو فشلت خسرت الدور وبتطلع'
                  : `محاولات متبقية: ${player?.jailTurns ?? 0}`}
        </p>
      </div>
      <div className="space-y-2.5">
        <Button block size="lg" onClick={onRoll} leadingIcon={<span>🎲</span>}>
          ارمي الزهر {isFast ? '(لازم ٦)' : '(٦ = حرية)'}
        </Button>
        {!isFast && (
          <Button block variant="secondary" disabled={(player?.cash ?? 0) < 500} onClick={onPay}>
            💰 ادفع ٥٠٠ وأخرج {(player?.cash ?? 0) < 500 ? '(مش عندك)' : ''}
          </Button>
        )}
        <Button block variant="ghost" onClick={onSkip}>⏭️ خلّي لدور جاي</Button>
      </div>
    </div>
  );
}

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

function UpgradeModal({ cities, playerId, onUpgrade, onClose }: {
  cities: City[]; playerId: string; onUpgrade: (id: string) => void; onClose: () => void;
}) {
  const game = useMatchStore(selectGame);
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

type TradeStep = 'pick' | 'configure' | 'confirm' | 'counter-configure' | 'counter-confirm';

function TradeModal({ currentPlayerId, partners, onTrade, onClose }: {
  currentPlayerId: string; partners: Player[];
  onTrade: (toId: string, oC: string[], oX: number, rC: string[], rX: number) => void;
  onClose: () => void;
}) {
  const game = useMatchStore(selectGame)!;
  const [step, setStep] = useState<TradeStep>('pick');
  const [target, setTarget] = useState<Player | null>(null);
  const [offerC, setOfferC] = useState<string[]>([]);
  const [reqC, setReqC]     = useState<string[]>([]);
  const [offerX, setOfferX] = useState(0);
  const [reqX, setReqX]     = useState(0);
  const [ctrOC, setCtrOC]   = useState<string[]>([]);
  const [ctrRC, setCtrRC]   = useState<string[]>([]);
  const [ctrOX, setCtrOX]   = useState(0);
  const [ctrRX, setCtrRX]   = useState(0);

  const me   = game.players.find((p) => p.id === currentPlayerId)!;
  const them = target ? game.players.find((p) => p.id === target.id) : null;
  const myCities   = Object.values(game.cities).filter((c) => c.ownerId === currentPlayerId);
  const theirCities = target ? Object.values(game.cities).filter((c) => c.ownerId === target.id) : [];
  const tog = (arr: string[], set: (v: string[]) => void, id: string) =>
    set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]);

  if (step === 'pick') return (
    <div className="space-y-3">
      <p className="text-center text-sm text-muted">اختار لاعب تتداول معاه</p>
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

  if (step === 'configure' && target) return (
    <div className="space-y-4 text-sm">
      <p className="text-center text-xs text-muted">تتفاوض مع <strong className="text-content">{target.name}</strong></p>
      {[
        { label: 'بتعرض من عندك:', cities: myCities, sel: offerC, setSel: setOfferC, cash: offerX, setCash: setOfferX, max: me.cash, color: 'text-gold' },
        { label: 'بتطلب منه:', cities: theirCities, sel: reqC, setSel: setReqC, cash: reqX, setCash: setReqX, max: them?.cash ?? 0, color: 'text-teal' },
      ].map(({ label, cities, sel, setSel, cash, setCash, max, color }) => (
        <div key={label} className="space-y-1.5">
          <p className="font-bold text-sand/80">{label}</p>
          <div className="flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <button key={c.id} onClick={() => tog(sel, setSel, c.id)}
                className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', sel.includes(c.id) ? `border-current bg-current/20 ${color}` : 'border-border/70 bg-surface/60 text-muted')}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted">فلوس:</span>
            <input type="number" min={0} max={max} step={100} value={cash}
              onChange={(e) => setCash(Math.min(Math.max(0, +e.target.value), max))}
              className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-1.5 text-content outline-none focus:border-gold/60 text-sm" />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => setStep('pick')}>رجوع</Button>
        <Button block onClick={() => setStep('confirm')} disabled={!offerC.length && !reqC.length && !offerX && !reqX}>عرض الصفقة</Button>
      </div>
    </div>
  );

  if (step === 'confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gold/30 bg-gold/5 p-4 text-sm space-y-2">
        <p className="text-center text-xs text-muted mb-2">ديّ الموبايل لـ <strong className="text-content">{target.name}</strong></p>
        <p className="font-bold text-sand/80">{me.name} بيعرض:</p>
        {offerC.length > 0 && <p>🏙️ {offerC.map((id) => game.cities[id]?.name).join('، ')}</p>}
        {offerX > 0 && <p>💰 {offerX.toLocaleString('en-US')} جنيه</p>}
        <p className="font-bold text-sand/80 mt-2">{me.name} بيطلب:</p>
        {reqC.length > 0 && <p>🏙️ {reqC.map((id) => game.cities[id]?.name).join('، ')}</p>}
        {reqX > 0 && <p>💰 {reqX.toLocaleString('en-US')} جنيه</p>}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="danger" size="sm" onClick={onClose}>لا يا عم</Button>
        <Button variant="secondary" size="sm" onClick={() => setStep('counter-configure')}>هفاصل</Button>
        <Button size="sm" onClick={() => onTrade(target.id, offerC, offerX, reqC, reqX)}>موافق</Button>
      </div>
    </div>
  );

  if (step === 'counter-configure' && target && them) return (
    <div className="space-y-3 text-sm">
      <p className="text-center text-xs font-bold text-content">{target.name} — عرض مضاد</p>
      {[
        { label: `بتعرض من عندك (${target.name}):`, cities: theirCities, sel: ctrOC, setSel: setCtrOC, cash: ctrOX, setCash: setCtrOX, max: them.cash },
        { label: `بتطلب من ${me.name}:`, cities: myCities, sel: ctrRC, setSel: setCtrRC, cash: ctrRX, setCash: setCtrRX, max: me.cash },
      ].map(({ label, cities, sel, setSel, cash, setCash, max }) => (
        <div key={label} className="space-y-1.5">
          <p className="font-bold text-sand/80">{label}</p>
          <div className="flex flex-wrap gap-1.5">
            {cities.map((c) => (
              <button key={c.id} onClick={() => tog(sel, setSel, c.id)}
                className={cn('rounded-full border px-2.5 py-1 text-xs font-bold', sel.includes(c.id) ? 'border-gold/70 bg-gold/20 text-gold' : 'border-border/70 bg-surface/60 text-muted')}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-muted">فلوس:</span>
            <input type="number" min={0} max={max} step={100} value={cash}
              onChange={(e) => setCash(Math.min(Math.max(0, +e.target.value), max))}
              className="w-full rounded-xl border border-border/70 bg-surface/70 px-3 py-1.5 text-content outline-none focus:border-gold/60 text-sm" />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <Button variant="ghost" block onClick={() => setStep('confirm')}>رجوع</Button>
        <Button block onClick={() => setStep('counter-confirm')} disabled={!ctrOC.length && !ctrRC.length && !ctrOX && !ctrRX}>ارسل العرض</Button>
      </div>
    </div>
  );

  if (step === 'counter-confirm' && target) return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-teal/30 bg-teal/5 p-4 text-sm space-y-2">
        <p className="text-center text-xs text-muted mb-2">ديّ الموبايل لـ <strong className="text-content">{me.name}</strong></p>
        <p className="font-bold text-sand/80">{target.name} بيعرض:</p>
        {ctrOC.length > 0 && <p>🏙️ {ctrOC.map((id) => game.cities[id]?.name).join('، ')}</p>}
        {ctrOX > 0 && <p>💰 {ctrOX.toLocaleString('en-US')} جنيه</p>}
        <p className="font-bold text-sand/80 mt-2">{target.name} بيطلب:</p>
        {ctrRC.length > 0 && <p>🏙️ {ctrRC.map((id) => game.cities[id]?.name).join('، ')}</p>}
        {ctrRX > 0 && <p>💰 {ctrRX.toLocaleString('en-US')} جنيه</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="danger" block onClick={onClose}>لا يا عم</Button>
        <Button block onClick={() => onTrade(target.id, ctrRC, ctrRX, ctrOC, ctrOX)}>موافق</Button>
      </div>
    </div>
  );

  return null;
}

function BankruptcyModal({ playerId, onClose }: { playerId: string; onClose: () => void }) {
  const game         = useMatchStore(selectGame);
  const takeSalfa    = useMatchStore((s) => s.takeSalfa);
  const sellCity     = useMatchStore((s) => s.sellCity);
  const bankruptPlayer = useMatchStore((s) => s.bankruptPlayer);
  const endTurn      = useMatchStore((s) => s.endTurn);
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
