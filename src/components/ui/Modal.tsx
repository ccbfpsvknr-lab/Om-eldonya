import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './IconButton';

export interface ModalShellProps {
  title?: string;
  size?: 'sm' | 'md' | 'lg';
  hideClose?: boolean;
  dismissable?: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Stacking index — deeper modals get a heavier backdrop. */
  depth?: number;
}

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
} as const;

export function ModalShell({
  title,
  size = 'md',
  hideClose = false,
  dismissable = true,
  onClose,
  children,
  depth = 0,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && dismissable) onClose();
    };
    document.addEventListener('keydown', onKey);
    // Lock body scroll while a modal is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [dismissable, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ zIndex: 50 + depth }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 animate-fade-in bg-ink/70 backdrop-blur-sm"
        onClick={dismissable ? onClose : undefined}
        aria-hidden
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          'relative z-10 w-full animate-rise-in outline-none',
          'rounded-t-3xl sm:rounded-3xl',
          'border border-border/80 bg-surface shadow-card',
          'pb-safe',
          sizes[size],
        )}
      >
        {(title || !hideClose) && (
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
            <h3 className="text-xl text-gold-sheen">{title}</h3>
            {!hideClose && (
              <IconButton label="إغلاق" size="sm" onClick={onClose}>
                ✕
              </IconButton>
            )}
          </header>
        )}
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  );
}
