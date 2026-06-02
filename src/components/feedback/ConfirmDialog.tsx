import { Button } from '@/components/ui/Button';

export interface ConfirmDialogProps {
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  message,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="space-y-6">
      <p className="text-content/90 leading-relaxed">{message}</p>
      <div className="flex gap-3">
        <Button variant="ghost" block onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={danger ? 'danger' : 'primary'} block onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
