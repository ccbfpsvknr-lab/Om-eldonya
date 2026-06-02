import { create } from 'zustand';
import type { GameMode, Player as LobbyPlayer } from '@/types';
import type { BoardSize, Game, Player } from '@/game/types';
import {
  advanceTurn, createGame, getCurrentPlayer, resolveMove, rollDie,
} from '@/game/engine';
import { computeRegionOwners, getCityRent, isRegionComplete } from '@/game/engine/economyEngine';
import { canUpgrade, getUpgradeCost, stripRegionUpgrades } from '@/game/engine/upgradeEngine';
import { buildShuffledDeck, getCard } from '@/game/data/chanceCards';

const SALFA_AMOUNT = 2000;
const TAX_AMOUNT = 500;
const NEWS_EVENTS = [
  { id: 'NE1', title: 'ارتفاع الأسعار 📈', text: 'الإيجارات زادت ٢٥٪ لـ ٣ جولات!', rentMult: 1.25, cash: 0, rounds: 3 },
  { id: 'NE2', title: 'أزمة اقتصادية 📉', text: 'كل لاعب يدفع ٥٠٠!', rentMult: 1, cash: -500, rounds: 1 },
  { id: 'NE3', title: 'انتعاش اقتصادي 🎉', text: 'كل لاعب يقبض ٥٠٠!', rentMult: 1, cash: 500, rounds: 1 },
  { id: 'NE4', title: 'مشروع وطني 🏗️', text: 'إيجارات أرخص ٢٥٪ لـ ٣ جولات', rentMult: 0.75, cash: 0, rounds: 3 },
];

export interface CreateMatchInput {
  mode: GameMode; players: LobbyPlayer[];
  boardSize?: BoardSize; startingCash?: number;
}

interface MatchState {
  game: Game | null;
  createMatch: (input: CreateMatchInput) => void;
  resetMatch: () => void;
  rollDice: () => number | null;
  moveCurrentPlayer: (steps: number) => void;
  rollAndMove: () => number | null;
  endTurn: () => void;
  buyCity: (cityId: string) => void;
  payRent: (cityId: string) => { amount: number; toPlayerId: string } | null;
  upgradeCity: (cityId: string) => void;
  sellCity: (cityId: string) => number;
  goToJail: (playerId: string) => void;
  releaseFromJail: (playerId: string, paid: boolean) => void;
  decrementJailTurns: (playerId: string) => void;
  takeSalfa: (playerId: string) => void;
  bankruptPlayer: (playerId: string) => void;
  payTax: () => number;
  drawAndApplyChanceCard: () => { cardId: string; effect: string } | null;
  executeTrade: (
    fromId: string, toId: string,
    offerCityIds: string[], offerCash: number,
    requestCityIds: string[], requestCash: number,
  ) => void;
  triggerNewsEvent: () => void;
  setWinner: (playerId: string | null) => void;
  pendingNewsEvent: typeof NEWS_EVENTS[0] | null;
}

function withGame(
  set: (fn: (s: MatchState) => Partial<MatchState>) => void,
  fn: (game: Game) => Partial<Game> | void,
) {
  set((s) => {
    if (!s.game) return s;
    const patch = fn(s.game);
    return patch ? { game: { ...s.game, ...patch } } : s;
  });
}

