import { useCallback } from 'react';
import { useModalStore, type ModalOptions } from '@/store';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

/**
 * Ergonomic access to the modal system.
 * `confirm` returns a promise that resolves true/false based on user choice.
 */
export function useModal() {
  const open = useModalStore((s) => s.open);
  const close = useModalStore((s) => s.close);
  const closeAll = useModalStore((s) => s.closeAll);

  const confirm = useCallback(
    (opts: {
      title?: string;
      message: string;
      confirmLabel?: string;
      cancelLabel?: string;
      danger?: boolean;
    }): Promise<boolean> =>
      new Promise((resolve) => {
        let id = '';
        const settle = (value: boolean) => () => {
          resolve(value);
          close(id);
        };
        const modalOptions: ModalOptions = {
          title: opts.title,
          size: 'sm',
          onClose: () => resolve(false),
        };
        id = open(
          <ConfirmDialog
            message={opts.message}
            confirmLabel={opts.confirmLabel}
            cancelLabel={opts.cancelLabel}
            danger={opts.danger}
            onConfirm={settle(true)}
            onCancel={settle(false)}
          />,
          modalOptions,
        );
      }),
    [open, close],
  );

  return { open, close, closeAll, confirm };
}
