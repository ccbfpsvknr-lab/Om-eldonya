import { useNavigate } from 'react-router-dom';
import { useModal } from '@/hooks/useModal';
import { useGameStore } from '@/store';
import { ROUTES } from '@/lib/constants';


/* ─── Pre-computed star positions ─────────────────────────────────────────── */
const STARS = [
  [28,28,1.2,.9],[72,14,0.9,.7],[118,36,1.1,.8],[165,22,0.8,.6],[210,18,1.3,.9],
  [255,40,0.9,.7],[298,12,1.1,.8],[342,28,0.8,.6],[380,44,1.0,.7],[14,55,0.8,.5],
  [48,68,1.2,.8],[95,50,0.9,.6],[140,72,1.0,.7],[188,58,0.8,.9],[232,66,1.1,.7],
  [278,48,0.9,.8],[322,64,0.8,.6],[368,56,1.2,.7],[8,85,0.9,.7],[60,94,0.8,.5],
  [108,82,1.1,.8],[156,100,0.9,.6],[202,88,0.8,.9],[248,96,1.0,.7],[292,80,0.9,.6],
  [338,104,0.8,.8],[376,88,1.1,.5],[32,112,0.9,.7],[84,118,0.8,.6],[130,106,1.0,.8],
  [178,120,0.9,.5],[224,108,0.8,.7],[268,122,1.1,.6],[316,116,0.9,.8],[362,110,0.8,.5],
  [18,138,0.9,.6],[68,128,0.8,.7],[116,142,1.0,.5],[162,134,0.9,.8],[208,148,0.8,.6],
];

/* ─── Rules content ────────────────────────────────────────────────────────── */
const RULES = [
  'اجمع من ٢ لـ ٤ لاعبين على نفس الموبايل.',
  'كل لاعب بياخد دور بالترتيب اللي بيظهر في شاشة القرعة.',
  'اشتري مدن، اجمع إيجار، وابقى أغنى لاعب.',
  'اللي يكسب هو «الكبير أوي» — الكبير على الجميع!',
];

function RulesContent() {
  return (
    <ol className="space-y-4">
      {RULES.map((rule, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-bold text-gold">
            {i + 1}
          </span>
          <p className="pt-0.5 leading-relaxed text-content/90">{rule}</p>
        </li>
      ))}
    </ol>
  );
}

