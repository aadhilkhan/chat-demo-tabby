import { useEffect, useState } from 'react';
import { editsStore, type LiveEdit, type NoteEntry } from './editsStore';
import type { ChangeEntry } from './blurb';
import styles from './EditStack.module.css';

interface EditStackProps {
  /** Called when the user hits the trash icon on a single card. */
  onRemove: (id: string) => void;
  /** "Remove all changes" — fully clears the stack + reverts live preview. */
  onRemoveAll: () => void;
  /** "Copy all changes" — shown always for a single explicit action. */
  onCopyAll: () => void;
}

type StackItem =
  | { kind: 'edit'; entry: LiveEdit }
  | { kind: 'note'; entry: NoteEntry };

export default function EditStack({ onRemove, onRemoveAll, onCopyAll }: EditStackProps) {
  const [edits, setEdits] = useState<LiveEdit[]>(editsStore.getAll());
  const [notes, setNotes] = useState<NoteEntry[]>(editsStore.getNotes());

  useEffect(
    () =>
      editsStore.subscribe(() => {
        setEdits(editsStore.getAll());
        setNotes(editsStore.getNotes());
      }),
    [],
  );

  const items: StackItem[] = [
    ...edits.map<StackItem>((e) => ({ kind: 'edit', entry: e })),
    ...notes.map<StackItem>((n) => ({ kind: 'note', entry: n })),
  ];

  if (items.length === 0) return null;

  return (
    <aside className={styles.root} data-tabby-edit-overlay aria-label="Pending edits">
      <div className={styles.header}>
        <span className={styles.title}>Edits</span>
        <span className={styles.count}>{items.length}</span>
      </div>

      <div className={styles.list}>
        {items.map((item) =>
          item.kind === 'edit' ? (
            <EditCard key={item.entry.id} edit={item.entry} onRemove={onRemove} />
          ) : (
            <NoteCard key={item.entry.id} note={item.entry} onRemove={onRemove} />
          ),
        )}
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.secondary} onClick={onRemoveAll}>
          Remove all
        </button>
        <button type="button" className={styles.primary} onClick={onCopyAll}>
          {items.length > 1 ? 'Copy all changes' : 'Copy change'}
        </button>
      </div>
    </aside>
  );
}

function EditCard({
  edit,
  onRemove,
}: {
  edit: LiveEdit;
  onRemove: (id: string) => void;
}) {
  const { label, oldValue, newValue } = describe(edit.change);
  const file = edit.source.file.split('/').pop() ?? edit.source.file;
  return (
    <div className={styles.card}>
      <div className={styles.cardMeta}>
        <span className={styles.cardComponent}>{edit.element.component}</span>
        <span className={styles.cardLoc}>
          {file}:{edit.source.line}
        </span>
      </div>
      <div className={styles.cardChange}>
        <span className={styles.cardLabel}>{label}</span>
        <div className={styles.cardValues}>
          <span className={styles.valueOld} title={oldValue}>
            {oldValue || '—'}
          </span>
          <span className={styles.valueArrow}>→</span>
          <span className={styles.valueNew} title={newValue}>
            {newValue}
          </span>
        </div>
      </div>
      <button
        type="button"
        className={styles.delete}
        aria-label="Remove edit"
        onClick={() => onRemove(edit.id)}
      >
        ×
      </button>
    </div>
  );
}

function NoteCard({
  note,
  onRemove,
}: {
  note: NoteEntry;
  onRemove: (id: string) => void;
}) {
  const file = note.source.file.split('/').pop() ?? note.source.file;
  return (
    <div className={styles.card}>
      <div className={styles.cardMeta}>
        <span className={styles.cardComponent}>{note.element.component}</span>
        <span className={styles.cardLoc}>
          {file}:{note.source.line}
        </span>
      </div>
      <div className={styles.cardChange}>
        <span className={styles.cardLabel}>Comment</span>
        <div className={styles.noteText} title={note.text}>
          {note.text}
        </div>
      </div>
      <button
        type="button"
        className={styles.delete}
        aria-label="Remove comment"
        onClick={() => onRemove(note.id)}
      >
        ×
      </button>
    </div>
  );
}

function describe(change: ChangeEntry): { label: string; oldValue: string; newValue: string } {
  if (change.type === 'textContent') {
    return { label: 'Text', oldValue: change.oldValue, newValue: change.newValue };
  }
  if (change.type === 'prop') {
    return {
      label: change.propName,
      oldValue: String(change.oldValue ?? ''),
      newValue: String(change.newValue ?? ''),
    };
  }
  return {
    label: change.styleProperty,
    oldValue: change.oldValue,
    newValue: change.newValue,
  };
}
