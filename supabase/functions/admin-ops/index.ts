// Supabase Edge Function — admin-ops
// Handles user creation, password reset, and deletion using service role key.
// Only callable by users with is_admin = true in profiles.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    // 1. Verify caller is an authenticated admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Missing auth' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const { data: profile } = await callerClient
      .from('profiles').select('is_admin').eq('id', user.id).single();
    if (!profile?.is_admin) return json({ error: 'Admin only' }, 403);

    // 2. Admin client with service role key
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action, ...payload } = await req.json();

    // ── CREATE USER ──────────────────────────────────────────────────────────
    if (action === 'create_user') {
      const { username, nickname, password, email } = payload;
      const resolvedEmail = email?.trim() || `${username}@om-eldonya.internal`;

      const { data, error } = await admin.auth.admin.createUser({
        email: resolvedEmail,
        password,
        email_confirm: true,        // pre-confirmed, no email needed
        user_metadata: { username: username.toLowerCase(), nickname: nickname || username },
      });
      if (error) return json({ error: error.message }, 400);
      return json({ userId: data.user?.id });
    }

    // ── RESET PASSWORD ───────────────────────────────────────────────────────
    if (action === 'reset_password') {
      const { userId, newPassword } = payload;
      const { error } = await admin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    // ── DELETE USER ──────────────────────────────────────────────────────────
    if (action === 'delete_user') {
      const { userId } = payload;
      const { error } = await admin.auth.admin.deleteUser(userId);
      if (error) return json({ error: error.message }, 400);
      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err: unknown) {
    return json({ error: String(err) }, 500);
  }
});