/* ─── Main component ───────────────────────────────────────────────────────── */
export function MainMenu() {
  const navigate   = useNavigate();
  const { open, close } = useModal();
  const createGame = useGameStore((s) => s.createGame);

  const handleStart = () => { createGame(); navigate(ROUTES.create); };
  const handleRules = () => { open(<RulesContent />, { title: 'قواعد اللعبة 📖', size: 'md' }); };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden" dir="rtl">

      {/* ═══ EGYPTIAN BACKGROUND ═══════════════════════════════════════════ */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#040b18"/>
            <stop offset="35%"  stopColor="#0b1e38"/>
            <stop offset="60%"  stopColor="#1e3060"/>
            <stop offset="75%"  stopColor="#6b2e14"/>
            <stop offset="87%"  stopColor="#b85820"/>
            <stop offset="100%" stopColor="#d47c1a"/>
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#3a2208"/>
            <stop offset="60%"  stopColor="#1a1006"/>
            <stop offset="100%" stopColor="#0e0804"/>
          </linearGradient>
          <linearGradient id="nile" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#1e4060"/>
            <stop offset="100%" stopColor="#0d2035"/>
          </linearGradient>
          <linearGradient id="pyr1" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#c47818"/>
            <stop offset="100%" stopColor="#7a4808"/>
          </linearGradient>
          <linearGradient id="pyr2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#b86c14"/>
            <stop offset="100%" stopColor="#6a3c06"/>
          </linearGradient>
          <radialGradient id="sunGlow" cx="55%" cy="76%" r="30%">
            <stop offset="0%"   stopColor="#e08820" stopOpacity="0.55"/>
            <stop offset="100%" stopColor="#e08820" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="nileShine" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#d47820" stopOpacity="0.30"/>
            <stop offset="100%" stopColor="#d47820" stopOpacity="0"/>
          </radialGradient>
          <filter id="blur2">
            <feGaussianBlur stdDeviation="2"/>
          </filter>
          <filter id="blur4">
            <feGaussianBlur stdDeviation="4"/>
          </filter>
        </defs>

        {/* Sky */}
        <rect width="400" height="900" fill="url(#sky)"/>

        {/* Sun glow behind horizon */}
        <ellipse cx="220" cy="685" rx="140" ry="70" fill="url(#sunGlow)" filter="url(#blur4)"/>

        {/* Stars */}
        {STARS.map(([x,y,r,o], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="white" opacity={o}
            style={{ animation: `${1.5 + (i%3)*0.7}s ease-in-out ${(i%7)*0.3}s infinite alternate opacity` }}/>
        ))}

        {/* ── Distant pyramids (hazy, right side) ── */}
        <g opacity="0.35" filter="url(#blur2)">
          <polygon points="310,640 365,700 255,700" fill="#c47020"/>
          <polygon points="290,660 338,705 242,705" fill="#a86015"/>
        </g>

        {/* ── Main pyramids ── */}
        {/* Large center-right pyramid */}
        <polygon points="295,570 368,685 222,685" fill="url(#pyr1)"/>
        <polygon points="295,570 368,685 295,685" fill="#7a4808" opacity="0.5"/>
        {/* Medium pyramid */}
        <polygon points="350,600 405,685 295,685" fill="url(#pyr2)"/>
        <polygon points="350,600 405,685 350,685" fill="#7a4808" opacity="0.5"/>
        {/* Small pyramid */}
        <polygon points="215,620 262,685 168,685" fill="#b87018" opacity="0.85"/>
        <polygon points="215,620 262,685 215,685" fill="#6a3808" opacity="0.4"/>

        {/* ── Sphinx silhouette ── */}
        <g transform="translate(165,645)" opacity="0.7">
          <ellipse cx="25" cy="25" rx="25" ry="22" fill="#5a3808"/>
          <rect x="0" y="20" width="60" height="18" rx="4" fill="#4a2e06"/>
          <rect x="-10" y="30" width="80" height="10" rx="3" fill="#3a2006"/>
          {/* Head */}
          <rect x="8" y="4" width="22" height="22" rx="3" fill="#5a3808"/>
          <rect x="6" y="2" width="26" height="8" rx="2" fill="#4a2e06"/>
        </g>

        {/* ── Cairo skyline silhouette ── */}
        <g fill="#0a1520">
          {/* Left buildings */}
          <rect x="0"   y="660" width="18" height="30"/>
          <rect x="20"  y="650" width="14" height="40"/>
          <rect x="36"  y="655" width="20" height="35"/>
          <rect x="58"  y="640" width="12" height="50"/>
          {/* Minaret left */}
          <rect x="72"  y="630" width="6"  height="60"/>
          <ellipse cx="75" cy="630" rx="5" ry="6"/>
          <rect x="82"  y="650" width="16" height="40"/>
          <rect x="100" y="645" width="22" height="45"/>
          {/* Cairo tower style */}
          <rect x="124" y="625" width="10" height="65"/>
          <polygon points="124,625 134,625 129,612" fill="#0a1520"/>
          <rect x="136" y="652" width="18" height="38"/>
          <rect x="156" y="648" width="14" height="42"/>
          {/* Minaret center */}
          <rect x="172" y="628" width="5" height="62"/>
          <ellipse cx="174" cy="628" rx="4" ry="5"/>
          <rect x="179" y="655" width="20" height="35"/>
        </g>

        {/* ── Nile river ── */}
        <path
          d="M0,695 Q80,678 160,690 Q240,702 320,686 Q360,678 400,682 L400,730 Q360,726 320,734 Q240,742 160,730 Q80,718 0,732 Z"
          fill="url(#nile)"/>
        {/* Nile shimmer */}
        <ellipse cx="200" cy="712" rx="80" ry="10" fill="url(#nileShine)" filter="url(#blur2)"/>
        {/* Nile highlights */}
        <path d="M60,706 Q120,700 180,708 Q240,716 300,706" stroke="#2a6090" strokeWidth="1.5" fill="none" opacity="0.5"/>
        <path d="M80,716 Q140,710 200,718 Q260,726 320,716" stroke="#1e4a70" strokeWidth="1" fill="none" opacity="0.4"/>

        {/* ── Felucca boats on Nile ── */}
        <g transform="translate(100,700)" opacity="0.6">
          <ellipse cx="0" cy="8" rx="18" ry="4" fill="#1a3a50"/>
          <path d="M0,8 L-4,-12 L14,2 Z" fill="#d4a840" opacity="0.6"/>
        </g>
        <g transform="translate(260,708)" opacity="0.5">
          <ellipse cx="0" cy="7" rx="14" ry="3" fill="#1a3a50"/>
          <path d="M0,7 L-3,-10 L11,1 Z" fill="#d4a840" opacity="0.5"/>
        </g>

        {/* ── Ground / desert ── */}
        <path d="M0,728 Q100,720 200,726 Q300,732 400,724 L400,900 L0,900 Z" fill="url(#ground)"/>

        {/* ── Palm trees ── */}
        <g fill="#0e1c08" opacity="0.8">
          {/* Tree 1 */}
          <rect x="28"  y="702" width="4" height="28"/>
          <ellipse cx="30" cy="700" rx="12" ry="6" fill="#0e1c08"/>
          <path d="M30,700 Q18,694 10,698 Q20,698 30,700" fill="#122008"/>
          <path d="M30,700 Q42,694 50,698 Q40,698 30,700" fill="#122008"/>
          {/* Tree 2 */}
          <rect x="365" y="705" width="4" height="22"/>
          <ellipse cx="367" cy="703" rx="10" ry="5" fill="#0e1c08"/>
          <path d="M367,703 Q357,697 349,701 Q359,701 367,703" fill="#122008"/>
          <path d="M367,703 Q377,697 385,701 Q375,701 367,703" fill="#122008"/>
        </g>

        {/* ── Road at bottom (game hint) ── */}
        <path d="M0,790 Q200,775 400,790 L400,820 Q200,805 0,820 Z" fill="#1a1408" opacity="0.6"/>
        <path d="M0,804 Q200,789 400,804" stroke="#c47820" strokeWidth="1" strokeDasharray="20,15" fill="none" opacity="0.4"/>

        {/* ── Vignette overlay ── */}
        <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
          <stop offset="0%" stopColor="transparent"/>
          <stop offset="100%" stopColor="#040b18" stopOpacity="0.5"/>
        </radialGradient>
        <rect width="400" height="900" fill="url(#vignette)"/>
      </svg>

      {/* ═══ ATMOSPHERIC OVERLAY ═════════════════════════════════════════════ */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040b18]/50 via-transparent via-40% to-[#040b18]/60 pointer-events-none"/>

      {/* ═══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 pt-4 pb-2">
        {/* Profile */}
        <div className="flex items-center gap-2 rounded-2xl border border-[rgba(224,180,60,0.2)] bg-[rgba(4,11,24,0.75)] px-3 py-1.5 backdrop-blur-md">
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(224,180,60,0.3)] bg-[rgba(224,180,60,0.1)] text-base">
            👤
          </div>
          <div className="leading-tight">
            <p className="text-xs font-bold text-[#F4CE5E]">لاعب جديد</p>
            <p className="text-[10px] text-[#9AA6BC]">المستوى ١ ✦</p>
          </div>
        </div>

        {/* Coins + Settings */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-[rgba(224,180,60,0.25)] bg-[rgba(4,11,24,0.75)] px-2.5 py-1.5 backdrop-blur-md">
            <span className="text-sm">🪙</span>
            <span className="text-xs font-bold text-[#F4CE5E]">0</span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(56,74,110,0.7)] bg-[rgba(4,11,24,0.75)] text-base backdrop-blur-md hover:border-[rgba(224,180,60,0.4)] transition-colors">
            ⚙️
          </button>
        </div>
      </div>

      {/* ═══ MAIN CONTENT ════════════════════════════════════════════════════ */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-6">

        {/* ── Logo section ── */}
        <div className="mb-10 text-center select-none">
          {/* Top ornament */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px flex-1 max-w-20 bg-gradient-to-l from-[rgba(224,180,60,0.7)] to-transparent"/>
            <span className="text-[#E0B43C] text-base opacity-80">⟁</span>
            <div className="h-px flex-1 max-w-20 bg-gradient-to-r from-[rgba(224,180,60,0.7)] to-transparent"/>
          </div>

          {/* Title */}
          <h1
            className="leading-none tracking-wide"
            style={{
              fontFamily: "'Rakkas', serif",
              fontSize: 'clamp(3.5rem, 16vw, 5rem)',
              background: 'linear-gradient(180deg, #F4CE5E 0%, #E0B43C 45%, #B08426 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 24px rgba(224,180,60,0.45))',
            }}
          >
            أم الدنيا
          </h1>

          {/* Subtitle */}
          <p
            className="mt-2 tracking-[0.22em] text-[#EADBB7] opacity-75"
            style={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.82rem', fontWeight: 600 }}
          >
            رحلة عبر مصر
          </p>

          {/* Bottom ornament */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px flex-1 max-w-14 bg-gradient-to-l from-[rgba(224,180,60,0.5)] to-transparent"/>
            <span className="text-[8px] tracking-[0.35em] text-[#E0B43C] opacity-60">✦ ✦ ✦</span>
            <div className="h-px flex-1 max-w-14 bg-gradient-to-r from-[rgba(224,180,60,0.5)] to-transparent"/>
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="w-full max-w-[310px] space-y-3">

          {/* يلا بينا — PRIMARY */}
          <button
            onClick={handleStart}
            className="group relative w-full overflow-hidden rounded-2xl py-4 font-bold transition-all active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #E8C040 0%, #D4961A 50%, #E8C040 100%)',
              backgroundSize: '200% 100%',
              boxShadow: '0 4px 24px rgba(224,180,60,0.45), 0 1px 0 rgba(255,230,100,0.5) inset',
              fontFamily: "'Cairo', sans-serif",
              fontSize: '1.15rem',
            }}
          >
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #F4CE5E 0%, #E0B43C 50%, #F4CE5E 100%)' }}/>
            <span className="relative flex items-center justify-center gap-2 text-[#0E1726]">
              <span className="text-xl">🎲</span>
              <span>يلا بينا</span>
            </span>
          </button>

          {/* الأصدقاء — DISABLED */}
          <button disabled
            className="relative w-full overflow-hidden rounded-2xl border border-[rgba(56,74,110,0.5)] py-3.5 opacity-50 cursor-not-allowed"
            style={{
              background: 'rgba(14,23,38,0.7)',
              fontFamily: "'Cairo', sans-serif",
              fontSize: '1rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="flex items-center justify-center gap-2 text-[#EADBB7]">
              <span className="text-lg">👥</span>
              <span>الأصدقاء</span>
              <span className="ms-1 rounded-full bg-[rgba(56,74,110,0.8)] px-2 py-0.5 text-[9px] text-[#9AA6BC]">قريباً</span>
            </span>
          </button>

          {/* قواعد اللعبة — ACTIVE */}
          <button
            onClick={handleRules}
            className="group w-full overflow-hidden rounded-2xl border border-[rgba(56,74,110,0.8)] py-3.5 transition-all hover:border-[rgba(224,180,60,0.4)] active:scale-[0.98]"
            style={{
              background: 'rgba(22,34,58,0.85)',
              fontFamily: "'Cairo', sans-serif",
              fontSize: '1rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="flex items-center justify-center gap-2 text-[#EADBB7] group-hover:text-[#F4CE5E] transition-colors">
              <span className="text-lg">📖</span>
              <span>قواعد اللعبة</span>
            </span>
          </button>

          {/* المتجر — DISABLED */}
          <button disabled
            className="relative w-full overflow-hidden rounded-2xl border border-[rgba(56,74,110,0.4)] py-3.5 opacity-45 cursor-not-allowed"
            style={{
              background: 'rgba(14,23,38,0.6)',
              fontFamily: "'Cairo', sans-serif",
              fontSize: '1rem',
              backdropFilter: 'blur(8px)',
            }}
          >
            <span className="flex items-center justify-center gap-2 text-[#EADBB7]">
              <span className="text-lg">🛒</span>
              <span>المتجر</span>
              <span className="ms-1 rounded-full bg-[rgba(56,74,110,0.8)] px-2 py-0.5 text-[9px] text-[#9AA6BC]">قريباً</span>
            </span>
          </button>
        </div>

        {/* Version tag */}
        <p className="mt-8 text-[10px] text-[#9AA6BC] opacity-50 tracking-wider"
          style={{ fontFamily: "'Cairo', sans-serif" }}>
          نسخة تجريبية ✦ أم الدنيا
        </p>
      </div>
    </div>
  );
}