export const useMatchStore = create<MatchState>((set, get) => ({
  game: null,
  pendingNewsEvent: null,

  createMatch: (input) => set(() => ({ game: createGame(input) })),
  resetMatch: () => set(() => ({ game: null })),

  rollDice: () => {
    const game = get().game;
    if (!game) return null;
    const value = rollDie();
    set((s) => s.game ? {
      game: {
        ...s.game, phase: 'moving',
        dice: { value, rolling: false, rollCount: s.game.dice.rollCount + 1 },
        statistics: { ...s.game.statistics, rolls: s.game.statistics.rolls + 1 },
      }
    } : s);
    return value;
  },

  moveCurrentPlayer: (steps) => set((s) => {
    if (!s.game) return s;
    const game = s.game;
    const idx = game.currentPlayerIndex;
    const player = game.players[idx];
    if (!player) return s;

    const move = resolveMove(player.position, steps, game.boardSize);

    // Salary at Ramses: goes to salfa debt first
    let cashGain = move.salary;
    let newDebt = player.solfaDebt;
    if (newDebt > 0 && cashGain > 0) {
      const payment = Math.min(cashGain, newDebt);
      newDebt -= payment;
      cashGain -= payment;
    }

    const players = game.players.map((p, i) => i === idx ? {
      ...p,
      position: move.toIndex,
      cash: p.cash + cashGain,
      solfaDebt: newDebt,
      laps: p.laps + (move.passedRamses ? 1 : 0),
      totalEarned: p.totalEarned + cashGain,
    } : p);

    return {
      game: {
        ...game, players, phase: 'turn-end',
        statistics: {
          ...game.statistics,
          totalMoves: game.statistics.totalMoves + steps,
          ramsesPasses: game.statistics.ramsesPasses + (move.passedRamses ? 1 : 0),
        },
      }
    };
  }),

  rollAndMove: () => {
    const value = get().rollDice();
    if (value == null) return null;
    get().moveCurrentPlayer(value);
    return value;
  },

  endTurn: () => set((s) => {
    if (!s.game) return s;
    const game = s.game;

    // Tick news event countdown
    let newsRentMultiplier = game.newsRentMultiplier;
    let activeNewsEvent = game.activeNewsEvent;
    if (activeNewsEvent) {
      const remaining = activeNewsEvent.roundsLeft - 1;
      if (remaining <= 0) {
        activeNewsEvent = null;
        newsRentMultiplier = 1;
      } else {
        activeNewsEvent = { ...activeNewsEvent, roundsLeft: remaining };
      }
    }

    const { currentPlayerIndex, round } = advanceTurn(game);

    // Check for a winner (only 1 active player)
    const activePlayers = game.players.filter((p) => p.isActive);
    let winnerId = game.winnerId;
    let phase: typeof game.phase = 'rolling';
    if (activePlayers.length === 1 && game.players.length > 1) {
      winnerId = activePlayers[0].id;
      phase = 'finished';
    }

    // Trigger news event every 5 rounds in Full mode (if none active)
    const shouldTrigger = game.mode === 'full' && round % 5 === 0 && round !== game.round && !activeNewsEvent;
    const pendingNewsEvent = shouldTrigger
      ? NEWS_EVENTS[Math.floor(Math.random() * NEWS_EVENTS.length)]
      : null;

    return {
      game: {
        ...game, currentPlayerIndex, round, phase, winnerId,
        activeNewsEvent, newsRentMultiplier,
        dice: { ...game.dice, value: null, rolling: false },
        tradeUsedThisTurn: false,
      },
      pendingNewsEvent,
    };
  }),

  buyCity: (cityId) => set((s) => {
    if (!s.game) return s;
    const game = s.game;
    const idx = game.currentPlayerIndex;
    const buyer = game.players[idx];
    const city = game.cities[cityId];
    if (!buyer || !city || city.ownerId !== null || buyer.cash < city.price) return s;

    const players = game.players.map((p, i) =>
      i === idx ? { ...p, cash: p.cash - city.price } : p
    );
    const cities = { ...game.cities, [cityId]: { ...city, ownerId: buyer.id } };
    const next = { ...game, players, cities };
    const regionOwners = {
      ...(game.regionOwners ?? {}),
      [city.region]: isRegionComplete(next, city.region, buyer.id) ? buyer.id : null,
    };
    return { game: { ...next, regionOwners } };
  }),

  payRent: (cityId) => {
    const game = get().game;
    if (!game) return null;
    const idx = game.currentPlayerIndex;
    const payer = game.players[idx];
    const city = game.cities[cityId];
    if (!payer || !city || city.ownerId === null || city.ownerId === payer.id) return null;

    // Rent-free pass from chance card
    if (payer.hasRentFreePass) {
      set((s) => s.game ? {
        game: { ...s.game, players: s.game.players.map((p, i) =>
          i === idx ? { ...p, hasRentFreePass: false } : p
        )}
      } : s);
      return null;
    }

    const ownerId = city.ownerId;
    const amount = getCityRent(game, city);
    if (amount <= 0) return null;

    const players = game.players.map((p) => {
      if (p.id === payer.id) return { ...p, cash: p.cash - amount };
      if (p.id === ownerId) return { ...p, cash: p.cash + amount, totalEarned: p.totalEarned + amount };
      return p;
    });
    set({ game: { ...game, players } });
    return { amount, toPlayerId: ownerId };
  },

  upgradeCity: (cityId) => set((s) => {
    if (!s.game) return s;
    const game = s.game;
    const idx = game.currentPlayerIndex;
    const player = game.players[idx];
    const city = game.cities[cityId];
    if (!player || !city || !canUpgrade(game, city, player.id)) return s;
    const cost = getUpgradeCost(city);
    if (player.cash < cost) return s;
    const players = game.players.map((p, i) => i === idx ? { ...p, cash: p.cash - cost } : p);
    const cities = { ...game.cities, [cityId]: { ...city, level: city.level + 1 } };
    return { game: { ...game, players, cities } };
  }),

  sellCity: (cityId) => {
    const game = get().game;
    if (!game) return 0;
    const city = game.cities[cityId];
    const player = game.players.find((p) => p.id === city?.ownerId);
    if (!city || !player) return 0;

    // Strip upgrades in this region if it breaks the set
    const { updatedCities, refund } = stripRegionUpgrades(
      { ...game.cities, [cityId]: { ...city, level: 0 } },
      city.region,
      player.id
    );

    const salePrice = Math.round(city.price * 0.5);
    const totalGain = salePrice + refund;

    const releasedCities = {
      ...updatedCities,
      [cityId]: { ...updatedCities[cityId], ownerId: null, level: 0 },
    };
    const players = game.players.map((p) =>
      p.id === player.id ? { ...p, cash: p.cash + totalGain } : p
    );
    const regionOwners = computeRegionOwners({ ...game, cities: releasedCities });
    set({ game: { ...game, players, cities: releasedCities, regionOwners } });
    return totalGain;
  },

  goToJail: (playerId) => set((s) => {
    if (!s.game) return s;
    const isFast = s.game.mode === 'quick';
    const players = s.game.players.map((p) =>
      p.id === playerId ? {
        ...p,
        position: s.game!.jailTileIndex,
        jailTurns: isFast ? 1 : 3,
        jailCount: p.jailCount + 1,
      } : p
    );
    return { game: { ...s.game, players } };
  }),

  releaseFromJail: (playerId, paid) => set((s) => {
    if (!s.game) return s;
    const players = s.game.players.map((p) => {
      if (p.id !== playerId) return p;
      const cash = paid ? p.cash - 500 : p.cash;
      return { ...p, jailTurns: 0, cash };
    });
    return { game: { ...s.game, players } };
  }),

  decrementJailTurns: (playerId) => set((s) => {
    if (!s.game) return s;
    const players = s.game.players.map((p) =>
      p.id === playerId ? { ...p, jailTurns: Math.max(0, p.jailTurns - 1) } : p
    );
    return { game: { ...s.game, players } };
  }),

  takeSalfa: (playerId) => set((s) => {
    if (!s.game) return s;
    const players = s.game.players.map((p) =>
      p.id === playerId ? {
        ...p, cash: p.cash + SALFA_AMOUNT,
        solfaDebt: p.solfaDebt + SALFA_AMOUNT,
      } : p
    );
    return { game: { ...s.game, players } };
  }),

  bankruptPlayer: (playerId) => set((s) => {
    if (!s.game) return s;
    // Release all their cities back to the bank
    const cities = { ...s.game.cities };
    for (const [id, city] of Object.entries(cities)) {
      if (city.ownerId === playerId) {
        cities[id] = { ...city, ownerId: null, level: 0 };
      }
    }
    const players = s.game.players.map((p) =>
      p.id === playerId ? { ...p, isActive: false, cash: 0, solfaDebt: 0 } : p
    );
    const regionOwners = computeRegionOwners({ ...s.game, cities });
    return { game: { ...s.game, players, cities, regionOwners } };
  }),

  payTax: () => {
    const game = get().game;
    if (!game) return 0;
    const idx = game.currentPlayerIndex;
    const player = game.players[idx];
    if (!player) return 0;
    const amount = Math.min(TAX_AMOUNT, player.cash);
    const players = game.players.map((p, i) =>
      i === idx ? { ...p, cash: p.cash - amount } : p
    );
    set({ game: { ...game, players } });
    return amount;
  },

  drawAndApplyChanceCard: () => {
    const game = get().game;
    if (!game) return null;

    let deck = [...game.chanceCardDeck];
    if (deck.length === 0) deck = buildShuffledDeck();
    const cardId = deck.shift()!;
    const card = getCard(cardId);

    const idx = game.currentPlayerIndex;
    let players = [...game.players];

    if (card.type === 'money' && card.amount) {
      players = players.map((p, i) => i === idx ? {
        ...p, cash: p.cash + card.amount!,
        totalEarned: card.amount! > 0 ? p.totalEarned + card.amount! : p.totalEarned,
      } : p);
      set({ game: { ...game, players, chanceCardDeck: deck } });
    } else if (card.type === 'bonus' && card.freePass) {
      players = players.map((p, i) => i === idx ? { ...p, hasRentFreePass: true } : p);
      set({ game: { ...game, players, chanceCardDeck: deck } });
    } else if (card.type === 'bonus' && card.rollAgain) {
      // rollAgain is handled in component; just update deck
      set({ game: { ...game, chanceCardDeck: deck } });
    } else if (card.type === 'move') {
      // Movement is handled in component (needs moveCurrentPlayer call)
      set({ game: { ...game, chanceCardDeck: deck } });
    } else if (card.type === 'police') {
      set({ game: { ...game, chanceCardDeck: deck } });
    } else if (card.type === 'govt' && card.amount) {
      players = players.map((p, i) => i === idx ? { ...p, cash: p.cash + card.amount! } : p);
      set({ game: { ...game, players, chanceCardDeck: deck } });
    } else {
      set({ game: { ...game, chanceCardDeck: deck } });
    }
    return { cardId, effect: card.title };
  },

  executeTrade: (fromId, toId, offerCityIds, offerCash, requestCityIds, requestCash) => set((s) => {
    if (!s.game) return s;
    let cities = { ...s.game.cities };
    let players = [...s.game.players];

    // Transfer cities
    offerCityIds.forEach((id) => { cities[id] = { ...cities[id], ownerId: toId, level: 0 }; });
    requestCityIds.forEach((id) => { cities[id] = { ...cities[id], ownerId: fromId, level: 0 }; });

    // Strip upgrades for any region involved (ownership breaks)
    const regionsAffected = new Set([
      ...offerCityIds.map((id) => cities[id].region),
      ...requestCityIds.map((id) => cities[id].region),
    ]);
    for (const region of regionsAffected) {
      const r1 = stripRegionUpgrades(cities, region, fromId);
      cities = r1.updatedCities;
      const r2 = stripRegionUpgrades(cities, region, toId);
      cities = r2.updatedCities;
      // Refunds absorbed (no cash change for simplicity)
    }

    // Transfer cash
    players = players.map((p) => {
      if (p.id === fromId) return { ...p, cash: p.cash - offerCash + requestCash, tradesCompleted: p.tradesCompleted + 1 };
      if (p.id === toId) return { ...p, cash: p.cash - requestCash + offerCash, tradesCompleted: p.tradesCompleted + 1 };
      return p;
    });

    const regionOwners = computeRegionOwners({ ...s.game, cities });
    return { game: { ...s.game, players, cities, regionOwners, tradeUsedThisTurn: true } };
  }),

  triggerNewsEvent: () => set((s) => {
    if (!s.game || !s.pendingNewsEvent) return s;
    const event = s.pendingNewsEvent;
    let players = [...s.game.players];
    if (event.cash !== 0) {
      players = players.map((p) => p.isActive ? {
        ...p, cash: p.cash + event.cash,
        totalEarned: event.cash > 0 ? p.totalEarned + event.cash : p.totalEarned,
      } : p);
    }
    return {
      game: {
        ...s.game, players,
        activeNewsEvent: { eventId: event.id, roundsLeft: event.rounds },
        newsRentMultiplier: event.rentMult,
      },
      pendingNewsEvent: null,
    };
  }),

  setWinner: (playerId) => set((s) => s.game ? {
    game: {
      ...s.game, winnerId: playerId, phase: 'finished',
      statistics: { ...s.game.statistics, finishedAt: Date.now() },
    }
  } : s),
}));

export { SALFA_AMOUNT, TAX_AMOUNT, NEWS_EVENTS };
export const selectGame = (s: MatchState): Game | null => s.game;
export const selectCurrentPlayer = (s: MatchState): Player | undefined =>
  s.game ? getCurrentPlayer(s.game) : undefined;
export const selectIsFinished = (s: MatchState): boolean => s.game?.phase === 'finished';
