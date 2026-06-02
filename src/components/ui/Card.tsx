import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle gold top-edge accent. */
  accent?: boolean;
  /** Hover lift + pointer for clickable cards. */
  interactive?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
} as const;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { accent = false, interactive = false, padding = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative rounded-3xl bg-surface/80 border border-border/70 shadow-card backdrop-blur-sm',
        accent &&
          "before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-gradient-to-l before:from-transparent before:via-gold/70 before:to-transparent before:content-['']",
        interactive &&
          'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-glow',
        paddings[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
});
