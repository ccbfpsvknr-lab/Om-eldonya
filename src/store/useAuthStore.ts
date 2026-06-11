import { create } from 'zustand';
import type { User, Session } from '@supabase/supabase-js';
import { supabase, type Profile } from '@/lib/supabase';

interface AuthState {
  user:        User    | null;
  profile:     Profile | null;
  session:     Session | null;
  initialized: boolean;
  loading:     boolean;

  initialize:      ()                                                    => Promise<void>;
  signUp:          (email: string, password: string, username: string, nickname: string) => Promise<string | null>;
  signIn:          (emailOrUsername: string, password: string)          => Promise<string | null>;
  signOut:         ()                                                    => Promise<void>;
  resetPassword:   (email: string)                                       => Promise<string | null>;
  updateNickname:  (nickname: string)                                    => Promise<string | null>;
  refreshProfile:  ()                                                    => Promise<void>;
  getAllUsers:      ()                                                    => Promise<Profile[]>;
  callAdminOp:     (action: string, payload: Record<string, unknown>)   => Promise<{ error?: string } & Record<string, unknown>>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user:        null,
  profile:     null,
  session:     null,
  initialized: false,
  loading:     false,

  initialize: async () => {
    // Check existing session (auto-login)
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', session.user.id).single();
      set({ user: session.user, session, profile: data ?? null });
    }
    set({ initialized: true });

    // Listen for future auth changes (logout, token refresh, etc.)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('profiles').select('*').eq('id', session.user.id).single();
        set({ user: session.user, session, profile: data ?? null });
      } else {
        set({ user: null, session: null, profile: null });
      }
    });
  },

  signUp: async (email, password, username, nickname) => {
    set({ loading: true });
    try {
      // Normalize username to lowercase (case-insensitive)
      const normalizedUsername = username.trim().toLowerCase();

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username: normalizedUsername, nickname: nickname.trim() } },
      });
      if (error) {
        // Show raw error for debugging — remove after fixing
        return `${error.message || JSON.stringify(error)}`;
      }
      return null;
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (emailOrUsername, password) => {
    set({ loading: true });
    try {
      let email = emailOrUsername.trim().toLowerCase();
      // If not an email, look up by username
      if (!email.includes('@')) {
        const { data, error: lookupErr } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', email)
          .single();
        if (lookupErr || !data?.email) return 'مش لاقيين اسم المستخدم ده';
        email = data.email;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return translateError(error.message);
      return null;
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, session: null });
  },

  resetPassword: async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) return translateError(error.message);
    return null;
  },

  updateNickname: async (nickname) => {
    const { user, profile } = get();
    if (!user || !profile) return 'مش متسجل دخول';
    if ((profile.coins ?? 0) < 50) return 'مش عندك كفاية عملات (محتاج ٥٠)';

    const { error } = await supabase
      .from('profiles')
      .update({ nickname, coins: profile.coins - 50 })
      .eq('id', user.id);
    if (error) return translateError(error.message);

    set({ profile: { ...profile, nickname, coins: profile.coins - 50 } });
    return null;
  },

  getAllUsers: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });
    return (data ?? []) as Profile[];
  },

  callAdminOp: async (action, payload) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return { error: 'Not logged in' };
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-ops`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ action, ...payload }),
    });
    return await res.json();
  },

  refreshProfile: async () => {
    const { user } = get();
    if (!user) return;
    const { data } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    if (data) set({ profile: data });
  },
}));

// Translate common Supabase errors to Arabic
function translateError(msg: string): string {
  if (msg.includes('Invalid login'))        return 'اسم المستخدم أو الباسورد غلط';
  if (msg.includes('Email not confirmed'))  return 'لازم تأكد الإيميل الأول، افتح الإيميل واضغط اللينك';
  if (msg.includes('already registered') ||
      msg.includes('already been registered')) return 'الإيميل ده متسجل بالفعل، حاول تدخل';
  if (msg.includes('Password should'))      return 'الباسورد لازم يكون ٦ حروف على الأقل';
  if (msg.includes('rate limit'))           return 'حاول تاني بعد شوية';
  if (msg.includes('network'))              return 'فيه مشكلة في الإنترنت';
  if (msg.includes('Database error'))       return 'خطأ في الحساب — ممكن اسم المستخدم ده موجود بالفعل';
  if (msg.includes('duplicate') ||
      msg.includes('unique'))               return 'اسم المستخدم ده موجود بالفعل، جرب تاني';
  if (msg.includes('User already registered')) return 'الإيميل ده متسجل بالفعل';
  return 'حصل خطأ، حاول تاني';
}
