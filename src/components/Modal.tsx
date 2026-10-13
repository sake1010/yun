import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * 用瀏覽器內建的 <dialog> 做對話框:自動有鍵盤焦點管理、按 Esc 關閉、背景不可操作。
 * 點對話框外面(暗色背景)也會關閉。
 */
export function Modal({ open, onClose, label, className, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={className}
      aria-label={label}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}
