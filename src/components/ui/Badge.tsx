import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'gold' | 'teal' | 'clay' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

const tones: Record<Tone, string> = {
  gold: 'bg-gold/15 text-gold border-gold/30',
  teal: 'bg-teal/15 text-teal border-teal/30',
  clay: 'bg-clay/15 text-clay border-clay/30',
  neutral: 'bg-surface-2 text-muted border-border',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold',
        tones[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
