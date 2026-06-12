import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';
import { useAuthStore } from '@/store/useAuthStore';
import { useFriendsStore, timeAgo, type FriendProfile } from '@/store/useFriendsStore';

export function FriendsScreen() {
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const {
    friends, pending, sent, searchResults, loading,
    loadFriends, searchUsers, sendRequest, acceptRequest, declineRequest, removeFriend, clearSearch,
  } = useFriendsStore();

  const [query, setQuery]     = useState('');
  const [msg, setMsg]         = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const myId = profile?.id ?? '';

  useEffect(() => {
    if (myId) loadFriends(myId);
  }, [myId]);

  const handleSearch = (v: string) => {
    setQuery(v);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!v.trim()) { clearSearch(); return; }
    searchTimer.current = setTimeout(() => searchUsers(v, myId), 400);
  };

  const handleSend = async (toId: string, toName: string) => {
    const err = await sendRequest(myId, toId);
    if (err) {
      setMsg(err.includes('duplicate') ? `أنت بالفعل أصدقاء أو أرسلت طلب` : err);
    } else {
      setMsg(`تم إرسال الطلب لـ ${toName} ✓`);
      loadFriends(myId);
    }
    setTimeout(() => setMsg(''), 3000);
  };

  const isFriend     = (id: string) => friends.some((f) => f.id === id);
  const hasSentTo    = (id: string) => sent.some((r) => r.addresseeId === id);
  const hasPendingFrom = (id: string) => pending.some((r) => r.requesterId === id);

  const S = {
    page: { minHeight: '100dvh', background: '#0E1726', fontFamily: "'Cairo', sans-serif", direction: 'rtl' as const, color: '#EADBB7' },
    header: { padding: '14px 16px 10px', display: 'flex' as const, alignItems: 'center' as const, gap: 10, borderBottom: '1px solid rgba(56,74,110,0.3)' },
    section: { padding: '0 16px', marginBottom: 20 },
    sectionTitle: { fontSize: '0.75rem', fontWeight: 800, color: '#9AA6BC', letterSpacing: '0.08em', textTransform: 'uppercase' as const, margin: '16px 0 8px' },
    card: { background: 'rgba(22,34,58,0.7)', border: '1px solid rgba(56,74,110,0.4)', borderRadius: 14, padding: '12px 14px', marginBottom: 8, display: 'flex' as const, alignItems: 'center' as const, gap: 12 },
    avatar: (color: string) => ({ width: 40, height: 40, borderRadius: '50%', background: color, display: 'flex' as const, alignItems: 'center' as const, justifyContent: 'center' as const, fontWeight: 900, fontSize: '1rem', color: '#0E1726', flexShrink: 0 }),
    btnSmall: (bg: string, color = '#0E1726') => ({ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: "'Cairo'", fontWeight: 700, fontSize: '0.78rem', background: bg, color }),
  };

  const COLORS = ['#E8C040','#4FC3F7','#81C784','#FF8A65','#F48FB1','#CE93D8'];
  const avatarColor = (id: string) => COLORS[id.charCodeAt(0) % COLORS.length];

  const renderFriendCard = (f: FriendProfile, actions?: React.ReactNode) => (
    <div key={f.id} style={S.card}>
      <div style={S.avatar(avatarColor(f.id))}>{f.nickname?.[0]?.toUpperCase() ?? '?'}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>{f.nickname}</div>
        <div style={{ fontSize: '0.75rem', color: '#9AA6BC' }}>@{f.username}</div>
        <div style={{ fontSize: '0.72rem', marginTop: 2, color: f.isOnline ? '#6EE7B7' : '#9AA6BC', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: f.isOnline ? '#6EE7B7' : '#9AA6BC', display: 'inline-block' }} />
          {timeAgo(f.lastSeenAt)}
        </div>
      </div>
      {actions}
    </div>
  );

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <button onClick={() => navigate(ROUTES.home)}
          style={{ background: 'none', border: '1px solid rgba(56,74,110,0.5)', borderRadius: 8, color: '#9AA6BC', padding: '6px 12px', fontFamily: "'Cairo'", cursor: 'pointer', fontSize: '0.85rem' }}>
          ← رجوع
        </button>
        <h1 style={{ flex: 1, margin: 0, textAlign: 'center', fontFamily: "'Rakkas', serif", fontSize: '1.4rem', color: '#4FC3F7' }}>
          👥 الأصدقاء
        </h1>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ overflowY: 'auto', paddingBottom: 32 }}>
        {/* Search */}
        <div style={{ ...S.section, marginTop: 16 }}>
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="🔍 ابحث عن صاحبك باسم المستخدم..."
            style={{ width: '100%', background: 'rgba(14,23,38,0.9)', border: '1px solid rgba(56,74,110,0.6)',
              borderRadius: 12, padding: '12px 14px', color: '#EADBB7', fontFamily: "'Cairo'",
              fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }}
          />
          {msg && <p style={{ margin: '8px 0 0', fontSize: '0.82rem', color: '#6EE7B7' }}>{msg}</p>}

          {/* Search results */}
          {searchResults.length > 0 && (
            <div style={{ marginTop: 10 }}>
              {searchResults.map((u) => renderFriendCard(u,
                <div>
                  {isFriend(u.id) ? (
                    <span style={{ fontSize: '0.75rem', color: '#6EE7B7' }}>صاحبك ✓</span>
                  ) : hasSentTo(u.id) ? (
                    <span style={{ fontSize: '0.75rem', color: '#9AA6BC' }}>تم الإرسال</span>
                  ) : hasPendingFrom(u.id) ? (
                    <button onClick={() => { const r = pending.find(r => r.requesterId === u.id); if (r) acceptRequest(r.id, myId); }}
                      style={S.btnSmall('linear-gradient(135deg,#E8C040,#C49020)')}>قبول</button>
                  ) : (
                    <button onClick={() => handleSend(u.id, u.nickname)}
                      style={S.btnSmall('rgba(78,130,255,0.2)', '#90B8FF')}>+ إضافة</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending requests */}
        {pending.length > 0 && (
          <div style={S.section}>
            <p style={S.sectionTitle}>طلبات معلقة ({pending.length})</p>
            {pending.map((r) => renderFriendCard(r.profile,
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => acceptRequest(r.id, myId)}
                  style={S.btnSmall('linear-gradient(135deg,#E8C040,#C49020)')}>قبول</button>
                <button onClick={() => declineRequest(r.id)}
                  style={S.btnSmall('rgba(199,91,57,0.15)', '#F4A38A')}>رفض</button>
              </div>
            ))}
          </div>
        )}

        {/* Friends list */}
        <div style={S.section}>
          <p style={S.sectionTitle}>
            أصدقائي ({friends.length})
            {friends.filter((f) => f.isOnline).length > 0 && (
              <span style={{ color: '#6EE7B7', marginRight: 8 }}>
                · {friends.filter((f) => f.isOnline).length} أونلاين
              </span>
            )}
          </p>
          {loading && <p style={{ color: '#9AA6BC', fontSize: '0.85rem', textAlign: 'center' }}>جاري التحميل...</p>}
          {!loading && friends.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9AA6BC' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👥</div>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>ما عندكش أصدقاء لسه</p>
              <p style={{ margin: '4px 0 0', fontSize: '0.8rem', opacity: 0.6 }}>ابحث عن أصحابك من فوق</p>
            </div>
          )}
          {/* Online first */}
          {[...friends].sort((a, b) => (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0)).map((f) =>
            renderFriendCard(f,
              removing === f.id ? (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => { removeFriend(myId, f.id); setRemoving(null); }}
                    style={S.btnSmall('rgba(199,91,57,0.2)', '#F4A38A')}>تأكيد</button>
                  <button onClick={() => setRemoving(null)}
                    style={S.btnSmall('rgba(56,74,110,0.5)', '#9AA6BC')}>إلغاء</button>
                </div>
              ) : (
                <button onClick={() => setRemoving(f.id)}
                  style={{ background: 'none', border: 'none', color: 'rgba(154,166,188,0.3)', cursor: 'pointer', fontSize: '1.1rem' }}>
                  ✕
                </button>
              )
            )
          )}
        </div>
      </div>
    </div>
  );
}
