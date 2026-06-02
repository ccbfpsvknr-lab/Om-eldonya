import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Icon rendered before the label (visually, RTL-aware via flex). */
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const base =
  'relative inline-flex items-center justify-center gap-2 font-bold rounded-2xl ' +
  'transition-all duration-200 select-none active:scale-[0.97] ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg ' +
  'disabled:opacity-45 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  primary:
    'bg-gold-sheen text-ink shadow-glow hover:brightness-110 ' +
    "after:absolute after:inset-0 after:rounded-2xl after:bg-white/0 hover:after:bg-white/5 after:transition-colors after:content-['']",
  secondary:
    'bg-surface-2 text-content border border-border hover:border-gold/50 hover:bg-surface',
  ghost: 'bg-transparent text-content hover:bg-surface-2/70',
  danger: 'bg-danger/15 text-danger border border-danger/40 hover:bg-danger/25',
};

const sizes: Record<Size, string> = {
  sm: 'text-sm px-4 h-10',
  md: 'text-base px-6 h-12',
  lg: 'text-lg px-7 h-14',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    block = false,
    leadingIcon,
    trailingIcon,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(base, variants[variant], sizes[size], block && 'w-full', className)}
      {...rest}
    >
      {leadingIcon && <span className="shrink-0 text-[1.15em]">{leadingIcon}</span>}
      <span className="relative z-10">{children}</span>
      {trailingIcon && <span className="shrink-0 text-[1.15em]">{trailingIcon}</span>}
    </button>
  );
});
