import { useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { IconButton } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface TopBarProps {
  title?: string;
  /** Show a back chevron. If `onBack` omitted, navigates -1. */
  showBack?: boolean;
  onBack?: () => void;
  /** Slot rendered at the start (right edge in RTL). */
  actions?: ReactNode;
  className?: string;
}

export function TopBar({ title, showBack = true, onBack, actions, className }: TopBarProps) {
  const navigate = useNavigate();
  const handleBack = () => (onBack ? onBack() : navigate(-1));

  return (
    <header
      className={cn(
        'pt-safe sticky top-0 z-20 flex h-16 items-center gap-3 px-4',
        'border-b border-border/50 bg-bg/80 backdrop-blur-md',
        className,
      )}
    >
      {showBack ? (
        // In RTL, "back" visually points to the right (→).
        <IconButton label="رجوع" size="sm" onClick={handleBack}>
          →
        </IconButton>
      ) : (
        <span className="w-9" />
      )}

      <h2 className="flex-1 truncate text-center text-lg font-extrabold text-content">
        {title}
      </h2>

      <div className="flex min-w-9 items-center justify-end gap-2">{actions}</div>
    </header>
  );
}
