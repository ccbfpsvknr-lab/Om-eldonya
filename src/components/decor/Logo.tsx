import { cn } from '@/lib/cn';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  withTagline?: boolean;
  className?: string;
}

const markSize = { sm: 32, md: 48, lg: 72 } as const;
const titleSize = {
  sm: 'text-2xl',
  md: 'text-4xl',
  lg: 'text-6xl',
} as const;

export function Logo({ size = 'md', withTagline = false, className }: LogoProps) {
  const s = markSize[size];
  return (
    <div className={cn('flex flex-col items-center gap-2 text-center', className)}>
      <div className="flex items-center gap-3">
        <svg width={s} height={s} viewBox="0 0 64 64" className="animate-float-slow" aria-hidden>
          <g className="text-gold" fill="currentColor">
            <ellipse cx="32" cy="38" rx="13" ry="16" />
            <circle cx="32" cy="18" r="7" />
            <path d="M32 22c-9 0-16 4-20 9 5-2 9-2 12 0-6 2-10 6-12 11 6-5 13-7 20-7s14 2 20 7c-2-5-6-9-12-11 3-2 7-2 12 0-4-5-11-9-20-9Z" />
          </g>
          <circle cx="29" cy="16" r="1.6" className="fill-bg" />
          <circle cx="35" cy="16" r="1.6" className="fill-bg" />
        </svg>
        <h1 className={cn('text-gold-sheen leading-none', titleSize[size])}>أم الدنيا</h1>
      </div>
      {withTagline && (
        <p className="text-sm font-medium text-muted">العب مع أصحابك في أي مكان</p>
      )}
    </div>
  );
}
