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
  signIn:          (email: string, password: string)                    => Promise<string | null>;
  signOut:         ()                                                    => Promise<void>;
  resetPassword:   (email: string)                                       => Promise<string | null>;
  updateNickname:  (nickname: string)                                    => Promise<string | null>;
  refreshProfile:  ()                                                    => Promise<void>;
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
      // Check username uniqueness first
      const { data: existing } = await supabase
        .from('profiles').select('id').eq('username', username).single();
      if (existing) return 'اسم المستخدم ده موجود بالفعل، جرب تاني';

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, nickname } },
      });
      if (error) return translateError(error.message);
      return null; // success
    } finally {
      set({ loading: false });
    }
  },

  signIn: async (email, password) => {
    set({ loading: true });
    try {
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
  if (msg.includes('Invalid login'))   return 'الإيميل أو الباسورد غلط';
  if (msg.includes('Email not confirmed')) return 'لازم تأكد الإيميل الأول';
  if (msg.includes('already registered')) return 'الإيميل ده متسجل بالفعل';
  if (msg.includes('Password should'))  return 'الباسورد لازم يكون ٦ حروف على الأقل';
  if (msg.includes('rate limit'))       return 'حاول تاني بعد شوية';
  if (msg.includes('network'))          return 'فيه مشكلة في الإنترنت';
  return 'حصل خطأ، حاول تاني';
}
