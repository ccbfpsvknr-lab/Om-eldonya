import { cn } from '@/lib/cn';

/**
 * Decorative, non-interactive backdrop. A faint repeating geometric weave
 * (lotus/diamond motif) layered under content to add Egyptian texture.
 */
export function PatternBackground({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      <svg className="h-full w-full opacity-[0.06]" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern
            id="om-weave"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <path
              d="M28 4 L44 28 L28 52 L12 28 Z"
              fill="none"
              stroke="rgb(var(--c-gold))"
              strokeWidth="1"
            />
            <circle cx="28" cy="28" r="3" fill="rgb(var(--c-gold))" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#om-weave)" />
      </svg>

      {/* top glow accent */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-gold/[0.08] to-transparent" />
    </div>
  );
}
