import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { editBus } from './editBus';
import {
  detectFiberShape,
  parseStamp,
  resolveFiberFromElement,
  type ResolvedFiber,
} from './resolveFiber';
import { type ChangeEntry } from './blurb';
import { copyEditsToClipboard } from './editCopier';
import { applyChange } from './livePreview';
import { editsStore, type LiveEdit } from './editsStore';
import { findVariantOwner } from './textVariants';
import { useEditModeAvailable } from './useEditModeAvailable';
import EditSidebar, { type ElementKind } from './EditSidebar';
import EditStack from './EditStack';
import styles from './EditOverlay.module.css';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EDITABLE_ROOT_SELECTOR = '[data-tabby-editable-root]';
const OVERLAY_NODE_SELECTOR = '[data-tabby-edit-overlay]';

function rectFor(el: HTMLElement): SelectionBox {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, width: r.width, height: r.height };
}

function isOverlayNode(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(OVERLAY_NODE_SELECTOR));
}

function isInsideEditableRoot(node: EventTarget | null): boolean {
  if (!(node instanceof Element)) return false;
  return Boolean(node.closest(EDITABLE_ROOT_SELECTOR));
}

/**
 * Text-kind covers:
 *  - The literal tabby-ui `<Text>` component.
 *  - Any leaf-text host element the designer might have in their JSX
 *    (span/p/h1–h6/strong/em/b/i/a/label) whose only children are text
 *    nodes. Catches nested subtext like `<span>caption detail</span>`
 *    rendered inside a Text block.
 *
 * Everything else — divs, form controls, inputs, components with block
 * children — is treated as a container.
 */
const TEXT_LEAF_TAGS = new Set([
  'SPAN',
  'P',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'STRONG',
  'EM',
  'B',
  'I',
  'A',
  'LABEL',
  'SMALL',
]);

function classifyKind(selected: ResolvedFiber): ElementKind {
  if (selected.component === 'Text') return 'text';
  const el = selected.domNode;
  if (TEXT_LEAF_TAGS.has(el.tagName) && isTextLeaf(el)) return 'text';
  return 'container';
}

function isTextLeaf(el: HTMLElement): boolean {
  if (!el.textContent || !el.textContent.trim()) return false;
  // No element children → pure text leaf.
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.ELEMENT_NODE) return false;
  }
  return true;
}

