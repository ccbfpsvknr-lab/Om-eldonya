import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface FriendProfile {
  id:           string;
  username:     string;
  nickname:     string;
  lastSeenAt:   string | null;
  isOnline:     boolean;
}

export interface FriendRequest {
  id:           string;
  requesterId:  string;
  addresseeId:  string;
  status:       'pending' | 'accepted';
  createdAt:    string;
  profile:      FriendProfile;   // the other person
}

interface FriendsState {
  friends:        FriendProfile[];
  pending:        FriendRequest[];   // incoming requests
  sent:           FriendRequest[];   // outgoing pending
  searchResults:  FriendProfile[];
  loading:        boolean;

  loadFriends:    (myId: string)              => Promise<void>;
  searchUsers:    (query: string, myId: string) => Promise<void>;
  sendRequest:    (myId: string, toId: string) => Promise<string | null>;
  acceptRequest:  (requestId: string, myId: string) => Promise<void>;
  declineRequest: (requestId: string)          => Promise<void>;
  removeFriend:   (myId: string, friendId: string) => Promise<void>;
  clearSearch:    ()                           => void;
  updateLastSeen: (myId: string)               => Promise<void>;
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'مجهول';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 300)   return 'أونلاين';
  if (diff < 3600)  return `منذ ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 2592000) return `منذ ${Math.floor(diff / 86400)} يوم`;
  return `منذ ${Math.floor(diff / 2592000)} شهر`;
}

function toFriendProfile(p: Record<string, unknown>): FriendProfile {
  const last = p.last_seen_at as string | null;
  const diffSec = last ? (Date.now() - new Date(last).getTime()) / 1000 : Infinity;
  return {
    id:         p.id as string,
    username:   p.username as string,
    nickname:   p.nickname as string,
    lastSeenAt: last,
    isOnline:   diffSec < 300,
  };
}

export const useFriendsStore = create<FriendsState>((set) => ({
  friends:       [],
  pending:       [],
  sent:          [],
  searchResults: [],
  loading:       false,

  loadFriends: async (myId) => {
    set({ loading: true });
    // Get all accepted friendships where I'm involved
    const { data: accepted } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(id,username,nickname,last_seen_at), addressee:addressee_id(id,username,nickname,last_seen_at)')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${myId},addressee_id.eq.${myId}`);

    const friends: FriendProfile[] = (accepted ?? []).map((r) => {
      const other = r.requester_id === myId ? r.addressee : r.requester;
      return toFriendProfile(other as Record<string, unknown>);
    });

    // Get pending incoming requests
    const { data: inbound } = await supabase
      .from('friendships')
      .select('*, requester:requester_id(id,username,nickname,last_seen_at)')
      .eq('addressee_id', myId)
      .eq('status', 'pending');

    const pending: FriendRequest[] = (inbound ?? []).map((r) => ({
      id:          r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status:      r.status,
      createdAt:   r.created_at,
      profile:     toFriendProfile(r.requester as Record<string, unknown>),
    }));

    // Get pending outgoing requests
    const { data: outbound } = await supabase
      .from('friendships')
      .select('*, addressee:addressee_id(id,username,nickname,last_seen_at)')
      .eq('requester_id', myId)
      .eq('status', 'pending');

    const sent: FriendRequest[] = (outbound ?? []).map((r) => ({
      id:          r.id,
      requesterId: r.requester_id,
      addresseeId: r.addressee_id,
      status:      r.status,
      createdAt:   r.created_at,
      profile:     toFriendProfile(r.addressee as Record<string, unknown>),
    }));

    set({ friends, pending, sent, loading: false });
  },

  searchUsers: async (query, myId) => {
    if (!query.trim()) { set({ searchResults: [] }); return; }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, nickname, last_seen_at')
      .ilike('username', `%${query.trim()}%`)
      .neq('id', myId)
      .limit(10);
    set({ searchResults: (data ?? []).map(toFriendProfile) });
  },

  sendRequest: async (myId, toId) => {
    const { error } = await supabase.from('friendships').insert({
      requester_id: myId,
      addressee_id: toId,
      status: 'pending',
    });
    if (error) return error.message;
    return null;
  },

  acceptRequest: async (requestId, myId) => {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', requestId);
    await useFriendsStore.getState().loadFriends(myId);
  },

  declineRequest: async (requestId) => {
    await supabase.from('friendships').delete().eq('id', requestId);
    set((s) => ({ pending: s.pending.filter((r) => r.id !== requestId) }));
  },

  removeFriend: async (myId, friendId) => {
    await supabase.from('friendships').delete()
      .or(`and(requester_id.eq.${myId},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${myId})`);
    set((s) => ({ friends: s.friends.filter((f) => f.id !== friendId) }));
  },

  clearSearch: () => set({ searchResults: [] }),

  updateLastSeen: async (myId) => {
    await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', myId);
  },
}));

export { timeAgo };
