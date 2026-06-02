import type { ReactNode } from 'react';
import { TopBar, type TopBarProps } from './TopBar';
import { cn } from '@/lib/cn';

export interface ScreenContainerProps {
  /** When provided, a TopBar is rendered with these props. */
  header?: TopBarProps;
  /** Sticky footer area (e.g. primary CTA). */
  footer?: ReactNode;
  /** Center content vertically (good for menu / empty states). */
  center?: boolean;
  /** Disable the default entrance animation. */
  noAnimate?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * The standard screen scaffold. Every feature screen renders inside one of
 * these so headers, padding, scroll behaviour and footers stay consistent.
 */
export function ScreenContainer({
  header,
  footer,
  center = false,
  noAnimate = false,
  className,
  children,
}: ScreenContainerProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      {header && <TopBar {...header} />}

      <main
        className={cn(
          'mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6',
          center && 'justify-center',
          !noAnimate && 'animate-rise-in',
          className,
        )}
      >
        {children}
      </main>

      {footer && (
        <footer className="pb-safe sticky bottom-0 z-10 border-t border-border/50 bg-bg/85 backdrop-blur-md">
          <div className="mx-auto w-full max-w-md px-5 py-4">{footer}</div>
        </footer>
      )}
    </div>
  );
}
