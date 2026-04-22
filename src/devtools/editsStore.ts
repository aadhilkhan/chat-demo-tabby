/**
 * In-memory store of pending live-preview edits, keyed by
 * (file, line, propertyName) so repeated tweaks of the same property
 * on the same element merge into one stacked card. Used by
 * EditOverlay (writer) + EditStack (reader) + EditSidebar (reader).
 *
 * Subscribers re-render when the list mutates. Minimal vanilla store
 * — same pattern as editBus.ts, no external state library.
 */

import type { ChangeEntry } from './blurb';
import type { Revert } from './livePreview';

export interface LiveEdit {
  id: string;
  source: { file: string; line: number; column: number };
  element: {
    component: string;
    componentModule: string | null;
    innerText?: string;
  };
  change: ChangeEntry;
  /** Calls the livePreview revert AND leaves the DOM as it was pre-first-apply. */
  revert: Revert;
}

type Listener = (edits: LiveEdit[]) => void;

export interface NoteEntry {
  id: string;
  source: { file: string; line: number; column: number };
  element: { component: string; componentModule: string | null; innerText?: string };
  text: string;
}

/**
 * Notes are keyed by `file:line` so they attach to a selected element
 * as a whole, not to any one change. Designer types a comment in the
 * sidebar, hits Done, and it appears in the left stack as a card —
 * indistinguishable from any other edit from the designer's POV.
 */
export function noteKey(source: { file: string; line: number }): string {
  return `${source.file}:${source.line}`;
}

function makeNoteId(): string {
  const g: any = globalThis;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

class EditsStore {
  private edits: LiveEdit[] = [];
  private notesMap = new Map<string, NoteEntry>();
  private listeners = new Set<Listener>();

  getAll(): LiveEdit[] {
    return this.edits;
  }

  getNotes(): NoteEntry[] {
    return Array.from(this.notesMap.values());
  }

  size(): number {
    return this.edits.length + this.notesMap.size;
  }

  getNote(source: { file: string; line: number }): string {
    return this.notesMap.get(noteKey(source))?.text ?? '';
  }

  setNote(
    source: { file: string; line: number; column: number },
    text: string,
    element?: NoteEntry['element'],
  ): void {
    const key = noteKey(source);
    const trimmed = text.trimEnd();
    if (!trimmed) {
      if (!this.notesMap.has(key)) return;
      this.notesMap.delete(key);
    } else {
      const existing = this.notesMap.get(key);
      if (existing && existing.text === trimmed) return;
      this.notesMap.set(key, {
        id: existing?.id ?? makeNoteId(),
        source,
        element: element ?? existing?.element ?? { component: 'Component', componentModule: null },
        text: trimmed,
      });
    }
    this.emit();
  }

  removeNoteById(id: string): void {
    for (const [key, entry] of this.notesMap) {
      if (entry.id === id) {
        this.notesMap.delete(key);
        this.emit();
        return;
      }
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /**
   * Merge-or-insert semantics:
   *  - If an edit exists with the same (file, line, propertyName),
   *    update its `newValue` to the incoming one and keep the existing
   *    revert (which still rolls back to the pre-first-apply state).
   *  - Otherwise, push the incoming edit.
   *
   * Caller (EditOverlay) is responsible for calling livePreview.apply()
   * BEFORE this, and passing the returned revert in `incoming.revert`.
   */
  addOrMerge(incoming: LiveEdit): void {
    const key = keyOf(incoming);
    const i = this.edits.findIndex((e) => keyOf(e) === key);
    if (i === -1) {
      this.edits = [...this.edits, incoming];
    } else {
      const existing = this.edits[i];
      const merged: LiveEdit = {
        ...existing,
        change: mergeNewValue(existing.change, incoming.change),
        element: incoming.element, // refresh innerText in case textContent changed
      };
      // The incoming revert is redundant — we already have the real original
      // snapshot in `existing.revert`. Drop the incoming revert by not using it.
      // We also immediately undo the incoming revert because its snapshot is
      // the already-applied value, not the true original. But livePreview's
      // revert fn, once dropped, simply isn't called — no harm.
      const next = this.edits.slice();
      next[i] = merged;
      this.edits = next;
    }
    this.emit();
  }

  removeById(id: string): void {
    const edit = this.edits.find((e) => e.id === id);
    if (!edit) return;
    edit.revert();
    this.edits = this.edits.filter((e) => e.id !== id);
    this.emit();
  }

  clear(): void {
    // Revert in reverse order so later edits that depend on earlier
    // layers peel off cleanly.
    for (let i = this.edits.length - 1; i >= 0; i--) {
      this.edits[i].revert();
    }
    this.edits = [];
    this.notesMap.clear();
    this.emit();
  }

  private emit(): void {
    for (const fn of this.listeners) fn(this.edits);
  }
}

function keyOf(edit: LiveEdit): string {
  const propKey = propertyOf(edit.change);
  return `${edit.source.file}:${edit.source.line}::${propKey}`;
}

function propertyOf(change: ChangeEntry): string {
  if (change.type === 'textContent') return '__text__';
  if (change.type === 'prop') return `prop:${change.propName}`;
  return `style:${change.styleProperty}`;
}

function mergeNewValue(existing: ChangeEntry, incoming: ChangeEntry): ChangeEntry {
  // By construction keys match, so the discriminators match too.
  if (existing.type === 'textContent' && incoming.type === 'textContent') {
    return { ...existing, newValue: incoming.newValue };
  }
  if (existing.type === 'prop' && incoming.type === 'prop') {
    return { ...existing, newValue: incoming.newValue };
  }
  if (existing.type === 'style' && incoming.type === 'style') {
    return { ...existing, newValue: incoming.newValue };
  }
  // Should not happen given keyOf, but stay safe.
  return incoming;
}

export const editsStore = new EditsStore();
