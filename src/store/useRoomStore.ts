import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Game } from '@/game/types';

export interface RoomPlayer {
  userId:    string;
  nickname:  string;
  color:     string;
  vehicle:   string;
  seat:      number;
  isOnline:  boolean;
  isHost:    boolean;
  isBot:     boolean;
}

export interface Room {
  id:          string;
  code:        string;
  hostId:      string;
  mode:        'quick' | 'classic';
  status:      'waiting' | 'playing' | 'finished';
  gameState:   Game | null;
  players:     RoomPlayer[];
}

interface RoomState {
  room:        Room | null;
  myUserId:    string | null;
  loading:     boolean;
  error:       string | null;
  channel:     RealtimeChannel | null;

  createRoom:   (userId: string, nickname: string, mode: 'quick' | 'classic') => Promise<string | null>;
  joinRoom:     (code: string, userId: string, nickname: string) => Promise<string | null>;
  leaveRoom:    ()                                                              => Promise<void>;
  setMode:      (mode: 'quick' | 'classic')                                   => Promise<void>;
  startGame:    (gameState: Game)                                              => Promise<void>;
  broadcastAction: (event: string, payload: unknown)                          => void;
  pushGameState:   (game: Game)                                               => Promise<void>;
  subscribe:    (onEvent: (event: string, payload: unknown) => void,
                 onStateChange: (game: Game) => void,
                 onPlayersChange: (players: RoomPlayer[]) => void) => void;
  unsubscribe:  () => void;
  markDisconnected: (userId: string) => void;
  markReconnected:  (userId: string) => void;
  addBot:           ()               => Promise<void>;
  removeBot:        (userId: string) => Promise<void>;
}

