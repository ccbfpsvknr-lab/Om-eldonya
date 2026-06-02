import { createPortal } from 'react-dom';
import { useModalStore } from '@/store';
import { ModalShell } from '@/components/ui/Modal';

/**
 * Single mount point for the modal system. Render once near the app root.
 * Subscribes to the modal stack and portals each entry into #modal-root.
 */
export function ModalRoot() {
  const stack = useModalStore((s) => s.stack);
  const close = useModalStore((s) => s.close);

  const host = typeof document !== 'undefined' ? document.getElementById('modal-root') : null;
  if (!host || stack.length === 0) return null;

  return createPortal(
    <>
      {stack.map((entry, i) => (
        <ModalShell
          key={entry.id}
          title={entry.title}
          size={entry.size}
          hideClose={entry.hideClose}
          dismissable={entry.dismissable}
          depth={i}
          onClose={() => close(entry.id)}
        >
          {entry.content}
        </ModalShell>
      ))}
    </>,
    host,
  );
}
