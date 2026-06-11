import { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface Props { onClose: () => void; }

export function SettingsModal({ onClose }: Props) {
  const { profile, updateNickname, signOut, loading } = useAuthStore();
  const [newNick, setNewNick] = useState(profile?.nickname ?? '');
  const [msg, setMsg]         = useState('');
  const [isError, setIsError] = useState(false);

  const handleNickChange = async () => {
    if (!newNick.trim()) { setMsg('ادخل اسم'); setIsError(true); return; }
    if (newNick.length > 10) { setMsg('الاسم الظاهر ١٠ حروف بحد أقصى'); setIsError(true); return; }
    const err = await updateNickname(newNick.trim());
    if (err) { setMsg(err); setIsError(true); }
    else { setMsg('تم تغيير الاسم الظاهر ✓'); setIsError(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    onClose();
  };

  return (
    <div dir="rtl" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Profile info */}
      <div style={{
        background: 'rgba(14,23,38,0.8)', borderRadius: 12, padding: '14px 16px',
        border: '1px solid rgba(56,74,110,0.4)',
      }}>
        <div style={{ fontFamily: "'Cairo'", fontWeight: 800, color: '#E0B43C', fontSize: '1rem' }}>
          {profile?.nickname}
        </div>
        <div style={{ fontFamily: 'monospace', color: '#9AA6BC', fontSize: '0.8rem', marginTop: 2 }}>
          @{profile?.username}
        </div>
        <div style={{ color: '#E0B43C', fontSize: '0.85rem', marginTop: 6, fontFamily: "'Cairo'" }}>
          💰 {profile?.coins?.toLocaleString('en-US') ?? 0} عملة
        </div>
      </div>

      {/* Nickname change */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={{ fontFamily: "'Cairo'", fontSize: '0.8rem', color: '#9AA6BC', fontWeight: 700 }}>
          تغيير الاسم الظاهر
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newNick}
            onChange={(e) => setNewNick(e.target.value)}
            maxLength={10}
            style={{
              flex: 1, background: 'rgba(14,23,38,0.9)',
              border: '1px solid rgba(56,74,110,0.6)', borderRadius: 10,
              padding: '10px 12px', color: '#EADBB7',
              fontFamily: "'Cairo', sans-serif", fontSize: '0.9rem', outline: 'none',
            }}
          />
          <button onClick={handleNickChange} disabled={loading}
            style={{
              padding: '10px 16px', borderRadius: 10, border: 'none',
              background: 'linear-gradient(135deg, #E8C040, #C49020)',
              color: '#0E1726', fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.85rem',
              cursor: 'pointer',
            }}>
            تغيير
          </button>
        </div>
        <span style={{ fontSize: '0.72rem', color: 'rgba(154,166,188,0.5)', fontFamily: "'Cairo'" }}>
          التغيير بيكلف ٥٠ عملة
        </span>
        {msg && (
          <div style={{
            borderRadius: 8, padding: '8px 12px',
            background: isError ? 'rgba(199,91,57,0.12)' : 'rgba(16,185,129,0.1)',
            border: `1px solid ${isError ? 'rgba(199,91,57,0.3)' : 'rgba(16,185,129,0.3)'}`,
            color: isError ? '#F4A38A' : '#6EE7B7',
            fontFamily: "'Cairo'", fontSize: '0.8rem', textAlign: 'center',
          }}>{msg}</div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={handleSignOut}
        style={{
          padding: '12px', borderRadius: 12, border: '1px solid rgba(199,91,57,0.35)',
          background: 'rgba(199,91,57,0.08)', color: '#F4A38A',
          fontFamily: "'Cairo'", fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
          marginTop: 4,
        }}>
        تسجيل خروج
      </button>
    </div>
  );
}