// Generate readable 4-char room code
function genCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room:      null,
  myUserId:  null,
  loading:   false,
  error:     null,
  channel:   null,

  createRoom: async (userId, nickname, mode) => {
    set({ loading: true, error: null });
    try {
      // Generate unique code
      let code = genCode();
      for (let i = 0; i < 5; i++) {
        const { data } = await supabase.from('rooms').select('id').eq('code', code).single();
        if (!data) break;
        code = genCode();
      }

      const { data: room, error } = await supabase.from('rooms').insert({
        code, host_id: userId, mode, status: 'waiting',
      }).select().single();
      if (error || !room) return error?.message ?? 'خطأ في إنشاء الغرفة';

      await supabase.from('room_players').insert({
        room_id: room.id, user_id: userId, nickname,
        color: '#E8C040', vehicle: '🚗', seat: 0, is_online: true, is_host: true,
      });

      const myRoom: Room = {
        id: room.id, code: room.code, hostId: userId, mode,
        status: 'waiting', gameState: null,
        players: [{ userId, nickname, color: '#E8C040', vehicle: '🚗', seat: 0, isOnline: true, isHost: true }],
      };
      set({ room: myRoom, myUserId: userId, loading: false });
      return null;
    } catch (e: unknown) {
      set({ loading: false, error: String(e) });
      return String(e);
    }
  },

  joinRoom: async (code, userId, nickname) => {
    set({ loading: true, error: null });
    try {
      const { data: room } = await supabase.from('rooms')
        .select('*, room_players(*)').eq('code', code.toUpperCase()).single();
      if (!room) return 'الكود مش صح';
      if (room.status !== 'waiting') return 'اللعبة بدأت بالفعل';

      const existingPlayers: RoomPlayer[] = (room.room_players ?? []).map((p: Record<string, unknown>) => ({
        userId: p.user_id as string, nickname: p.nickname as string,
        color: p.color as string, vehicle: p.vehicle as string,
        seat: p.seat as number, isOnline: p.is_online as boolean, isHost: p.is_host as boolean, isBot: (p.is_bot as boolean) ?? false,
      }));
      if (existingPlayers.length >= 4) return 'الغرفة ممتلية';
      if (existingPlayers.find((p) => p.userId === userId)) {
        // Rejoin
        set({ room: { id: room.id, code: room.code, hostId: room.host_id, mode: room.mode,
          status: room.status, gameState: room.game_state, players: existingPlayers }, myUserId: userId, loading: false });
        return null;
      }

      const seat = existingPlayers.length;
      const colors = ['#E8C040', '#4FC3F7', '#81C784', '#FF8A65'];
      const vehicles = ['🚗', '🏎️', '🚕', '🚙'];
      await supabase.from('room_players').insert({
        room_id: room.id, user_id: userId, nickname,
        color: colors[seat], vehicle: vehicles[seat], seat, is_online: true, is_host: false,
      });

      const newPlayer: RoomPlayer = { userId, nickname, color: colors[seat], vehicle: vehicles[seat], seat, isOnline: true, isHost: false };
      set({ room: { id: room.id, code: room.code, hostId: room.host_id, mode: room.mode,
        status: room.status, gameState: room.game_state, players: [...existingPlayers, newPlayer] }, myUserId: userId, loading: false });
      return null;
    } catch (e: unknown) {
      set({ loading: false, error: String(e) });
      return String(e);
    }
  },

  leaveRoom: async () => {
    const { room, myUserId, channel } = get();
    if (channel) { await supabase.removeChannel(channel); }
    if (room && myUserId) {
      await supabase.from('room_players').delete().eq('room_id', room.id).eq('user_id', myUserId);
    }
    set({ room: null, myUserId: null, channel: null });
  },

  setMode: async (mode) => {
    const { room } = get();
    if (!room) return;
    await supabase.from('rooms').update({ mode }).eq('id', room.id);
    set({ room: { ...room, mode } });
  },

  startGame: async (gameState) => {
    const { room } = get();
    if (!room) return;
    await supabase.from('rooms').update({ status: 'playing', game_state: gameState }).eq('id', room.id);
    set({ room: { ...room, status: 'playing', gameState } });
  },

  pushGameState: async (game) => {
    const { room, channel } = get();
    if (!room) return;
    await supabase.from('rooms').update({ game_state: game }).eq('id', room.id);
    if (channel) {
      channel.send({ type: 'broadcast', event: 'game_state', payload: { game } });
    }
    set({ room: { ...room, gameState: game } });
  },

  broadcastAction: (event, payload) => {
    const { channel } = get();
    if (channel) channel.send({ type: 'broadcast', event, payload });
  },

  subscribe: (onEvent, onStateChange, onPlayersChange) => {
    const { room, myUserId } = get();
    if (!room) return;

    const ch = supabase.channel(`room:${room.code}`, {
      config: { presence: { key: myUserId ?? 'guest' } },
    });

    // Presence — online/offline tracking
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState();
      const onlineIds = new Set(Object.keys(state));
      const { room: r } = get();
      if (!r) return;
      const updated = r.players.map((p) => ({ ...p, isOnline: onlineIds.has(p.userId) }));
      set({ room: { ...r, players: updated } });
      onPlayersChange(updated);
    });

    // Game state broadcast
    ch.on('broadcast', { event: 'game_state' }, ({ payload }) => {
      if (payload?.game) {
        onStateChange(payload.game as Game);
        const { room: r } = get();
        if (r) set({ room: { ...r, gameState: payload.game as Game } });
      }
    });

    // Custom game events (dice, animation hints, etc.)
    ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
      if (event !== 'game_state') onEvent(event, payload);
    });

    // Room updates (players joining/leaving, mode change, game start)
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'room_players',
      filter: `room_id=eq.${room.id}` }, async () => {
      const { data } = await supabase.from('room_players').select('*').eq('room_id', room.id);
      if (data) {
        const players: RoomPlayer[] = data.map((p) => ({
          userId: p.user_id, nickname: p.nickname, color: p.color,
          vehicle: p.vehicle, seat: p.seat, isOnline: p.is_online, isHost: p.is_host, isBot: p.is_bot ?? false,
        }));
        const { room: r } = get();
        if (r) set({ room: { ...r, players } });
        onPlayersChange(players);
      }
    });

    ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms',
      filter: `id=eq.${room.id}` }, ({ new: updated }) => {
      const { room: r } = get();
      if (!r) return;
      if (updated.game_state && updated.status === 'playing') {
        onStateChange(updated.game_state as Game);
        set({ room: { ...r, status: updated.status, mode: updated.mode, gameState: updated.game_state } });
      } else {
        set({ room: { ...r, status: updated.status, mode: updated.mode } });
      }
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ userId: myUserId, online_at: new Date().toISOString() });
      }
    });

    set({ channel: ch });
  },

  unsubscribe: () => {
    const { channel } = get();
    if (channel) supabase.removeChannel(channel);
    set({ channel: null });
  },


  addBot: async () => {
    const { room } = get();
    if (!room || room.players.length >= 4) return;
    const BOT_NAMES = ['الروبوت','سكاي نت','هال 9000','ذكاء','بوت ماكس','برو بوت'];
    const seat = room.players.length;
    const colors = ['#E8C040','#4FC3F7','#81C784','#FF8A65'];
    const vehicles = ['🚗','🏎️','🚕','🚙'];
    const botId = `bot_${Date.now()}`;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    await supabase.from('room_players').insert({
      room_id: room.id, user_id: botId, nickname: botName,
      color: colors[seat], vehicle: vehicles[seat], seat, is_online: true, is_host: false, is_bot: true,
    });
    const newBot: RoomPlayer = { userId: botId, nickname: botName, color: colors[seat],
      vehicle: vehicles[seat], seat, isOnline: true, isHost: false, isBot: true };
    set({ room: { ...room, players: [...room.players, newBot] } });
  },

  removeBot: async (userId) => {
    const { room } = get();
    if (!room) return;
    await supabase.from('room_players').delete().eq('room_id', room.id).eq('user_id', userId);
    set({ room: { ...room, players: room.players.filter((p) => p.userId !== userId) } });
  },

  markDisconnected: (userId) => {
    supabase.from('room_players').update({ is_online: false }).eq('user_id', userId);
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, players: room.players.map((p) => p.userId === userId ? { ...p, isOnline: false } : p) } });
  },

  markReconnected: (userId) => {
    supabase.from('room_players').update({ is_online: true }).eq('user_id', userId);
    const { room } = get();
    if (!room) return;
    set({ room: { ...room, players: room.players.map((p) => p.userId === userId ? { ...p, isOnline: true } : p) } });
  },
}));
