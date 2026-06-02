import { create } from 'zustand';
import type { ReactNode } from 'react';
import { createId } from '@/lib/constants';

export interface ModalOptions {
  /** Optional heading rendered in the modal chrome. */
  title?: string;
  /** Hide the default close (X) button. */
  hideClose?: boolean;
  /** Clicking the backdrop dismisses the modal (default: true). */
  dismissable?: boolean;
  /** Max width preset for the modal panel. */
  size?: 'sm' | 'md' | 'lg';
  /** Fired when the modal is closed (by any means). */
  onClose?: () => void;
}

export interface ModalEntry extends ModalOptions {
  id: string;
  content: ReactNode;
}

interface ModalState {
  stack: ModalEntry[];
  open: (content: ReactNode, options?: ModalOptions) => string;
  close: (id?: string) => void;
  closeAll: () => void;
}

/**
 * Stack-based so confirmation dialogs can layer over other modals.
 * The <ModalRoot/> component subscribes to `stack` and renders it.
 */
export const useModalStore = create<ModalState>((set, get) => ({
  stack: [],

  open: (content, options = {}) => {
    const id = createId();
    set((state) => ({
      stack: [...state.stack, { id, content, dismissable: true, size: 'md', ...options }],
    }));
    return id;
  },

  close: (id) =>
    set((state) => {
      const target = id
        ? state.stack.find((m) => m.id === id)
        : state.stack[state.stack.length - 1];
      target?.onClose?.();
      return {
        stack: id
          ? state.stack.filter((m) => m.id !== id)
          : state.stack.slice(0, -1),
      };
    }),

  closeAll: () => {
    get().stack.forEach((m) => m.onClose?.());
    set({ stack: [] });
  },
}));
