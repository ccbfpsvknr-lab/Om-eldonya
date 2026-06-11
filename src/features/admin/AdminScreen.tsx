import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import type { Profile } from '@/lib/supabase';
import { ROUTES } from '@/lib/constants';

type View = 'list' | 'add';

const S = {
  page: {
    minHeight: '100dvh', background: '#0E1726', padding: '16px',
    fontFamily: "'Cairo', sans-serif", direction: 'rtl' as const,
    color: '#EADBB7',
  },
  card: {
    background: 'rgba(22,34,58,0.9)', border: '1px solid rgba(56,74,110,0.5)',
    borderRadius: 16, padding: '16px',
  },
  input: {
    width: '100%', background: 'rgba(14,23,38,0.9)',
    border: '1px solid rgba(56,74,110,0.6)', borderRadius: 10,
    padding: '10px 12px', color: '#EADBB7',
    fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem', outline: 'none',
    boxSizing: 'border-box' as const,
  },
  label: { fontSize: '0.78rem', color: '#9AA6BC', fontWeight: 700, display: 'block' as const, marginBottom: 4 },
  btnGold: {
    padding: '10px 18px', borderRadius: 10, border: 'none',
    background: 'linear-gradient(135deg, #E8C040, #C49020)',
    color: '#0E1726', fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.9rem',
    cursor: 'pointer',
  },
  btnRed: {
    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(199,91,57,0.4)',
    background: 'rgba(199,91,57,0.1)', color: '#F4A38A',
    fontFamily: "'Cairo'", fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
  },
  btnGray: {
    padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(56,74,110,0.5)',
    background: 'transparent', color: '#9AA6BC',
    fontFamily: "'Cairo'", fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
  },
};

