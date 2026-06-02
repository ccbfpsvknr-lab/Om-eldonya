import { cn } from '@/lib/cn';

export interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 28, className, label = 'جارٍ التحميل' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-block', className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 50 50" className="h-full w-full animate-spin" aria-hidden>
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="rgb(var(--c-border))"
          strokeWidth="5"
        />
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="rgb(var(--c-gold))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="90 150"
        />
      </svg>
    </span>
  );
}
