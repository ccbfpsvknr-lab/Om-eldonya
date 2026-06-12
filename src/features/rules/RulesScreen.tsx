import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/lib/constants';

const PAGES = [
  {
    title: 'القواعد الأساسية',
    icon: '📖',
    content: [
      {
        heading: 'الهدف',
        text: 'تبقى آخر لاعب واقف. اشتري المدن واجمع الإيجار من اللاعبين اللي بيوقفوا عليها، واللي بيفلس بيخرج.',
      },
      {
        heading: 'البداية',
        text: 'كل اللاعبين يبدأوا من محطة رمسيس. ترتيب اللعب بيتحدد بالقرعة — بالحظ!',
      },
      {
        heading: 'الخانات الخاصة',
        bullets: [
          { icon: '🎲', name: 'فرصة', desc: 'اسحب كارت، ممكن يفيدك أو يضرك' },
          { icon: '🚔', name: 'الكمين', desc: 'لو وقفت عليه، روح الحجز فوراً' },
          { icon: '☕', name: 'القهوة', desc: 'استريح، مفيش حاجة بتحصل' },
          { icon: '📰', name: 'أخبار', desc: 'خبر بيأثر على كل اللاعبين' },
        ],
      },
    ],
  },
  {
    title: 'الوضع السريع',
    icon: '⚡',
    accent: '#4FC3F7',
    content: [
      { bullet: '⏱️', text: 'مدة اللعبة: 5 ~ 30 دقيقة' },
      { bullet: '💰', text: 'مفيش مرتب في الوضع السريع' },
      { bullet: '🚫', text: 'مفيش ترقيات للمدن' },
      { bullet: '🔒', text: 'الحجز: ارمي 6 وتخرج عادي، غير كده ادفع 500 للخروج' },
      { bullet: '⚠️', text: 'مفيش سلفة — لو رصيدك نزل تحت الصفر، إفلاس فوري وبتخرج' },
      { bullet: '🏙️', text: 'مش هتقدر تبيع مدنك، دبّر أمورك من الأول!' },
    ],
  },
  {
    title: 'الوضع الكلاسيك',
    icon: '🏛️',
    accent: '#E8C040',
    content: [
      { bullet: '⏱️', text: 'مدة اللعبة: 20 ~ 60 دقيقة' },
      { bullet: '💰', text: 'المرتب: كل ما تعدي أو تقف على محطة رمسيس تاخد مرتبك' },
      { bullet: '🗺️', text: 'المناطق والترقيات: لو كملت منطقة أو اشتريت ترقية على مدينة، الإيجار بيزيد' },
      { bullet: '🔒', text: 'الحجز: ارمي 6 وتخرج عادي، غير كده بتعدي الدور' },
      { bullet: '🏦', text: 'السلفة: تاخد مرة واحدة من البنك وتسددها بعدين من مرتبك — لو ما كفتكش وما عندكش مدن تبيعها، إفلاس وبتخرج' },
    ],
  },
];

export function RulesScreen() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const current = PAGES[page];
  const accent  = current.accent ?? '#E8C040';

  return (
    <div style={{
      minHeight: '100dvh', background: '#0E1726',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Cairo', sans-serif", direction: 'rtl',
      userSelect: 'none',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px 10px',
        display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(56,74,110,0.4)',
      }}>
        <button onClick={() => navigate(ROUTES.home)}
          style={{ background: 'none', border: '1px solid rgba(56,74,110,0.5)',
            borderRadius: 8, color: '#9AA6BC', padding: '6px 12px',
            fontFamily: "'Cairo'", cursor: 'pointer', fontSize: '0.85rem' }}>
          ← رجوع
        </button>
        <h1 style={{ flex: 1, margin: 0, textAlign: 'center',
          fontFamily: "'Rakkas', serif", fontSize: '1.4rem',
          color: accent, transition: 'color 0.3s' }}>
          {current.icon} {current.title}
        </h1>
        <div style={{ width: 60 }} />
      </div>

      {/* Page dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: '12px 0 4px' }}>
        {PAGES.map((p, i) => (
          <button key={i} onClick={() => setPage(i)}
            style={{
              width: i === page ? 24 : 8, height: 8,
              borderRadius: 4, border: 'none', cursor: 'pointer',
              background: i === page ? accent : 'rgba(56,74,110,0.5)',
              transition: 'all 0.25s',
            }} />
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 24px' }}>
        {'content' in current && Array.isArray(current.content) && current.content.map((block: Record<string, unknown>, i: number) => (
          <div key={i} style={{ marginBottom: 20 }}>
            {block.heading && (
              <h3 style={{ margin: '0 0 8px', color: accent, fontSize: '1rem', fontWeight: 800 }}>
                {block.heading as string}
              </h3>
            )}
            {block.text && !block.bullet && (
              <p style={{ margin: 0, color: '#EADBB7', lineHeight: 1.7, fontSize: '0.9rem' }}>
                {block.text as string}
              </p>
            )}
            {block.bullets && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(block.bullets as Array<{icon: string; name: string; desc: string}>).map((b, j) => (
                  <div key={j} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    background: 'rgba(22,34,58,0.7)',
                    border: '1px solid rgba(56,74,110,0.4)',
                    borderRadius: 12, padding: '10px 14px',
                  }}>
                    <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 800, color: accent, fontSize: '0.9rem' }}>{b.name}</div>
                      <div style={{ color: '#9AA6BC', fontSize: '0.82rem', marginTop: 2 }}>{b.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {block.bullet && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: 'rgba(22,34,58,0.7)',
                border: '1px solid rgba(56,74,110,0.4)',
                borderRadius: 12, padding: '12px 14px',
              }}>
                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{block.bullet as string}</span>
                <p style={{ margin: 0, color: '#EADBB7', fontSize: '0.88rem', lineHeight: 1.6 }}>
                  {block.text as string}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prev / Next */}
      <div style={{
        padding: '12px 20px 24px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
        borderTop: '1px solid rgba(56,74,110,0.3)',
      }}>
        <button onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
          style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: page === 0 ? 'default' : 'pointer',
            background: page === 0 ? 'rgba(56,74,110,0.15)' : 'rgba(56,74,110,0.35)',
            color: page === 0 ? 'rgba(154,166,188,0.3)' : '#9AA6BC',
            fontFamily: "'Cairo'", fontWeight: 700, fontSize: '0.9rem',
          }}>
          → السابق
        </button>
        <button onClick={() => page < PAGES.length - 1 ? setPage((p) => p + 1) : navigate(ROUTES.home)}
          style={{
            padding: '12px', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: page < PAGES.length - 1
              ? `linear-gradient(135deg, ${accent}, ${accent}aa)`
              : 'linear-gradient(135deg, #E8C040, #C49020)',
            color: '#0E1726', fontFamily: "'Cairo'", fontWeight: 900, fontSize: '0.9rem',
          }}>
          {page < PAGES.length - 1 ? 'التالي ←' : 'تمام ✓'}
        </button>
      </div>
    </div>
  );
}
