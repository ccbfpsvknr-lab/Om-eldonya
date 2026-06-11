import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { randomNickname } from '@/lib/nicknames';
import { ROUTES } from '@/lib/constants';

type Tab = 'login' | 'register' | 'reset';

export function AuthScreen() {
  const navigate   = useNavigate();
  const { signIn, signUp, resetPassword, loading } = useAuthStore();

  const [tab, setTab]         = useState<Tab>('login');
  const [email, setEmail]     = useState('');
  const [password, setPass]   = useState('');
  const [username, setUser]   = useState('');
  const [nickname, setNick]   = useState(() => randomNickname([]));
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');


  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleLogin = async () => {
    if (!email || !password) { setError('ادخل الإيميل والباسورد'); return; }
    clearMessages();
    const err = await signIn(email.trim(), password);
    if (err) setError(err);
    else navigate(ROUTES.home);
  };

  const handleRegister = async () => {
    if (!username || !nickname || !email || !password) { setError('اكمل كل الحقول'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { setError('اسم المستخدم إنجليزي بس (حروف وأرقام)'); return; }
    if (nickname.length > 10) { setError('الاسم الظاهر ١٠ حروف بحد أقصى'); return; }
    if (password.length < 6) { setError('الباسورد ٦ حروف على الأقل'); return; }
    clearMessages();
    const err = await signUp(email.trim(), password, username.trim().toLowerCase(), nickname.trim());
    if (err) setError(err);
    else setSuccess('تم إنشاء الحساب! 🎉 افتح إيميلك واضغط على اللينك عشان تفعّل الحساب، وبعدين ادخل.');
  };

  const handleReset = async () => {
    if (!email) { setError('ادخل الإيميل'); return; }
    clearMessages();
    const err = await resetPassword(email.trim());
    if (err) setError(err);
    else setSuccess('اتبعت رسالة على إيميلك، افتحها وغير الباسورد');
  };

  const btn = (text: string, onClick: () => void, gold = true) => (
    <button onClick={onClick} disabled={loading}
      style={{
        width: '100%', padding: '14px', borderRadius: 14,
        fontFamily: "'Cairo', sans-serif", fontSize: '1rem', fontWeight: 800,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1,
        background: gold ? 'linear-gradient(135deg, #E8C040, #C49020)' : 'rgba(22,34,58,0.8)',
        color: gold ? '#0E1726' : '#9AA6BC',
        border: gold ? 'none' : '1px solid rgba(56,74,110,0.5)',
        boxShadow: gold ? '0 4px 20px rgba(224,180,60,0.3)' : 'none',
        transition: 'opacity 0.2s',
      }}>
      {loading ? '...' : text}
    </button>
  );

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: { type?: string; placeholder?: string; hint?: string }
  ) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: "'Cairo'", fontSize: '0.8rem', color: '#9AA6BC', fontWeight: 700 }}>
        {label}
      </label>
      <input
        type={opts?.type ?? 'text'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={opts?.placeholder ?? ''}
        autoCapitalize="none"
        autoCorrect="off"
        style={{
          background: 'rgba(14,23,38,0.9)', border: '1px solid rgba(56,74,110,0.6)',
          borderRadius: 12, padding: '12px 14px', color: '#EADBB7',
          fontFamily: "'Cairo', sans-serif", fontSize: '0.95rem', outline: 'none',
          direction: opts?.type === 'email' || label === 'اسم المستخدم' ? 'ltr' : 'rtl',
        }}
      />
      {opts?.hint && (
        <span style={{ fontSize: '0.72rem', color: 'rgba(154,166,188,0.6)', fontFamily: "'Cairo'" }}>
          {opts.hint}
        </span>
      )}
    </div>
  );

  return (
    <div dir="rtl" style={{
      minHeight: '100dvh', background: '#0E1726',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', padding: '16px',
      fontFamily: "'Cairo', sans-serif",
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Rakkas', serif", fontSize: '2.4rem', fontWeight: 900,
          background: 'linear-gradient(135deg, #F4CE5E, #E0B43C, #B08426)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          margin: 0, lineHeight: 1.1,
        }}>أم الدنيا</h1>
        <p style={{ color: '#9AA6BC', fontSize: '0.8rem', margin: '4px 0 0' }}>
          {tab === 'reset' ? 'استعادة الباسورد' : tab === 'login' ? 'أهلاً تاني!' : 'حساب جديد'}
        </p>
      </div>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 380,
        background: 'rgba(22,34,58,0.85)',
        border: '1px solid rgba(56,74,110,0.5)',
        borderRadius: 20, padding: '24px 20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>

        {/* Tab switcher (login / register only) */}
        {tab !== 'reset' && (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            background: 'rgba(14,23,38,0.7)', borderRadius: 12, padding: 4, gap: 4,
          }}>
            {(['login', 'register'] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); clearMessages(); }}
                style={{
                  padding: '9px', borderRadius: 9, border: 'none',
                  fontFamily: "'Cairo', sans-serif", fontWeight: 800, fontSize: '0.9rem',
                  cursor: 'pointer', transition: 'all 0.2s',
                  background: tab === t ? 'linear-gradient(135deg, #E8C040, #C49020)' : 'transparent',
                  color: tab === t ? '#0E1726' : '#9AA6BC',
                }}>
                {t === 'login' ? 'دخول' : 'حساب جديد'}
              </button>
            ))}
          </div>
        )}

        {/* ── Login form ── */}
        {tab === 'login' && (<>
          {field('الإيميل', email, setEmail, { type: 'email', placeholder: 'example@gmail.com' })}
          {field('الباسورد', password, setPass, { type: 'password', placeholder: '••••••••' })}
          {btn('ادخل', handleLogin)}
          <button onClick={() => { setTab('reset'); clearMessages(); }}
            style={{ background: 'none', border: 'none', color: '#9AA6BC',
              fontFamily: "'Cairo'", fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center' }}>
            نسيت كلمة المرور؟
          </button>
        </>)}

        {/* ── Register form ── */}
        {tab === 'register' && (<>
          {field('اسم المستخدم', username, setUser, {
            placeholder: 'ahmed123',
            hint: 'إنجليزي بس، مش ممكن يتغير بعدين',
          })}
          {field('الاسم الظاهر', nickname, setNick, {
            placeholder: 'الباشا',
            hint: 'عربي أو إنجليزي — ١٠ حروف بحد أقصى',
          })}
          {field('الإيميل', email, setEmail, { type: 'email', placeholder: 'example@gmail.com' })}
          {field('الباسورد', password, setPass, {
            type: 'password', placeholder: '••••••••',
            hint: '٦ حروف على الأقل',
          })}
          {btn('إنشاء حساب', handleRegister)}
        </>)}

        {/* ── Reset password form ── */}
        {tab === 'reset' && (<>
          {field('الإيميل', email, setEmail, { type: 'email', placeholder: 'example@gmail.com' })}
          {btn('ابعت رابط الاسترداد', handleReset)}
          <button onClick={() => { setTab('login'); clearMessages(); }}
            style={{ background: 'none', border: 'none', color: '#9AA6BC',
              fontFamily: "'Cairo'", fontSize: '0.8rem', cursor: 'pointer', textAlign: 'center' }}>
            ← رجوع للدخول
          </button>
        </>)}

        {/* Error / Success messages */}
        {error && (
          <div style={{
            background: 'rgba(199,91,57,0.15)', border: '1px solid rgba(199,91,57,0.4)',
            borderRadius: 10, padding: '10px 14px',
            color: '#F4A38A', fontFamily: "'Cairo'", fontSize: '0.85rem', textAlign: 'center',
          }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{
            background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.35)',
            borderRadius: 10, padding: '10px 14px',
            color: '#6EE7B7', fontFamily: "'Cairo'", fontSize: '0.85rem', textAlign: 'center',
          }}>
            {success}
          </div>
        )}
      </div>

      {/* Back to home */}
      <button onClick={() => navigate(ROUTES.home)}
        style={{
          marginTop: 20, background: 'none', border: 'none',
          color: 'rgba(154,166,188,0.6)', fontFamily: "'Cairo'",
          fontSize: '0.85rem', cursor: 'pointer',
        }}>
        العب بدون حساب ←
      </button>
    </div>
  );
}