function makeId(): string {
  const g: any = globalThis;
  if (g.crypto?.randomUUID) return g.crypto.randomUUID();
  return 'edit-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

export default function EditOverlay() {
  const [active, setActive] = useState(editBus.isEnabled());
  const [hovered, setHovered] = useState<HTMLElement | null>(null);
  const [selected, setSelected] = useState<ResolvedFiber | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [, setEditsTick] = useState(0);
  const supported = useRef<boolean | null>(null);
  const available = useEditModeAvailable();
  const projectRoot = useMemo(
    () => import.meta.env.VITE_TABBY_PROJECT_ROOT ?? '',
    [],
  );
  const projectName = useMemo(
    () => import.meta.env.VITE_TABBY_PROJECT_NAME ?? 'prototype',
    [],
  );

  useEffect(() => editBus.subscribe(setActive), []);
  useEffect(() => editsStore.subscribe(() => setEditsTick((t) => t + 1)), []);

  useEffect(() => {
    if (supported.current === null) {
      const ok = detectFiberShape();
      supported.current = ok;
      if (!ok) {
        // eslint-disable-next-line no-console
        console.warn(
          '[tabby-edit] Disabled: no data-tabby-source stamps found. ' +
            'Is the Babel plugin in vite.config.ts active?',
        );
      }
    }
  }, [active]);

  useEffect(() => {
    if (!active) {
      editsStore.clear();
      setHovered(null);
      setSelected(null);
    }
  }, [active]);

  // Body class drives `user-select: none` across the phone content so
  // drag-selecting text doesn't fire while the overlay is active.
  useEffect(() => {
    if (!active) return;
    document.body.classList.add('tabby-edit-active');
    return () => document.body.classList.remove('tabby-edit-active');
  }, [active]);

  const onPointerMove = useCallback(
    (e: PointerEvent) => {
      if (!active) return;
      if (isOverlayNode(e.target)) {
        setHovered(null);
        return;
      }
      if (!isInsideEditableRoot(e.target)) {
        setHovered(null);
        return;
      }
      setHovered(e.target as HTMLElement);
    },
    [active],
  );

  const onClick = useCallback(
    (e: MouseEvent) => {
      if (!active) return;
      if (isOverlayNode(e.target)) return;
      // Whether or not the click is on an editable element, block the
      // prototype from reacting — no button presses, no form submits.
      e.preventDefault();
      e.stopPropagation();
      if (!isInsideEditableRoot(e.target)) {
        // Clicking the page background (outside the phone + outside
        // the sidebar/stack/topbar) dismisses the current selection.
        setHovered(null);
        setSelected(null);
        return;
      }
      const el = e.target as HTMLElement;
      const resolved = resolveFiberFromElement(el, projectRoot);
      if (!resolved) {
        showToast('Could not resolve source — click a tabby-ui component.');
        return;
      }
      setSelected(resolved);
    },
    [active, projectRoot],
  );

  // Prevents focus landing on inputs / buttons inside the phone while
  // edit mode is on — without this, clicking a TextField would focus
  // the native <input> and the user could type into the prototype
  // instead of the sidebar.
  const onPointerDown = useCallback(
    (e: PointerEvent | MouseEvent) => {
      if (!active) return;
      if (isOverlayNode(e.target)) return;
      if (!isInsideEditableRoot(e.target)) return;
      e.preventDefault();
      e.stopPropagation();
    },
    [active],
  );

  useEffect(() => {
    if (!active || supported.current === false) return;
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('click', onClick, true);
    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('click', onClick, true);
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [active, onPointerMove, onClick, onPointerDown]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(
      () => setToast((prev) => (prev === msg ? null : prev)),
      2500,
    );
  }


  const handleChange = useCallback(
    (change: ChangeEntry) => {
      if (!selected) return;
      // Variant changes act on the nearest ancestor that actually carries
      // `tui-text_variant-*` (typically the parent Text component's root
      // when the designer clicked a nested span). The resulting LiveEdit
      // is stamped with THAT element's source so Claude rewrites the
      // right JSX callsite instead of the subtext.
      let targetEl: HTMLElement = selected.domNode;
      let source = selected.source;
      let componentName = selected.component;
      let componentModule = selected.componentModule;
      if (change.type === 'prop' && change.propName === 'variant') {
        const owner = findVariantOwner(selected.domNode);
        if (owner && owner.el !== selected.domNode) {
          targetEl = owner.el;
          const stamp = owner.el.getAttribute('data-tabby-source');
          const stampedName = owner.el.getAttribute('data-tabby-component');
          if (stamp) {
            const parsed = parseStamp(stamp);
            if (parsed) source = parsed;
          }
          if (stampedName) componentName = stampedName;
          componentModule = null;
        }
      }
      const revert = applyChange(targetEl, change);
      const liveEdit: LiveEdit = {
        id: makeId(),
        source,
        element: {
          component: componentName,
          componentModule,
          innerText: targetEl.textContent?.slice(0, 200) ?? undefined,
        },
        change,
        revert,
      };
      editsStore.addOrMerge(liveEdit);
    },
    [selected],
  );

  const handleNote = useCallback(
    (note: string) => {
      if (!selected) return;
      editsStore.setNote(selected.source, note, {
        component: selected.component,
        componentModule: selected.componentModule,
        innerText: selected.domNode.textContent?.slice(0, 200) ?? undefined,
      });
    },
    [selected],
  );

  const handleRemove = useCallback((id: string) => {
    // The stack renders edits AND notes in one list; either store may own the id.
    editsStore.removeById(id);
    editsStore.removeNoteById(id);
  }, []);

  const handleRemoveAll = useCallback(() => {
    editsStore.clear();
    showToast('All edits reverted.');
  }, []);

  const handleCopyAll = useCallback(async () => {
    if (editsStore.size() === 0) {
      showToast('No edits to copy.');
      return;
    }
    const ok = await copyEditsToClipboard(projectName, projectRoot);
    showToast(ok ? 'Copied.' : 'Copy failed — see console.');
  }, [projectName, projectRoot]);

  if (!available) return null;
  if (supported.current === false) return null;
  if (!active) return null;

  const hoverBox =
    hovered && (!selected || hovered !== selected.domNode) ? rectFor(hovered) : null;
  const selectBox = selected ? rectFor(selected.domNode) : null;
  const kind: ElementKind | null = selected ? classifyKind(selected) : null;
  const currentNote = selected ? editsStore.getNote(selected.source) : '';

  return createPortal(
    <div className={styles.root} data-tabby-edit-overlay>
      {hoverBox && (
        <div
          className={styles.hoverBox}
          style={{
            left: hoverBox.x,
            top: hoverBox.y,
            width: hoverBox.width,
            height: hoverBox.height,
          }}
        />
      )}
      {selectBox && (
        <div
          className={styles.selectBox}
          style={{
            left: selectBox.x,
            top: selectBox.y,
            width: selectBox.width,
            height: selectBox.height,
          }}
        />
      )}

      <EditStack
        onRemove={handleRemove}
        onRemoveAll={handleRemoveAll}
        onCopyAll={handleCopyAll}
      />

      <EditSidebar
        selected={selected}
        kind={kind}
        note={currentNote}
        onChange={handleChange}
        onNoteChange={handleNote}
        onClose={() => setSelected(null)}
      />


      {toast && <div className={styles.toast}>{toast}</div>}
    </div>,
    document.body,
  );
}