export function AdminScreen() {
  const navigate   = useNavigate();
  const { profile, getAllUsers, callAdminOp } = useAuthStore();
  const [view, setView]       = useState<View>('list');
  const [users, setUsers]     = useState<(Profile & { auth_id?: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]         = useState('');
  const [isErr, setIsErr]     = useState(false);

  // Add user form
  const [newUser, setNewUser] = useState({ username: '', nickname: '', password: '', email: '' });

  // Reset password inline
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [newPass, setNewPass]         = useState('');

  // Guard: redirect non-admins
  useEffect(() => {
    if (profile && !profile.is_admin) navigate(ROUTES.home);
  }, [profile, navigate]);

  const loadUsers = async () => {
    setLoading(true);
    const list = await getAllUsers();
    setUsers(list as any);
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const showMsg = (text: string, err = false) => {
    setMsg(text); setIsErr(err);
    setTimeout(() => setMsg(''), 3500);
  };

  const handleCreate = async () => {
    if (!newUser.username || !newUser.password) { showMsg('اسم المستخدم والباسورد مطلوبين', true); return; }
    if (newUser.password.length < 6) { showMsg('الباسورد ٦ حروف على الأقل', true); return; }
    setLoading(true);
    const res = await callAdminOp('create_user', {
      username: newUser.username.toLowerCase().trim(),
      nickname: newUser.nickname.trim() || newUser.username,
      password: newUser.password,
      email: newUser.email.trim() || undefined,
    });
    setLoading(false);
    if (res.error) { showMsg(res.error as string, true); return; }
    showMsg(`تم إنشاء حساب ${newUser.username} ✓`);
    setNewUser({ username: '', nickname: '', password: '', email: '' });
    setView('list');
    loadUsers();
  };

  const handleResetPassword = async (userId: string) => {
    if (!newPass || newPass.length < 6) { showMsg('الباسورد ٦ حروف على الأقل', true); return; }
    setLoading(true);
    const res = await callAdminOp('reset_password', { userId, newPassword: newPass });
    setLoading(false);
    if (res.error) { showMsg(res.error as string, true); return; }
    showMsg('تم تغيير الباسورد ✓');
    setResetTarget(null);
    setNewPass('');
  };

  const handleDelete = async (userId: string, username: string) => {
    if (!window.confirm(`هتمسح حساب ${username}؟`)) return;
    setLoading(true);
    const res = await callAdminOp('delete_user', { userId });
    setLoading(false);
    if (res.error) { showMsg(res.error as string, true); return; }
    showMsg(`تم مسح ${username} ✓`);
    loadUsers();
  };

  if (!profile?.is_admin) return null;

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <button onClick={() => navigate(ROUTES.home)} style={S.btnGray}>← رجوع</button>
        <h1 style={{ flex: 1, margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#E0B43C' }}>
          🔐 لوحة الإدارة
        </h1>
        <span style={{ fontSize: '0.75rem', color: '#9AA6BC' }}>
          {users.length} مستخدم
        </span>
      </div>

      {/* Feedback */}
      {msg && (
        <div style={{
          marginBottom: 14, borderRadius: 10, padding: '10px 14px', textAlign: 'center',
          background: isErr ? 'rgba(199,91,57,0.15)' : 'rgba(16,185,129,0.12)',
          border: `1px solid ${isErr ? 'rgba(199,91,57,0.4)' : 'rgba(16,185,129,0.35)'}`,
          color: isErr ? '#F4A38A' : '#6EE7B7', fontSize: '0.85rem',
        }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
        {(['list', 'add'] as View[]).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{
            padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.9rem',
            background: view === v ? 'linear-gradient(135deg, #E8C040, #C49020)' : 'rgba(22,34,58,0.8)',
            color: view === v ? '#0E1726' : '#9AA6BC',
          }}>
            {v === 'list' ? '👥 المستخدمين' : '➕ مستخدم جديد'}
          </button>
        ))}
      </div>

      {/* ── USER LIST ── */}
      {view === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {loading && <p style={{ textAlign: 'center', color: '#9AA6BC' }}>جاري التحميل...</p>}
          {users.map((u) => (
            <div key={u.id} style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#F4CE5E' }}>
                    {u.nickname || u.username}
                    {u.is_admin && <span style={{ marginRight: 6, fontSize: '0.7rem', background: 'rgba(224,180,60,0.2)', border: '1px solid rgba(224,180,60,0.4)', borderRadius: 4, padding: '1px 5px', color: '#E0B43C' }}>أدمن</span>}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#9AA6BC' }}>@{u.username}</div>
                  <div style={{ fontSize: '0.75rem', color: '#E0B43C', marginTop: 2 }}>
                    💰 {u.coins?.toLocaleString('en-US') ?? 0} عملة
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { setResetTarget(u.id); setNewPass(''); }} style={S.btnGray}>
                    🔑 باسورد
                  </button>
                  {!u.is_admin && (
                    <button onClick={() => handleDelete(u.id, u.username)} style={S.btnRed}>
                      🗑
                    </button>
                  )}
                </div>
              </div>

              {/* Inline password reset */}
              {resetTarget === u.id && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="password"
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="باسورد جديد"
                    style={{ ...S.input, flex: 1 }}
                  />
                  <button onClick={() => handleResetPassword(u.id)} disabled={loading} style={S.btnGold}>
                    حفظ
                  </button>
                  <button onClick={() => setResetTarget(null)} style={S.btnGray}>إلغاء</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── ADD USER ── */}
      {view === 'add' && (
        <div style={{ ...S.card, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={S.label}>اسم المستخدم *</label>
            <input style={S.input} value={newUser.username}
              onChange={(e) => setNewUser((p) => ({ ...p, username: e.target.value }))}
              placeholder="ahmed123" autoCapitalize="none" />
            <span style={{ fontSize: '0.72rem', color: 'rgba(154,166,188,0.5)', marginTop: 3, display: 'block' }}>
              إنجليزي بس — مش ممكن يتغير بعدين
            </span>
          </div>
          <div>
            <label style={S.label}>الاسم الظاهر</label>
            <input style={S.input} value={newUser.nickname}
              onChange={(e) => setNewUser((p) => ({ ...p, nickname: e.target.value }))}
              placeholder="الباشا" />
          </div>
          <div>
            <label style={S.label}>الإيميل (اختياري)</label>
            <input style={S.input} value={newUser.email} type="email"
              onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))}
              placeholder="example@gmail.com" autoCapitalize="none" />
            <span style={{ fontSize: '0.72rem', color: 'rgba(154,166,188,0.5)', marginTop: 3, display: 'block' }}>
              لو مفيش إيميل، هتعمل حساب بدونه
            </span>
          </div>
          <div>
            <label style={S.label}>الباسورد *</label>
            <input style={S.input} value={newUser.password} type="password"
              onChange={(e) => setNewUser((p) => ({ ...p, password: e.target.value }))}
              placeholder="••••••••" />
          </div>
          <button onClick={handleCreate} disabled={loading} style={{ ...S.btnGold, width: '100%', padding: '12px' }}>
            {loading ? '...' : '➕ إنشاء الحساب'}
          </button>
        </div>
      )}
    </div>
  );
}
