import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required since the button has no visible text. */
  label: string;
  children: ReactNode;
  size?: 'sm' | 'md';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, children, size = 'md', className, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          'inline-flex items-center justify-center rounded-full border border-border/70',
          'bg-surface-2/60 text-content transition-all duration-200',
          'hover:border-gold/50 hover:text-gold active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60',
          size === 'sm' ? 'h-9 w-9 text-base' : 'h-11 w-11 text-lg',
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
