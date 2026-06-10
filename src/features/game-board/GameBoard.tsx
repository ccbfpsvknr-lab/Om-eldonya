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
import { getCityRent, isRegionComplete } from '@/game/engine/economyEngine';
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
// Fast board 16:9 — corners at 0,5,8,13
function getTileGridPosFast(index: number) {
  if (index === 0)  return { col: 1, row: 4 };
  if (index < 5)    return { col: index + 1, row: 4 };
  if (index === 5)  return { col: 6, row: 4 };
  if (index < 8)    return { col: 6, row: 4 - (index - 5) };
  if (index === 8)  return { col: 6, row: 1 };
  if (index < 13)   return { col: 6 - (index - 8), row: 1 };
  if (index === 13) return { col: 1, row: 1 };
  return                   { col: 1, row: index - 12 };
}
function inwardEdgeFast(index: number): 'top' | 'right' | 'bottom' | 'left' | '' {
  if (index===0||index===5||index===8||index===13) return '';
  if (index < 5)  return 'top';
  if (index < 8)  return 'left';
  if (index < 13) return 'bottom';
  return 'right';
}

// ─── VISUAL CONSTANTS ────────────────────────────────────────────────────────
const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'] as const;

const REGION_COLOR: Record<string, string> = {
  // Fast board regions
  q1:'#F97316', q2:'#10B981', q3:'#EF4444', q4:'#8B5CF6', q5:'#3B82F6',
  // Classic board regions — orange · emerald · red · violet · blue · amber
  a: '#F97316', b: '#10B981', c: '#EF4444', d: '#8B5CF6', e: '#3B82F6', f: '#F59E0B',
  // Full board regions
  f1:'#F97316', f2:'#10B981', f3:'#3B82F6', f4:'#8B5CF6',
  f5:'#EF4444', f6:'#EC4899', f7:'#F59E0B', f8:'#06B6D4', f9:'#84CC16',
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
  ramses: { bg: 'linear-gradient(135deg, #2d7a1e, #1a5210)', icon: '🏁', label: 'ابدأ' },
  jail:   { bg: 'linear-gradient(135deg, #7a1a1a, #501010)', icon: '🔒', label: 'الحجز' },
  rest:   { bg: 'linear-gradient(135deg, #7a4a10, #503008)', icon: '☕', label: 'القهوة' },
  police: { bg: 'linear-gradient(135deg, #8a1010, #600808)', icon: '🚔', label: 'كمين' },
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
  const forfeitTurn      = useMatchStore((s) => s.forfeitTurn);
  const applyNewsEvent   = useMatchStore((s) => s.applyNewsEvent);
  const decrementJailTurns = useMatchStore((s) => s.decrementJailTurns);
  const payTax           = useMatchStore((s) => s.payTax);
  const drawChance       = useMatchStore((s) => s.drawAndApplyChanceCard);
  const executeTrade     = useMatchStore((s) => s.executeTrade);
  const triggerNews      = useMatchStore((s) => s.triggerNewsEvent);
  const pendingNews      = useMatchStore((s) => s.pendingNewsEvent);
  const bankruptPlayer   = useMatchStore((s) => s.bankruptPlayer);
  const sellCity         = useMatchStore((s) => s.sellCity);
  const takeSalfa        = useMatchStore((s) => s.takeSalfa);
  const markSkipTurn          = useMatchStore((s) => s.markSkipTurn);
  const payAmount             = useMatchStore((s) => s.payAmount);
  const transferBetweenPlayers= useMatchStore((s) => s.transferBetweenPlayers);
  const decrementSkipTurns = useMatchStore((s) => s.decrementSkipTurns);
  const resetMatch       = useMatchStore((s) => s.resetMatch);
  const resetGame        = useGameStore((s) => s.resetGame);
  const resetPlayers     = usePlayersStore((s) => s.resetPlayers);
  const openModalCount   = useModalStore((s) => s.stack.length);

  const [diceRolling, setDiceRolling]   = useState(false);
  const [diceDisplay, setDiceDisplay]   = useState<number | null>(null);
  // Use a ref in addition to state — ref updates are sync so Zustand's
  // useSyncExternalStore re-renders see the correct visual position immediately
  const [animPos, setAnimPosState]       = useState<number | null>(null);
  const animPosRef                        = useRef<number | null>(null);
  const setAnimPos = (v: number | null) => { animPosRef.current = v; setAnimPosState(v); };
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
  const isInJail = cp.jailTurns > 0;
  const canRoll      = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !isInJail && !diceRolling && !isMoving;
  const canDiceRoll  = (phase === 'rolling' || (rollAgainPending && phase === 'turn-end')) && !diceRolling && !isMoving;
  const canEnd       = phase === 'turn-end' && !isMoving && !isFast;
  const myCities = Object.values(game.cities).filter((c) => c.ownerId === cp.id);
  const canUpgradeAny = !isFast && !game.hasUpgradedThisTurn && myCities.some((c) => canUpgrade(game, c, cp.id));
  const canSell  = myCities.length > 0 && (phase === 'rolling' || phase === 'turn-end') && !isMoving && !isFast;

  
// Dynamic currency emoji — scales with amount
const cashEmoji = (n: number): string =>
  n < 200 ? '🪙' : n < 800 ? '💵' : n < 3_000 ? '💰' : '💸';

  // Board visuals
  const cpVisualPos = animPosRef.current !== null ? animPosRef.current : cp.position;
  const occupantsByTile = new Map<number, Player[]>();
  game.players.forEach((p) => {
    if (!p.isActive) return;
    const pos = p.id === cp.id && animPosRef.current !== null ? animPosRef.current : p.position;
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
              <p className="mt-1 text-lg font-extrabold text-clay">{cashEmoji(tx.amount)}−{tx.amount.toLocaleString('en-US')}</p>
            </div>
          );
          checkInsolvency(player.id);
        }
      }

    } else if (tile.type === 'police') {
      // All modes: land on police = go to jail
      goToJail(player.id);
      const pid = open(
        <div className="text-center space-y-5">
          <div className="text-8xl">🚔</div>
          <h2 className="text-4xl font-extrabold text-gold-sheen">كلابوووش!</h2>
          <p className="text-muted">يلا عالبوكس! 🚔</p>
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
              {card.amount > 0 ? '+' : ''}{cashEmoji(Math.abs(card.amount))}{card.amount.toLocaleString('en-US')}
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
            {card.type === 'bonus' && card.rollAgain ? 'ارمي تاني ⚄' : 'خلاص'}
          </Button>
        </div>,
        { size: 'sm', dismissable: false, hideClose: true }
      );

    } else if (tile.type === 'news') {
      const NEWS_POOL = [
        { icon:'🛢️', title:'أسعار البنزين ولعت!',    sub:'كل واحد فيكم هيدفع ١٥٠ جنيه… يعني هتمشوا على رجليكم من دلوقتي 😭',  effect:'allPay',            amount:150 },
        { icon:'📈', title:'البورصة في الطالع!',       sub:'الأغنى واحد يكسب ٦٠٠ جنيه… المستثمرين بيعيطوا من الفرحة 🤑',       effect:'richestGain',       amount:600 },
        { icon:'📉', title:'أزمة اقتصادية يا جماعة!', sub:'الجنيه وقع في الأرض وبص للسما… كل لاعب يدفع ١٠٪ من رصيده 😩',     effect:'allPayPercent',     amount:10  },
        { icon:'💰', title:'الحكومة رفعت الأجور!',    sub:'ربنا يكرّمهم… كل لاعب يكسب ٢٠٠ جنيه مكافأة 😁',                    effect:'allGain',           amount:200 },
        { icon:'🏗️', title:'فساد في المناقصات!',      sub:'القضية مش هتكمل بكره… الأغنى يدفع ٥٠٠ للأفقر 😂',                  effect:'richestPaysPoarest',amount:500 },
        { icon:'⚡', title:'الكهربا اتقطعت على الحي!', sub:'خير إن شاء الله… مفيش إيجار عليك الدور الجاي 😅',                  effect:'rentFree',          amount:0   },
        { icon:'💵', title:'الدولار وصل مش كدا كدا!', sub:'ادعوا على اللي يستاهل… كل لاعب يدفع ٥٪ من رصيده 😤',              effect:'allPayPercent',     amount:5   },
        { icon:'🎉', title:'يوم عطلة مفاجأة!',        sub:'الدولة كريمة لما بتحب… كل لاعب يكسب ٣٠٠ جنيه 😁',                  effect:'allGain',           amount:300 },
      ];
      const ev = NEWS_POOL[Math.floor(Math.random() * NEWS_POOL.length)];
      applyNewsEvent(ev.effect, ev.amount);
      showToast(
        <div className="text-center space-y-2" dir="rtl">
          <div className="text-5xl">{ev.icon}</div>
          <h3 className="text-xl font-extrabold text-gold-sheen">{ev.title}</h3>
          <p className="text-sm text-content leading-relaxed">{ev.sub}</p>
        </div>,
        2800
      );

    } else if (tile.type === 'rest') {
      showToast(
        <div className="text-center space-y-2">
          <div className="text-5xl">☕</div>
          <h3 className="text-xl font-extrabold text-gold-sheen">القهوة</h3>
          <p className="text-base text-content font-bold">خربوش شاي رايق ☕</p>
          <p className="text-sm text-muted">مفيش إيجار، مفيش مشاكل 😌</p>
        </div>,
        2200
      );

    } else if (tile.type === 'project') {
      if (tile.name === 'الديوان المحلي') {
        // Choice required — use modal
        const canAffordBribe = player.cash >= 300;
        const did = open(
          <div className="space-y-4 text-center" dir="rtl">
            <div className="text-5xl">🏛️</div>
            <h3 className="text-2xl font-extrabold text-gold-sheen">الديوان المحلي</h3>
            <p className="text-sm text-content leading-relaxed">
              الموظف مش موجود… السيستم واقع… والأوراق ضاعت 😤<br/>تدفع ولا تستنى؟
            </p>
            <div className="flex gap-3">
              <button onClick={() => { markSkipTurn(player.id); close(did); }}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{ background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)', color: '#9AA6BC', cursor: 'pointer' }}>
                استنى الدور الجاي 😤
              </button>
              <button
                disabled={!canAffordBribe}
                onClick={() => { if (canAffordBribe) { payAmount(300); checkInsolvency(player.id); close(did); } }}
                className="flex-1 rounded-xl py-3 text-sm font-bold"
                style={{
                  background: canAffordBribe ? 'linear-gradient(135deg,#E8C040,#C49020)' : 'rgba(56,74,110,0.3)',
                  color: canAffordBribe ? '#0E1726' : '#9AA6BC', border: 'none',
                  cursor: canAffordBribe ? 'pointer' : 'not-allowed',
                }}>
                {canAffordBribe ? 'بلّط! ادفع ٣٠٠ 💸' : 'الجيب فاضي 😅'}
              </button>
            </div>
          </div>,
          { size: 'sm', hideClose: true, dismissable: false }
        );
      } else if (tile.name === 'شركة المياه') {
        const bill = 150;
        payAmount(bill);
        showToast(<div className="text-center"><div className="text-4xl mb-2">💧</div><h3 className="text-xl text-gold-sheen">شركة المياه</h3><p className="text-sm text-content mt-1">وصلتك فاتورة المياه يا أخي!</p><p className="text-lg font-extrabold text-clay mt-1">−{cashEmoji(bill)}{bill.toLocaleString('en-US')}</p></div>);
        checkInsolvency(player.id);
      } else if (tile.name === 'شركة الكهرباء') {
        const bill = Math.min(Math.max(Math.round(player.cash * 0.10), 200), 2000);
        payAmount(bill);
        showToast(<div className="text-center"><div className="text-4xl mb-2">⚡</div><h3 className="text-xl text-gold-sheen">شركة الكهرباء</h3><p className="text-sm text-content mt-1">فاتورتك وصلت… وده اللي أنت فيه 😬</p><p className="text-lg font-extrabold text-clay mt-1">−{cashEmoji(bill)}{bill.toLocaleString('en-US')}</p></div>);
        checkInsolvency(player.id);
      } else if (tile.name === 'المحكمة الاقتصادية') {
        const activePlayers = g.players.filter(p => p.isActive);
        const sorted = [...activePlayers].sort((a, b) => b.cash - a.cash);
        const richest = sorted[0];
        const poorest = sorted[sorted.length - 1];
        if (richest && poorest && richest.id !== poorest.id) {
          transferBetweenPlayers(richest.id, poorest.id, 400);
          showToast(<div className="text-center"><div className="text-4xl mb-2">⚖️</div><h3 className="text-xl text-gold-sheen">المحكمة الاقتصادية</h3><p className="text-sm text-content mt-1">{richest.name} دفع ٤٠٠ لـ {poorest.name}</p><p className="text-xs text-muted mt-1">يا ريتني كنت فاهم القانون 😂</p></div>);
          checkInsolvency(richest.id);
        } else {
          showToast(<div className="text-center"><div className="text-4xl mb-2">⚖️</div><h3 className="text-xl text-gold-sheen">المحكمة الاقتصادية</h3><p className="text-sm text-muted">القاضي مش لاقي حد يحكم عليه 😂</p></div>);
        }
      } else {
        showToast(<div className="text-center"><div className="text-4xl mb-2">🏗️</div><h3 className="text-xl text-gold-sheen">{tile.name}</h3><p className="text-sm text-muted">مشروع تحت الإنشاء 👷</p></div>, 1800);
      }

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
      smokeClearRef.current = setTimeout(() => setSmokePos(null), 520);
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
    }, 350);
  }, [resolveLanding, showToast]);

  // ── Unified roll handler ──────────────────────────────────────────────────
  const handleRoll = useCallback(() => {
    if (!canDiceRoll || diceRolling || isMoving) return;
    const g = useMatchStore.getState().game;
    const before = g?.players[g.currentPlayerIndex];
    if (!before) return;

    setDiceRolling(true);
    setRollAgainPending(false);
    // Always call rollDice() — sets phase:'moving' which blocks re-rolling for both normal and jail turns
    const storeValue = rollDice();
    const rollValue  = storeValue ?? 1;

    diceRef.current = setInterval(() => setDiceDisplay(Math.ceil(Math.random() * 6)), 80);
    setTimeout(() => {
      clearInterval(diceRef.current!);
      setDiceDisplay(rollValue);
      setLastRoll(rollValue);
      setDiceRolling(false);

      setTimeout(() => {
        if (isInJail) {
          const fee = resolveJailTurn(rollValue); // frees player + applies fee per mode
          const modeIsFast = g!.mode === 'quick';

          if (modeIsFast || rollValue === 6) {
            // Fast: always move (6=free, other=paid 200)
            // Classic roll 6: free + move
            showToast(
              <div className="text-center">
                <div className="text-4xl mb-2">{rollValue === 6 ? '🎉' : '😅'}</div>
                <h3 className="text-xl text-gold-sheen">رميت {rollValue}</h3>
                <p className="text-sm text-content mt-1">
                  {rollValue === 6
                    ? 'خروج مجاني! 🎉'
                    : `ادفع ${cashEmoji(fee)}${fee.toLocaleString('en-US')} وامشي 😅`}
                </p>
                <p className="text-sm font-bold text-teal mt-1">يلا طلعت برة 🏃</p>
              </div>,
              2000
            );
            if (fee > 0) checkInsolvency(before.id);
            setAnimPos(before.position);
            movePlayer(rollValue);
            animateAndMove(before.position, rollValue, g!.board.length, 0);
          } else {
            // Classic non-6: lose turn, no payment, no movement
            showToast(
              <div className="text-center">
                <div className="text-4xl mb-2">😬</div>
                <h3 className="text-xl text-gold-sheen">رميت {rollValue}</h3>
                <p className="text-sm text-content mt-1">مش ٦… خسرت الدور ده</p>
                <p className="text-sm text-muted mt-1">الدور الجاي بتلعب عادي 👋</p>
              </div>,
              2200
            );
            forfeitTurn(); // sets phase:'turn-end', end turn button appears
          }
        } else {
          const cashBefore = before.cash;
          setAnimPos(before.position); // lock visual before logical move
          movePlayer(rollValue);
          const after = useMatchStore.getState().game?.players[g!.currentPlayerIndex];
          const salary = Math.max(0, (after?.cash ?? cashBefore) - cashBefore);
          animateAndMove(before.position, rollValue, g!.board.length, salary);
        }
      }, 400);
    }, 850);
  }, [diceRolling, isMoving, canDiceRoll, isInJail, rollDice, movePlayer,
      resolveJailTurn, forfeitTurn, animateAndMove, showToast, checkInsolvency]);

  // ── Upgrade modal ─────────────────────────────────────────────────────────
  const openUpgradeModal = () => {
    const uid = open(
      <UpgradeModal cities={myCities} playerId={cp.id} onUpgrade={(id) => upgradeCity(id)} onClose={() => close(uid)} />,
      { title: '🏗️ رقّي مدنك', size: 'md' }
    );
  };

  // ── Sell to bank modal ────────────────────────────────────────────────────
  const openSellModal = () => {
    const sid = open(
      <SellToBankModal currentPlayerId={cp.id} onClose={() => close(sid)} />,
      { size: 'sm' }
    );
  };

  const handleEndTurn = () => {
    setLastRoll(null); setRollAgainPending(false);
    endTurn();
  };

  // ── Board dimensions ──────────────────────────────────────────────────────

  // ── Board render ──────────────────────────────────────────────────────────
  const isFastBoard    = isFast && game.board.length === 16;
  const isClassicRect  = !isFastBoard && game.board.length === 24;
  const tilesPerSide = game.board.length / 4;
  const gridSize     = tilesPerSide + 1;
  const diceLabel    = diceRolling
    ? (diceDisplay ? String(diceDisplay) : '?')
    : lastRoll !== null ? `${DICE_FACES[lastRoll]} ${lastRoll}`
    : isInJail ? '⚄ حاول تطلع!'
    : '⚄ هات الزهر!';

  // Fast board uses 16:9 aspect; others use square
  // Board grid natural fr totals — used to compute the "contain" size for any screen
  const gridFrW = isFastBoard ? 8 : isClassicRect ? 10 : (tilesPerSide * 2);
  const gridFrH = isFastBoard ? 6 : isClassicRect ? 8  : (tilesPerSide * 2);
  // min(screenW, screenH × W/H)  →  fits the larger screen dimension, centers on the smaller
  const boardWidth  = `min(100dvw, calc(100dvh * ${gridFrW} / ${gridFrH}))`;
  const boardHeight = `min(100dvh, calc(100dvw * ${gridFrH} / ${gridFrW}))`;
  const gridCols    = isFastBoard ? '2fr 1fr 1fr 1fr 1fr 2fr'
                     : isClassicRect ? '2fr 1fr 1fr 1fr 1fr 1fr 1fr 2fr'
                     : `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`;
  const gridRows    = isFastBoard ? '2fr 1fr 1fr 2fr'
                     : isClassicRect ? '2fr 1fr 1fr 1fr 1fr 2fr'
                     : `2fr repeat(${tilesPerSide - 1}, 1fr) 2fr`;
  const centerCol   = isFastBoard ? '2 / 6'
                     : isClassicRect ? '2 / 8'
                     : `2 / ${gridSize}`;
  const centerRow   = isFastBoard ? '2 / 4'
                     : isClassicRect ? '2 / 6'
                     : `2 / ${gridSize}`;

  const getGridPosClassicRect = (idx: number): { col: string; row: string } => {
    if (idx === 0)                   return { col: '1', row: '6' };  // BL Ramses
    if (idx >= 1  && idx <= 6)       return { col: String(idx + 1), row: '6' }; // bottom
    if (idx === 7)                   return { col: '8', row: '6' };  // BR Jail
    if (idx >= 8  && idx <= 11)      return { col: '8', row: String(6 - (idx - 7)) }; // right
    if (idx === 12)                  return { col: '8', row: '1' };  // TR Rest
    if (idx >= 13 && idx <= 18)      return { col: String(8 - (idx - 12)), row: '1' }; // top
    if (idx === 19)                  return { col: '1', row: '1' };  // TL Police
    if (idx >= 20 && idx <= 23)      return { col: '1', row: String(idx - 18) }; // left
    return { col: '1', row: '1' };
  };
  const getGridPos  = (idx: number) => isFastBoard ? getTileGridPosFast(idx)
                     : isClassicRect ? getGridPosClassicRect(idx)
                     : getTileGridPos(idx, game.board.length);
  const inwardEdgeClassicRect = (idx: number) => {
    if (idx <= 7)  return 'top'    as const;
    if (idx <= 12) return 'left'   as const;
    if (idx <= 19) return 'bottom' as const;
    return             'right'     as const;
  };
  const getEdge     = (idx: number) => isFastBoard ? inwardEdgeFast(idx)
                     : isClassicRect ? inwardEdgeClassicRect(idx)
                     : inwardEdge(idx, game.board.length);
  const isCornerTile= (idx: number) => isClassicRect ? [0,7,12,19].includes(idx)
                     : isFastBoard
    ? (idx===0||idx===5||idx===8||idx===13)
    : (idx % tilesPerSide === 0);

  return (
    <div dir="rtl" className="flex h-[100dvh] w-full items-center justify-center overflow-hidden"
      style={{ background: '#5c3a1e' }}>
      <div style={{ width: boardWidth, height: boardHeight, padding: isFastBoard ? '0' : '3px' }}>
        <div className="relative w-full h-full overflow-hidden"
          style={{
            borderRadius: isFastBoard ? '12px' : '12px',
            boxShadow: '0 0 0 4px #c4a030, 0 0 0 8px #5c3a1e, 0 0 50px rgba(196,160,48,0.5)',
            background: '#e8d5a0', padding: '3px',
          }}>
          <div className="w-full h-full" dir="ltr"
            style={{
              display: 'grid',
              gridTemplateColumns: gridCols,
              gridTemplateRows: gridRows,
              gap: '1px',
              background: '#c4a030',
            }}>

            {/* ── Perimeter tiles ── */}
            {/* Vehicle direction based on which edge the road strip is on */}
            {game.board.map((tile) => {
              const { col, row }  = getGridPos(tile.index);
              const edge          = getEdge(tile.index);
              const isCorner      = isCornerTile(tile.index);
              const isCurrent     = tile.index === cpVisualPos;
              const occupants     = occupantsByTile.get(tile.index) ?? [];
              const ownerColor    = ownerColorByTile.get(tile.index);
              const upgradeLevel  = tile.cityId ? (game.cities[tile.cityId]?.level ?? 0) : 0;
              const hasSmoke      = tile.index === smokePos && isMoving;
              const regionColor   = tile.cityId ? REGION_COLOR[game.cities[tile.cityId]?.region ?? ''] : undefined;
              const landmark      = tile.cityId ? (CITY_EMOJI[tile.name] ?? '🏙️') : undefined;
              const city          = tile.cityId ? game.cities[tile.cityId] : undefined;
              const cpJailedHere  = tile.type === 'jail' && cp.position === tile.index && cp.jailTurns > 0 && !animPos;
              const isHoriz       = edge === 'left' || edge === 'right';
              const roadFirst     = edge === 'top' || edge === 'left';
              const cornerInfo    = isCorner ? CORNER_STYLE[tile.type] : null;
              const specialInfo   = SPECIAL_STYLE[tile.type];
              const ROAD_PCT      = isHoriz ? (isFastBoard || isClassicRect ? 30 : 28) : (isFastBoard || isClassicRect ? 32 : 30);
              const isOwned       = ownerColor !== undefined;
              const fmt           = (n: number) => n.toLocaleString('en-US');

              const tileBg = isCorner
                ? (cornerInfo?.bg ?? '#120d06')
                : tile.type === 'city'
                  ? regionColor ? `linear-gradient(135deg, ${regionColor}25, ${regionColor}10)` : '#1a1208'
                  : '#faf5e8';

              // Road strip with lane markings + owner bar + vehicles
              const roadStrip = (pos: 'first' | 'last') => (
                <div style={{
                  flexShrink: 0, background: '#2a1206', position: 'relative',
                  ...(isHoriz
                    ? { width: `${ROAD_PCT}%`, height: '100%' }
                    : { width: '100%', height: `${ROAD_PCT}%` }),
                }}>
                  {/* Lane dashes */}
                  <div style={{ position: 'absolute',
                    ...(isHoriz
                      ? { top: '50%', left: 2, right: 2, transform: 'translateY(-50%)',
                          height: '1px', background: 'repeating-linear-gradient(to bottom, rgba(255,220,80,0.4) 0px, rgba(255,220,80,0.4) 3px, transparent 3px, transparent 6px)' }
                      : { left: '50%', top: 2, bottom: 2, transform: 'translateX(-50%)',
                          width: '1px', background: 'repeating-linear-gradient(to right, rgba(255,220,80,0.4) 0px, rgba(255,220,80,0.4) 3px, transparent 3px, transparent 6px)' }),
                  }}/>
                  {/* Owner colour bar on the city-facing edge */}
                  {ownerColor && (
                    <div style={{
                      position: 'absolute',
                      ...(isHoriz
                        ? {
                            top: 0, bottom: 0,
                            [pos === 'first' ? 'right' : 'left']: 0,
                            width: '7px',
                            background: ownerColor,
                            boxShadow: `0 0 8px 2px ${ownerColor}cc`,
                          }
                        : {
                            left: 0, right: 0,
                            [pos === 'first' ? 'bottom' : 'top']: 0,
                            height: '7px',
                            background: ownerColor,
                            boxShadow: `0 0 8px 2px ${ownerColor}cc`,
                          }),
                    }}/>
                  )}
                  {/* Vehicles in the road */}
                  {occupants.length > 0 && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', zIndex: 15 }}>
                      {occupants.map((o) => {
                        // Rotate vehicle emoji based on movement direction
                        const dirDeg = edge === 'top'    ?   0   // bottom row → right
                                     : edge === 'left'   ? -90   // right col ↑ up
                                     : edge === 'bottom' ? 180   // top row ← left
                                     :                     90;   // left col ↓ down
                        const scl = isMoving && o.id === cp.id ? 1.4 : 1;
                        return (
                          <span key={o.id}
                            className={cn(!isMoving && isCurrent && o.id === cp.id ? 'animate-vehicle-land' : '')}
                            style={{
                              fontSize: (isFastBoard || isClassicRect) ? '18px' : '13px', lineHeight: 1,
                              display: 'inline-block',
                              transform: `rotate(${dirDeg}deg) scale(${scl})`,
                              transition: 'transform 0.12s ease',
                              filter: o.id === cp.id
                                ? 'drop-shadow(0 0 5px rgba(224,180,60,0.9)) drop-shadow(0 2px 4px rgba(0,0,0,0.9))'
                                : 'drop-shadow(0 1px 3px rgba(0,0,0,0.8))',
                            }}>
                            {o.vehicle}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              );

              return (
                <div key={tile.index}
                  className={cn('relative overflow-hidden', isCurrent && 'z-10')}
                  style={{
                    gridColumn: col, gridRow: row, background: tileBg,
                    border: isCurrent ? `3px solid ${regionColor ?? '#E0B43C'}` : regionColor ? `2px solid ${regionColor}cc` : '1px solid rgba(180,140,40,0.5)',
                    boxShadow: isCurrent ? `0 0 14px ${regionColor ?? '#E0B43C'}70` : 'none',
                    display: 'flex',
                    flexDirection: isCorner ? 'column' : (isHoriz ? 'row' : 'column'),
                  }}>

                  {/* Road on inward side — FIRST */}
                  {!isCorner && roadFirst && roadStrip('first')}

                  {/* ── Tile content ── */}
                  {isCorner ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '3px' }}>
                      {occupants.length > 0 && (
                        <div style={{ display: 'flex', gap: '1px', marginBottom: '2px' }}>
                          {occupants.map((o) => (
                            <span key={o.id} style={{ fontSize: (isFastBoard || isClassicRect) ? '18px' : '13px',
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', lineHeight: 1 }}>
                              {o.vehicle}
                            </span>
                          ))}
                        </div>
                      )}
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '30px' : '20px', lineHeight: 1 }}>
                        {cpJailedHere ? '🔒' : cornerInfo?.icon ?? '👑'}
                      </div>
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '9px' : '7.5px', color: '#1a0d04',
                        fontFamily: "'Cairo'", fontWeight: 700, textAlign: 'center', direction: 'rtl', lineHeight: 1.2 }}>
                        {cpJailedHere ? 'محبوس' : cornerInfo?.label ?? tile.name}
                      </div>
                    </div>

                  ) : tile.type === 'city' ? (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'space-between',
                      padding: '2px 1px', overflow: 'hidden', minWidth: 0 }}>
                      {/* Landmark */}
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '26px' : '17px', lineHeight: 1, flexShrink: 0 }}>
                        {landmark}
                      </div>
                      {/* Name */}
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '11px' : '8.5px', fontWeight: 800, color: '#1a0d04',
                        fontFamily: "'Cairo'", textAlign: 'center', direction: 'rtl', lineHeight: 1.1,
                        overflow: 'hidden', maxWidth: '100%', flexShrink: 0 }}>
                        {tile.name}
                      </div>
                      {/* Price + Live Rent */}
                      {(() => {
                        const liveRent = city ? getCityRent(game, city) : 0;
                        const fs  = (isFastBoard || isClassicRect) ? '9px' : '7px';
                        const fsS = (isFastBoard || isClassicRect) ? '8px' : '6px';
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px', flexShrink: 0 }}>
                            {!isOwned ? (
                              <>
                                <div style={{ fontSize: fs, color: '#7a4800', lineHeight: 1, fontFamily: 'monospace', fontWeight: 700 }}>
                                  {cashEmoji(city?.price ?? 0)}{fmt(city?.price ?? 0)}
                                </div>
                                <div style={{ fontSize: fsS, color: '#9a0030', lineHeight: 1, fontFamily: 'monospace' }}>
                                  {cashEmoji(liveRent)}{liveRent}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: fs, color: '#9a0030', lineHeight: 1, fontFamily: 'monospace', fontWeight: 800 }}>
                                {cashEmoji(liveRent)}{liveRent}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'space-between',
                      padding: '2px 1px', overflow: 'hidden' }}>
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '22px' : '16px', lineHeight: 1,
                        filter: `drop-shadow(0 0 4px ${specialInfo?.border ?? 'rgba(224,180,60,0.4)'})` }}>
                        {specialInfo?.icon ?? '□'}
                      </div>
                      <div style={{ fontSize: (isFastBoard || isClassicRect) ? '8px' : '6.5px', color: '#3a2a08',
                        textAlign: 'center', direction: 'rtl', lineHeight: 1.1, overflow: 'hidden' }}>
                        {tile.name}
                      </div>
                    </div>
                  )}

                  {/* Road on inward side — LAST */}
                  {!isCorner && !roadFirst && roadStrip('last')}

                  {/* Upgrade dots */}
                  {upgradeLevel > 0 && (
                    <div style={{ position: 'absolute', top: 1, right: 1, zIndex: 9,
                      display: 'flex', gap: '0px', lineHeight: 1 }}>
                      {Array.from({ length: Math.min(upgradeLevel, MAX_UPGRADE_LEVEL) }).map((_, i) => (
                        <span key={i} style={{
                          fontSize: (isFastBoard || isClassicRect) ? '10px' : '8px',
                          color: '#FFD700',
                          textShadow: '0 0 4px rgba(255,200,0,0.9), 0 1px 2px rgba(0,0,0,0.9)',
                          lineHeight: 1,
                        }}>★</span>
                      ))}
                    </div>
                  )}

                  {/* Tile index */}
                  <div style={{ position: 'absolute', top: 0, right: 1, fontSize: '4px',
                    color: 'rgba(154,166,188,0.3)', fontFamily: 'monospace', lineHeight: 1, zIndex: 5 }}>
                    {tile.index}
                  </div>

                  {/* Smoke */}
                  {hasSmoke && (
                    <div className="animate-smoke-out" style={{ position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', pointerEvents: 'none', zIndex: 25 }}>💨</div>
                  )}
                </div>
              );
            })}
            {/* ── CENTER AREA ── */}
            <div style={{ gridColumn: centerCol, gridRow: centerRow, position: 'relative', overflow: 'hidden',
              background: 'rgba(15, 8, 2, 0.90)' }}>

              {/* Mini Egyptian landscape */}
              {(true ||
                <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" aria-hidden>
                  <defs>
                    <linearGradient id="csky" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#040810"/>
                      <stop offset="60%" stopColor="#0d1a30"/>
                      <stop offset="80%" stopColor="#4a2008"/>
                      <stop offset="100%" stopColor="#8a3c10"/>
                    </linearGradient>
                  </defs>
                  <rect width="100" height="100" fill="url(#csky)"/>
                  <polygon points="72,50 88,72 56,72" fill="#c47018" opacity="0.5"/>
                  <polygon points="80,56 92,72 68,72" fill="#a86012" opacity="0.4"/>
                  <path d="M0,72 Q50,66 100,72 L100,100 L0,100 Z" fill="#1a1006"/>
                  <path d="M0,76 Q50,70 100,76" stroke="rgba(42,157,143,0.3)" strokeWidth="3" fill="none"/>
                </svg>
              )}

              {/* Dark overlay for non-fast */}
              {!isFastBoard && !isClassicRect && <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,2,0.7)', zIndex: 1 }}/>}

              {/* Controls */}
              <div style={{ position: 'relative', zIndex: 5, height: '100%', display: 'flex',
                flexDirection: (isFastBoard || isClassicRect) ? 'row' : 'column',
                padding: (isFastBoard || isClassicRect) ? '6px' : '3px', gap: '4px', direction: 'rtl' }}>

                {/* ── Left / Top section: current player + dice ── */}
                <div style={{ flex: (isFastBoard || isClassicRect) ? '0 0 60%' : 1, display: 'flex', flexDirection: 'column',
                  justifyContent: 'center', gap: isFastBoard ? '6px' : '2px' }}>

                  {(!isFastBoard || isClassicRect) && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                      <h2 style={{ fontFamily: "'Rakkas', serif", fontSize: '9px',
                        background: 'linear-gradient(180deg, #F4CE5E, #E0B43C)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1 }}>
                        أم الدنيا
                      </h2>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {game.activeNewsEvent && <span style={{ fontSize: '8px', background: 'rgba(199,91,57,0.3)', borderRadius: '4px', padding: '0 3px', color: '#C75B39' }}>📰</span>}
                        <button onClick={handleQuit}
                          style={{ fontSize: '9px', fontWeight: 700, color: '#C75B39', cursor: 'pointer',
                            background: 'rgba(199,91,57,0.15)', border: '1px solid rgba(199,91,57,0.35)',
                            borderRadius: '6px', padding: '3px 8px', lineHeight: 1 }}>
                          ✕ خروج
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current player card */}
                  <div style={{ borderRadius: '6px',
                    border: `1px solid rgba(224,180,60,${isFastBoard?'0.5':'0.3'})`,
                    background: `rgba(22,15,4,${isFastBoard?'0.75':'0.85'})`,
                    padding: (isFastBoard || isClassicRect) ? '8px' : '4px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: isFastBoard ? '20px' : '14px' }}>{cp.vehicle}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: isFastBoard ? '11px' : '7px', fontWeight: 700, color: '#EADBB7', fontFamily: "'Cairo'", lineHeight: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cp.name}
                        </div>
                        <div style={{ fontSize: isFastBoard ? '9px' : '6px', color: '#9AA6BC', lineHeight: 1 }}>
                          {isInJail ? '🔒 في الحجز' : `خانة ${cpVisualPos}`}
                        </div>
                      </div>
                      <div style={{ fontSize: isFastBoard ? '13px' : '8px', fontWeight: 800, color: cp.cash < 0 ? '#E05656' : '#E0B43C', fontFamily: 'monospace', lineHeight: 1 }}>
                        {cp.cash.toLocaleString('en-US')}
                      </div>
                    </div>

                    {myCities.length > 0 && (() => {
                      const byRegion: Record<string, typeof myCities> = {};
                      myCities.forEach(city => {
                        if (!byRegion[city.region]) byRegion[city.region] = [];
                        byRegion[city.region].push(city);
                      });
                      return (
                        <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {Object.entries(byRegion).map(([region, cities]) => {
                            const rc = REGION_COLOR[region] ?? '#E0B43C';
                            return (
                              <div key={region} style={{ display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                                {cities.map(city => (
                                  <span key={city.id} style={{
                                    fontSize: isFastBoard ? '9px' : '6px', fontWeight: 700,
                                    borderRadius: '3px', padding: '1px 4px', whiteSpace: 'nowrap',
                                    background: `${rc}22`, border: `1px solid ${rc}50`, color: rc,
                                  }}>
                                    {city.name}{city.level > 0 ? ' ' + '★'.repeat(city.level) : ''}
                                  </span>
                                ))}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Dice button — square, entire button is the die face */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '5px' }}>
                      <button onClick={handleRoll} disabled={!canDiceRoll || isMoving}
                        style={{
                          width: isFastBoard ? '68px' : '44px',
                          height: isFastBoard ? '68px' : '44px',
                          borderRadius: '10px', border: 'none', flexShrink: 0,
                          cursor: canDiceRoll ? 'pointer' : 'default',
                          opacity: (!canDiceRoll || isMoving) ? 0.40 : 1, transition: 'all 0.15s',
                          background: diceRolling ? 'linear-gradient(135deg, #FFD600, #FF8F00)'
                            : lastRoll !== null ? 'linear-gradient(135deg, #1a2a4a, #0d1828)'
                            : canDiceRoll ? 'linear-gradient(135deg, #E8C040, #C49020)'
                            : 'rgba(20,30,50,0.8)',
                          boxShadow: canDiceRoll && !diceRolling ? '0 4px 20px rgba(224,180,60,0.6)' : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}
                        className={diceRolling ? 'animate-dice-shake' : ''}>
                        <span style={{ fontSize: isFastBoard ? '36px' : '24px', lineHeight: 1, userSelect: 'none' }}>
                          {diceRolling ? (DICE_FACES[diceDisplay ?? 1]||'⚄') : lastRoll !== null ? DICE_FACES[lastRoll] : '⚄'}
                        </span>
                      </button>
                    </div>

                    {(canEnd || canUpgradeAny || canSell) && (
                      <div style={{ display: 'flex', gap: '3px', marginTop: '4px' }}>
                        {canUpgradeAny && (
                          <button onClick={openUpgradeModal} style={{ flex: 1, borderRadius: '5px', padding: isFastBoard?'5px':'2px', fontSize: isFastBoard?'10px':'7px', fontWeight: 700, background: 'rgba(42,157,143,0.15)', border: '1px solid rgba(42,157,143,0.4)', color: '#2A9D8F', cursor: 'pointer' }}>🏗️ رقّي</button>
                        )}
                        {canSell && (
                          <button onClick={openSellModal} style={{ flex: 1, borderRadius: '5px', padding: (isFastBoard||isClassicRect)?'5px':'2px', fontSize: (isFastBoard||isClassicRect)?'10px':'7px', fontWeight: 700, background: 'rgba(199,91,57,0.15)', border: '1px solid rgba(199,91,57,0.35)', color: '#C75B39', cursor: 'pointer' }}>🏦 بيع للبنك</button>
                        )}
                        {canEnd && (
                          <button onClick={handleEndTurn} style={{ flex: 1, borderRadius: '5px', padding: isFastBoard?'5px':'2px', fontSize: isFastBoard?'10px':'7px', fontWeight: 700, background: 'rgba(224,180,60,0.15)', border: '1px solid rgba(224,180,60,0.4)', color: '#E0B43C', cursor: 'pointer' }}>يلا ←</button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Quit (fast mode only) */}
                  {isFastBoard && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <button onClick={handleQuit}
                        style={{ fontSize: '11px', fontWeight: 700, color: '#C75B39', cursor: 'pointer',
                          background: 'rgba(199,91,57,0.15)', border: '1px solid rgba(199,91,57,0.35)',
                          borderRadius: '8px', padding: '5px 14px', lineHeight: 1 }}>
                        ✕ خروج
                      </button>
                    </div>
                  )}
                </div>

                {/* ── Right / Bottom section: leaderboard ── */}
                <div style={{ flex: (isFastBoard || isClassicRect) ? '0 0 40%' : 1, display: 'flex', flexDirection: 'column',
                  borderRadius: '6px',
                  border: `1px solid rgba(56,74,110,${isFastBoard?'0.4':'0.3'})`,
                  background: `rgba(14,10,4,${isFastBoard?'0.75':'0.8'})`,
                  padding: isFastBoard ? '8px' : '3px', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ fontSize: isFastBoard?'9px':'6px', color: '#9AA6BC', marginBottom: '4px', fontFamily: "'Cairo'", fontWeight: 700 }}>
                    مين فوق 💰
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: isFastBoard?'5px':'3px', overflow: 'hidden' }}>
                    {sortedPlayers.map((p, i) => {
                      const cashStr = p.isActive
                        ? `${cashEmoji(Math.abs(p.cash))}${p.cash.toLocaleString('en-US')}`
                        : '💀';
                      return (
                        <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '3px',
                          borderRadius: '5px', padding: isFastBoard?'4px 5px':'2px 3px',
                          background: p.id===cp.id ? 'rgba(224,180,60,0.15)' : 'rgba(255,255,255,0.03)',
                          border: p.id===cp.id ? '1px solid rgba(224,180,60,0.25)' : '1px solid transparent',
                          opacity: p.isActive ? 1 : 0.4 }}>
                          <span style={{ fontSize: (isFastBoard||isClassicRect)?'15px':'11px', lineHeight: 1, flexShrink: 0 }}>{p.vehicle}</span>
                          <span style={{ flex: 1, fontSize: isFastBoard?'11px':'7px', color: p.id===cp.id?'#F4CE5E':'#EADBB7',
                            fontFamily: "'Cairo'", fontWeight: 700,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {p.name}
                          </span>
                          {p.jailTurns > 0 && <span style={{ fontSize: (isFastBoard||isClassicRect)?'9px':'7px', flexShrink: 0 }}>🔒</span>}
                          <span style={{ fontSize: isFastBoard?'11px':'7px', fontWeight: 800,
                            color: p.cash<0?'#E05656':'#E0B43C', fontFamily: 'monospace', lineHeight: 1, flexShrink: 0 }}>
                            {cashStr}
                          </span>
                        </div>
                      );
                    })}
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
          { label: 'التمن', value: city.price.toLocaleString('en-US'), color: regionColor, icon: cashEmoji(city.price) },
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
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9AA6BC', fontFamily: "'Cairo'" }}>بيع اللي عندك بـ ٧٥٪ من التمن:</p>
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
                  {cashEmoji(Math.round(c.price * 0.75))}+{Math.round(c.price * 0.75).toLocaleString('en-US')}
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

// ─── GOVERNMENT OFFICE MODAL ─────────────────────────────────────────────────
function GovOfficeModal({ tileName, player, allPlayers, onDone, payAmount, transferBetweenPlayers, checkInsolvency }: {
  tileName: string;
  player: Player;
  allPlayers: Player[];
  onDone: (action: string) => void;
  payAmount: (amount: number) => number;
  transferBetweenPlayers: (fromId: string, toId: string, amount: number) => void;
  checkInsolvency: (id: string) => void;
}) {
  const activePlayers = allPlayers.filter((p) => p.isActive);
  const myCities = Object.keys({}).length; // placeholder — resolved below

  if (tileName === 'الديوان المحلي') {
    const canAffordBribe = player.cash >= 300;
    return (
      <div className="space-y-4 text-center" dir="rtl">
        <div className="text-5xl">🏛️</div>
        <h3 className="text-2xl font-extrabold text-gold-sheen">الديوان المحلي</h3>
        <p className="text-sm text-content leading-relaxed">
          الموظف مش موجود… السيستم واقع… والأوراق ضاعت 😤<br/>
          تدفع ولا تستنى؟
        </p>
        <div className="flex gap-3">
          <button onClick={() => { onDone('skip'); }}
            className="flex-1 rounded-xl py-3 text-sm font-bold"
            style={{ background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)', color: '#9AA6BC' }}>
            استنى الدور الجاي 😤
          </button>
          <button disabled={!canAffordBribe}
            onClick={() => { payAmount(300); checkInsolvency(player.id); onDone('paid'); }}
            className="flex-1 rounded-xl py-3 text-sm font-bold"
            style={{
              background: canAffordBribe ? 'linear-gradient(135deg,#E8C040,#C49020)' : 'rgba(56,74,110,0.3)',
              color: canAffordBribe ? '#0E1726' : '#9AA6BC',
              border: 'none', cursor: canAffordBribe ? 'pointer' : 'not-allowed',
            }}>
            {canAffordBribe ? 'بلّط! ادفع ٣٠٠ 💸' : 'الجيب فاضي 😅'}
          </button>
        </div>
      </div>
    );
  }

  if (tileName === 'شركة المياه') {
    const cities = allPlayers.find(p => p.id === player.id)?.id; // just to scope
    // count player's cities from game state via allPlayers is not available directly —
    // use payAmount hook logic: bill = max(150, cityCount * 150)
    // We pass player but not game cities, so show flat 150 per turn
    const bill = 150;
    return (
      <div className="space-y-4 text-center" dir="rtl">
        <div className="text-5xl">💧</div>
        <h3 className="text-2xl font-extrabold text-gold-sheen">شركة المياه</h3>
        <p className="text-sm text-content leading-relaxed">
          وصلتك فاتورة المياه يا أخي!<br/>
          وماعدش فيه كلام 😶
        </p>
        <p className="text-xl font-extrabold text-clay">{cashEmoji(bill)}−{bill.toLocaleString('en-US')}</p>
        <button onClick={() => { payAmount(bill); checkInsolvency(player.id); onDone('paid'); }}
          className="w-full rounded-xl py-3 font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#1E6FA0,#155080)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          أمر… ادفع 💧
        </button>
      </div>
    );
  }

  if (tileName === 'المحكمة الاقتصادية') {
    const sorted = [...activePlayers].sort((a, b) => b.cash - a.cash);
    const richest = sorted[0];
    const poorest = sorted[sorted.length - 1];
    const amount  = 400;
    const iAmRichest = richest?.id === player.id;
    const iAmPoorest = poorest?.id === player.id;
    const samePlayer = richest?.id === poorest?.id;
    return (
      <div className="space-y-4 text-center" dir="rtl">
        <div className="text-5xl">⚖️</div>
        <h3 className="text-2xl font-extrabold text-gold-sheen">المحكمة الاقتصادية</h3>
        <p className="text-sm text-content leading-relaxed">
          القضية: توزيع الثروة في الحي
        </p>
        {samePlayer ? (
          <p className="text-sm text-muted">لاعب واحد بس؟ القاضي قال خلاص 😂</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-content">
              {iAmRichest
                ? `أنت الأغنى في الشارع ده، ادفع ${amount} للأفقر 😬`
                : iAmPoorest
                  ? `أنت الأفقر دلوقتي، خد ${amount} من الأغنى 🤑`
                  : `القاضي حكم: ${richest?.name} يدفع ${amount} لـ ${poorest?.name}`
              }
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted">
              <span>الأغنى: {richest?.name} ({richest?.cash.toLocaleString('en-US')})</span>
              <span>الأفقر: {poorest?.name} ({poorest?.cash.toLocaleString('en-US')})</span>
            </div>
          </div>
        )}
        <button onClick={() => {
          if (!samePlayer && richest && poorest) {
            transferBetweenPlayers(richest.id, poorest.id, amount);
            if (iAmRichest) checkInsolvency(richest.id);
          }
          onDone('done');
        }}
          className="w-full rounded-xl py-3 font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#5B21B6)', color: '#fff', border: 'none', cursor: 'pointer' }}>
          يا ريتني كنت فاهم القانون 😂
        </button>
      </div>
    );
  }

  if (tileName === 'شركة الكهرباء') {
    const pct   = 0.10;
    const raw   = Math.round(player.cash * pct);
    const bill  = Math.min(Math.max(raw, 200), 2000);
    return (
      <div className="space-y-4 text-center" dir="rtl">
        <div className="text-5xl">⚡</div>
        <h3 className="text-2xl font-extrabold text-gold-sheen">شركة الكهرباء</h3>
        <p className="text-sm text-content leading-relaxed">
          فاتورتك وصلت… وده اللي أنت فيه 😬<br/>
          ١٠٪ من رصيدك
        </p>
        <p className="text-xl font-extrabold text-clay">{cashEmoji(bill)}−{bill.toLocaleString('en-US')}</p>
        <button onClick={() => { payAmount(bill); checkInsolvency(player.id); onDone('paid'); }}
          className="w-full rounded-xl py-3 font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#C49020,#8B6010)', color: '#0E1726', border: 'none', cursor: 'pointer' }}>
          إيه اللي أنا فيه ده 😭
        </button>
      </div>
    );
  }

  // Fallback for unknown project tiles
  return (
    <div className="space-y-4 text-center" dir="rtl">
      <div className="text-5xl">🏗️</div>
      <h3 className="text-2xl font-extrabold text-gold-sheen">{tileName}</h3>
      <p className="text-sm text-muted">مشروع تحت الإنشاء 👷</p>
      <button onClick={() => onDone('done')}
        className="w-full rounded-xl py-3 font-bold text-sm"
        style={{ background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.6)', color: '#9AA6BC', cursor: 'pointer' }}>
        خلاص
      </button>
    </div>
  );
}

// ─── SELL TO BANK MODAL ──────────────────────────────────────────────────────
function SellToBankModal({ currentPlayerId, onClose }: { currentPlayerId: string; onClose: () => void }) {
  const game                  = useMatchStore(selectGame);
  const sellCity              = useMatchStore((s) => s.sellCity);
  const downgradeCityUpgrade  = useMatchStore((s) => s.downgradeCityUpgrade);
  if (!game) return null;

  const ownedCities = Object.values(game.cities).filter((c) => c.ownerId === currentPlayerId);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="text-center">
        <div className="text-5xl mb-1">🏦</div>
        <h3 className="text-2xl font-extrabold text-gold-sheen">بيع للبنك</h3>
        <p className="text-sm text-muted mt-1">٧٥٪ من سعر الشراء — للمدينة والترقيات</p>
      </div>

      {ownedCities.length === 0 ? (
        <p className="text-center text-muted text-sm py-4">مفيش مدن عندك دلوقتي 😅</p>
      ) : (
        <div className="space-y-3">
          {ownedCities.map((c) => {
            const rc          = REGION_COLOR[c.region] ?? '#E0B43C';
            const cityPrice   = Math.round(c.price * 0.75);
            const upgradeRefund = c.level > 0 ? Math.round(c.price * 0.15 * 0.75) : 0;
            return (
              <div key={c.id} style={{ borderRadius: '12px', border: `1px solid ${rc}40`, background: `${rc}10`, overflow: 'hidden' }}>
                {/* Sell whole city */}
                <button onClick={() => sellCity(c.id)}
                  className="w-full flex items-center justify-between transition-all"
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: c.level > 0 ? `1px solid ${rc}20` : 'none', background: 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '16px' }}>{CITY_EMOJI[c.name] ?? '🏙️'}</span>
                    <span style={{ color: '#EADBB7', fontWeight: 700, fontFamily: "'Cairo'", fontSize: '0.9rem' }}>{c.name}</span>
                    {c.level > 0 && (
                      <span style={{ color: '#FFD700', fontSize: '10px', letterSpacing: '-1px' }}>{'★'.repeat(c.level)}</span>
                    )}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ color: '#27AE60', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {cashEmoji(cityPrice)}+{cityPrice.toLocaleString('en-US')}
                    </div>
                    {c.level > 0 && (
                      <div style={{ color: '#9AA6BC', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        +{(Math.round(c.price * 0.15 * 0.75) * c.level).toLocaleString('en-US')} ترقيات
                      </div>
                    )}
                    <div style={{ color: '#9AA6BC', fontSize: '0.65rem', fontFamily: "'Cairo'" }}>بيع المدينة كاملة</div>
                  </div>
                </button>

                {/* Sell one upgrade level */}
                {c.level > 0 && (
                  <button onClick={() => downgradeCityUpgrade(c.id)}
                    className="w-full flex items-center justify-between transition-all"
                    style={{ padding: '8px 14px', cursor: 'pointer', background: 'transparent' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: '#FFD700', fontSize: '13px' }}>★</span>
                      <span style={{ color: '#EADBB7', fontFamily: "'Cairo'", fontSize: '0.85rem' }}>بيع ترقية واحدة</span>
                      <span style={{ color: '#9AA6BC', fontSize: '0.75rem' }}>
                        ({c.level} → {c.level - 1})
                      </span>
                    </div>
                    <span style={{ color: '#2A9D8F', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.9rem' }}>
                      {cashEmoji(upgradeRefund)}+{upgradeRefund.toLocaleString('en-US')}
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      <button onClick={onClose}
        className="w-full rounded-xl py-3 text-sm font-bold"
        style={{ background: 'rgba(22,34,58,0.8)', border: '1px solid rgba(56,74,110,0.5)', color: '#9AA6BC', cursor: 'pointer' }}>
        إلغاء
      </button>
    </div>
  );
}
