import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './ExitEditDialog.module.css';

interface ExitEditDialogProps {
  onExit: () => void;
  onCopy: () => void;
  onCancel: () => void;
  /** Number of pending edits — used for the nudge copy only. */
  editsCount: number;
}

/**
 * Modal confirm shown when the designer clicks "Exit edit mode" while
 * edits are still staged. Two primary paths:
 *   - Exit (primary / destructive): discard the stack and close edit mode.
 *   - Copy edits (secondary): copy the blurb to the clipboard, stay in
 *     edit mode so the designer can review before exiting.
 *
 * Backdrop click + Escape dismiss the dialog without exiting.
 */
export default function ExitEditDialog({
  onExit,
  onCopy,
  onCancel,
  editsCount,
}: ExitEditDialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCancel();
      }
    }
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [onCancel]);

  return createPortal(
    <div
      className={styles.backdrop}
      data-tabby-edit-overlay
      onClick={onCancel}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tabby-exit-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.title} id="tabby-exit-dialog-title">
          Are you sure you want to exit edit mode?
        </div>
        <div className={styles.body}>
          Copy changes for your AI tool before exiting. You have{' '}
          <strong>{editsCount}</strong> pending{' '}
          {editsCount === 1 ? 'edit' : 'edits'}.
        </div>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={onCopy}>
            <CopyIcon />
            <span>Copy edits</span>
          </button>
          <button type="button" className={styles.primary} onClick={onExit}>
            Exit
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="5" y="5" width="9" height="9" rx="1.5" />
      <path d="M3 11V3a1 1 0 0 1 1-1h7" />
    </svg>
  );
}
