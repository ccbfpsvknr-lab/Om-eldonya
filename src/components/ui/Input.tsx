import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  /** Element placed at the start (right, in RTL) of the field. */
  addon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, addon, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-semibold text-sand/90">
          {label}
        </label>
      )}
      <div
        className={cn(
          'flex items-center gap-2 rounded-2xl border bg-surface-2/70 px-4 transition-colors',
          'focus-within:border-gold/70 focus-within:ring-2 focus-within:ring-gold/20',
          error ? 'border-danger/60' : 'border-border',
        )}
      >
        {addon && <span className="text-muted">{addon}</span>}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'h-12 w-full bg-transparent text-content placeholder:text-muted/70',
            'outline-none border-none text-base',
            className,
          )}
          {...rest}
        />
      </div>
      {(hint || error) && (
        <p className={cn('mt-1.5 text-xs', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});
