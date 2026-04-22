/**
 * Shared copy logic used by both EditOverlay (Copy button in the stack
 * footer) and TopBar (Copy edits button inside the Exit dialog).
 * Keeps blurb construction + clipboard handling in one place so the
 * two paths can't drift in what they emit.
 */

import {
  buildBlurbs,
  copyToClipboard,
  type ChangeEntry,
  type EditPayload,
} from './blurb';
import { editsStore, noteKey, type LiveEdit } from './editsStore';

const VARIANT_STORAGE_KEY = 'tabby-prototype-active-variant';

function readActiveVariant(): string | undefined {
  try {
    const v = window.sessionStorage.getItem(VARIANT_STORAGE_KEY);
    return v ?? undefined;
  } catch {
    return undefined;
  }
}

function groupEdits(edits: LiveEdit[]): Array<{
  source: EditPayload['source'];
  element: EditPayload['element'];
  changes: ChangeEntry[];
  notes?: string;
}> {
  const byKey = new Map<
    string,
    {
      source: EditPayload['source'];
      element: EditPayload['element'];
      changes: ChangeEntry[];
      notes?: string;
    }
  >();
  for (const edit of edits) {
    const k = noteKey(edit.source);
    const existing = byKey.get(k);
    if (existing) {
      existing.changes.push(edit.change);
      existing.element = edit.element;
    } else {
      byKey.set(k, {
        source: edit.source,
        element: edit.element,
        changes: [edit.change],
      });
    }
  }
  for (const note of editsStore.getNotes()) {
    const k = noteKey(note.source);
    const group = byKey.get(k);
    if (group) {
      group.notes = note.text;
    } else {
      byKey.set(k, {
        source: note.source,
        element: note.element,
        changes: [],
        notes: note.text,
      });
    }
  }
  return Array.from(byKey.values());
}

export function buildEditsPayload(project: string, projectRoot: string): string {
  const groups = groupEdits(editsStore.getAll());
  return buildBlurbs(
    { project, projectRoot, activeVariant: readActiveVariant() },
    groups,
  );
}

export async function copyEditsToClipboard(
  project: string,
  projectRoot: string,
): Promise<boolean> {
  const size = editsStore.size();
  if (size === 0) return false;
  const payload = buildEditsPayload(project, projectRoot);
  return copyToClipboard(payload);
}
