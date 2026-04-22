import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEntry } from './blurb';
import { editsStore } from './editsStore';
import type { ResolvedFiber } from './resolveFiber';
import {
  findVariantOwner,
  VARIANT_GROUPS,
} from './textVariants';
import { defaultGroupKeyFor, findTokenByValue, getTokenGroups, type TokenGroup } from './tokens';

/* eslint-disable @typescript-eslint/no-explicit-any */

export type ElementKind = 'text' | 'container';

interface EditSidebarProps {
  selected: ResolvedFiber | null;
  kind: ElementKind | null;
  note: string;
  onChange: (change: ChangeEntry) => void;
  onNoteChange: (note: string) => void;
  onClose: () => void;
}

import styles from './EditSidebar.module.css';

export default function EditSidebar({
  selected,
  kind,
  note,
  onChange,
  onNoteChange,
  onClose,
}: EditSidebarProps) {
  // Tick on every edit-store change so we re-read live DOM values.
  const [, setTick] = useState(0);
  useEffect(() => editsStore.subscribe(() => setTick((t) => t + 1)), []);

  if (!selected || !kind) {
    return (
      <aside className={styles.root} data-tabby-edit-overlay aria-label="Properties">
        <div className={styles.headerEmpty}>
          <div className={styles.emptyTitle}>Properties</div>
        </div>
        <div className={styles.empty}>
          <div className={styles.emptyIcon} aria-hidden>
            {/* Simple pointer-into-square glyph to hint at "click something". */}
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="20" height="20" rx="3" />
              <path d="M17 17l8 8" />
              <path d="M19 25h6v-6" />
            </svg>
          </div>
          <div className={styles.emptyHeadline}>Select an element to edit</div>
          <div className={styles.emptyHint}>
            Click anywhere inside the phone to see its properties here.
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.root} data-tabby-edit-overlay aria-label="Properties">
      <div className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.component}>{selected.component}</div>
          <div className={styles.location}>
            {selected.source.file}:{selected.source.line}
          </div>
        </div>
        <button
          type="button"
          className={styles.close}
          aria-label="Close properties"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className={styles.body}>
        {kind === 'text' ? (
          <TextControls selected={selected} onChange={onChange} />
        ) : (
          <ContainerControls selected={selected} onChange={onChange} />
        )}

        <LevelSelector selected={selected} onChange={onChange} />

        <CommentField savedNote={note} onCommit={onNoteChange} />
      </div>
    </aside>
  );
}

/* ----------------------------- TEXT KIND ----------------------------- */

function TextControls({
  selected,
  onChange,
}: {
  selected: ResolvedFiber;
  onChange: (change: ChangeEntry) => void;
}) {
  const el = selected.domNode;
  const currentText = el.textContent ?? '';
  // Variant may live on the element itself OR on an ancestor (the
  // Text component's root when the designer clicked a nested span).
  // Either way we show it. Changes route through EditOverlay's
  // handleChange, which walks up to the same owner to apply the swap
  // and stamps the resulting LiveEdit with that owner's source.
  const variantOwner = findVariantOwner(el);
  const currentVariant = variantOwner?.variant ?? null;
  const variantInherited = variantOwner !== null && variantOwner.el !== el;
  const currentColor = readInlineTokenOr(el, 'color');

  return (
    <>
      <FieldGroup label="Content">
        <LiveTextField
          initial={currentText}
          onLiveChange={(next) =>
            onChange({ type: 'textContent', oldValue: currentText, newValue: next })
          }
        />
      </FieldGroup>

      {currentVariant !== null && (
        <FieldGroup label="Typography">
          <select
            className={styles.select}
            value={currentVariant}
            onChange={(e) => {
              const next = e.target.value;
              if (next === currentVariant) return;
              onChange({
                type: 'prop',
                propName: 'variant',
                oldValue: currentVariant,
                newValue: next,
              });
            }}
          >
            {VARIANT_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.variants.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {variantInherited && (
            <span className={styles.hint}>Inherited — edit applies to parent Text</span>
          )}
        </FieldGroup>
      )}

      <FieldGroup label="Color">
        <ColorTokenDropdown
          property="color"
          currentToken={currentColor.token}
          currentComputed={currentColor.computed}
          onChange={(token) =>
            onChange({
              type: 'style',
              styleProperty: 'color',
              oldValue: currentColor.token ?? currentColor.computed,
              newValue: `var(${token})`,
              cssContext: { className: selected.component, appliedBy: 'inline' },
            })
          }
        />
      </FieldGroup>
    </>
  );
}

/* --------------------------- CONTAINER KIND -------------------------- */

function ContainerControls({
  selected,
  onChange,
}: {
  selected: ResolvedFiber;
  onChange: (change: ChangeEntry) => void;
}) {
  const el = selected.domNode;
  const cs = getComputedStyle(el);
  const hasBackground = !isTransparent(cs.backgroundColor);
  const isFlex = cs.display.includes('flex');

  const currentBg = readInlineTokenOr(el, 'background-color');

  return (
    <>
      {hasBackground && (
        <FieldGroup label="Background">
          <ColorTokenDropdown
            property="background-color"
            currentToken={currentBg.token}
            currentComputed={currentBg.computed}
            onChange={(token) =>
              onChange({
                type: 'style',
                styleProperty: 'background-color',
                oldValue: currentBg.token ?? currentBg.computed,
                newValue: `var(${token})`,
                cssContext: { className: selected.component, appliedBy: 'inline' },
              })
            }
          />
        </FieldGroup>
      )}

      <FieldGroup label="Padding">
        <FourSideBox element={el} side="padding" onChange={onChange} component={selected.component} />
      </FieldGroup>

      <FieldGroup label="Margin">
        <FourSideBox element={el} side="margin" onChange={onChange} component={selected.component} />
      </FieldGroup>

      {isFlex && (
        <FieldGroup label="Gap">
          <SpacingStepper
            value={el.style.gap || cs.gap}
            onCommit={(next) =>
              onChange({
                type: 'style',
                styleProperty: 'gap',
                oldValue: el.style.gap || cs.gap,
                newValue: next,
                cssContext: { className: selected.component, appliedBy: 'inline' },
              })
            }
          />
        </FieldGroup>
      )}
    </>
  );
}

/* --------------------------- LEVEL SELECTOR -------------------------- */

function LevelSelector({
  selected,
  onChange,
}: {
  selected: ResolvedFiber;
  onChange: (change: ChangeEntry) => void;
}) {
  // `selected.fiber` is the nearest DOM fiber — its memoizedProps are
  // DOM attributes. To find a `level` prop we walk up the fiber return
  // chain to the first non-host fiber that explicitly provides one.
  const rawLevel = findLevelPropInFiberChain(selected.fiber);
  if (rawLevel === undefined || rawLevel === null) return null;
  const current = String(rawLevel);

  return (
    <FieldGroup label="Level">
      <select
        className={styles.select}
        value={current}
        onChange={(e) => {
          const next = e.target.value;
          if (next === current) return;
          onChange({
            type: 'prop',
            propName: 'level',
            oldValue: typeof rawLevel === 'number' ? rawLevel : current,
            newValue: Number.isFinite(Number(next)) ? Number(next) : next,
          });
        }}
      >
        {['1', '2', '3', '4'].map((lv) => (
          <option key={lv} value={lv}>
            {lv}
          </option>
        ))}
      </select>
      <span className={styles.hint}>
        Level changes apply after Claude rewrites the source.
      </span>
    </FieldGroup>
  );
}

function findLevelPropInFiberChain(fiber: any): unknown {
  let f = fiber;
  let safety = 0;
  while (f && safety < 50) {
    const isHost = typeof (f.elementType ?? f.type) === 'string';
    if (!isHost) {
      const v = f.memoizedProps?.level;
      if (v !== undefined && v !== null) return v;
    }
    f = f.return;
    safety++;
  }
  return undefined;
}

/* --------------------------- COMMENT FIELD --------------------------- */

/**
 * The designer types a comment for Claude, then clicks Done to commit
 * it. The commit pushes the note into the edits store, where it surfaces
 * in the left-side stack as a card (same pattern as any other edit).
 * Before Done is clicked, the typing is purely local state — nothing
 * shows in the stack yet.
 */
function CommentField({
  savedNote,
  onCommit,
}: {
  savedNote: string;
  onCommit: (text: string) => void;
}) {
  const [local, setLocal] = useState(savedNote);
  useEffect(() => setLocal(savedNote), [savedNote]);

  const trimmed = local.trim();
  const dirty = trimmed !== savedNote.trim();
  const canCommit = dirty || (trimmed !== '' && savedNote === '');

  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Comment for Claude</span>
      <textarea
        className={styles.textarea}
        rows={3}
        placeholder="Anything to note for the source edit?"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      <div className={styles.commentActions}>
        <button
          type="button"
          className={canCommit ? styles.commentDone : styles.commentDoneDisabled}
          onClick={() => onCommit(trimmed)}
          disabled={!canCommit}
        >
          {savedNote ? 'Update comment' : 'Add comment'}
        </button>
      </div>
    </div>
  );
}

/* ------------------------ SHARED SUBCOMPONENTS ----------------------- */

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </div>
  );
}

/**
 * Emits textContent changes on every keystroke so the designer sees
 * their typing reflected live in the phone (#4). Empty string is a
 * valid intermediate state — we still emit so the live preview shows
 * the field clearing out.
 */
function LiveTextField({
  initial,
  onLiveChange,
}: {
  initial: string;
  onLiveChange: (next: string) => void;
}) {
  const [local, setLocal] = useState(initial);

  // When the user clicks a different element, sync local to that element's text.
  useEffect(() => setLocal(initial), [initial]);

  return (
    <textarea
      className={styles.textarea}
      value={local}
      rows={3}
      spellCheck
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        onLiveChange(next);
      }}
    />
  );
}

/**
 * Figma-style 2×2 grid of per-side spacing inputs. Each cell shows a
 * small icon hinting which edge of the box it controls, plus a single
 * numeric input (no +/− buttons — just tab through or click to edit).
 * Layout follows the designer's expected order:
 *
 *   ┌─────────┬─────────┐
 *   │ Left    │ Top     │
 *   ├─────────┼─────────┤
 *   │ Right   │ Bottom  │
 *   └─────────┴─────────┘
 */
function FourSideBox({
  element,
  side,
  component,
  onChange,
}: {
  element: HTMLElement;
  side: 'padding' | 'margin';
  component: string;
  onChange: (change: ChangeEntry) => void;
}) {
  const cs = getComputedStyle(element);
  const read = (edge: 'top' | 'right' | 'bottom' | 'left') => {
    const prop = `${side}-${edge}`;
    return element.style.getPropertyValue(prop) || cs.getPropertyValue(prop);
  };

  function emit(edge: 'top' | 'right' | 'bottom' | 'left', next: string) {
    const prop = `${side}-${edge}`;
    const prev = read(edge);
    onChange({
      type: 'style',
      styleProperty: prop,
      oldValue: prev,
      newValue: next,
      cssContext: { className: component, appliedBy: 'inline' },
    });
  }

  return (
    <div className={styles.sideGrid}>
      <SideCell edge="left" value={read('left')} onCommit={(v) => emit('left', v)} />
      <SideCell edge="top" value={read('top')} onCommit={(v) => emit('top', v)} />
      <SideCell edge="right" value={read('right')} onCommit={(v) => emit('right', v)} />
      <SideCell edge="bottom" value={read('bottom')} onCommit={(v) => emit('bottom', v)} />
    </div>
  );
}

function SideCell({
  edge,
  value,
  onCommit,
}: {
  edge: 'top' | 'right' | 'bottom' | 'left';
  value: string;
  onCommit: (next: string) => void;
}) {
  const px = parsePx(value);
  const [local, setLocal] = useState<number>(px);
  useEffect(() => setLocal(px), [px]);

  function commit(next: number) {
    const clamped = Math.max(0, Math.round(next));
    setLocal(clamped);
    onCommit(`${clamped}px`);
  }

  return (
    <label className={styles.sideCell} title={`${edge} — click number to edit`}>
      <SideIcon edge={edge} />
      <input
        className={styles.sideInput}
        type="number"
        value={local}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setLocal(parseInt(e.target.value, 10) || 0)}
        onBlur={() => commit(local)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(local);
          }
        }}
      />
    </label>
  );
}

/**
 * 14×14 square outline with one edge rendered as a solid stroke,
 * matching Figma's per-side indicator. Stays legible at small sizes.
 */
function SideIcon({ edge }: { edge: 'top' | 'right' | 'bottom' | 'left' }) {
  const base = { width: 14, height: 14, fill: 'none' } as const;
  const thin = { stroke: 'currentColor', strokeWidth: 1, opacity: 0.35 } as const;
  const bold = { stroke: 'currentColor', strokeWidth: 2 } as const;
  return (
    <svg {...base} viewBox="0 0 14 14" aria-hidden className={styles.sideIcon}>
      {/* Thin outline */}
      <rect x="3.5" y="3.5" width="7" height="7" rx="1" {...thin} />
      {/* Bold edge */}
      {edge === 'top' && <line x1="3" y1="3" x2="11" y2="3" {...bold} />}
      {edge === 'right' && <line x1="11" y1="3" x2="11" y2="11" {...bold} />}
      {edge === 'bottom' && <line x1="3" y1="11" x2="11" y2="11" {...bold} />}
      {edge === 'left' && <line x1="3" y1="3" x2="3" y2="11" {...bold} />}
    </svg>
  );
}

/** Compact single numeric input for the gap field — hugs its content. */
function SpacingStepper({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (next: string) => void;
}) {
  const px = parsePx(value);
  const [local, setLocal] = useState<number>(px);
  useEffect(() => setLocal(px), [px]);

  function commit(next: number) {
    const clamped = Math.max(0, Math.round(next));
    setLocal(clamped);
    onCommit(`${clamped}px`);
  }

  return (
    <label className={styles.gapInputWrap}>
      <input
        className={styles.gapInput}
        type="number"
        value={local}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setLocal(parseInt(e.target.value, 10) || 0)}
        onBlur={() => commit(local)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit(local);
          }
        }}
      />
      <span className={styles.gapUnit}>px</span>
    </label>
  );
}

/**
 * Searchable combobox of `--tui-*` tokens — closed state shows the
 * current token (or a placeholder), click to open a panel with a
 * search input and a grouped, filterable token list. Keeps the
 * sidebar compact whether or not the designer is picking a color.
 */
function ColorTokenDropdown({
  property,
  currentToken,
  currentComputed,
  onChange,
}: {
  property: 'color' | 'background-color' | 'border-color';
  currentToken: string | null;
  currentComputed?: string;
  onChange: (tokenName: string) => void;
}) {
  const groups = useMemo<TokenGroup[]>(getTokenGroups, []);
  const defaultGroupKey = defaultGroupKeyFor(property);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onDocPointer(e: PointerEvent) {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDocPointer, true);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDocPointer, true);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const filtered = useMemo<TokenGroup[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        tokens: g.tokens.filter(
          (t) => t.name.toLowerCase().includes(q) || g.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.tokens.length > 0);
  }, [groups, query]);

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setQuery('');
  }

  const displayToken = currentToken
    ? currentToken.replace('--tui-', '')
    : (currentComputed?.trim() || '— pick token —');

  return (
    <div className={styles.combo} ref={wrapRef}>
      <button
        type="button"
        className={styles.comboTrigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span className={styles.comboValue}>{displayToken}</span>
        <span className={styles.comboChevron}>▾</span>
      </button>
      {open && (
        <div className={styles.comboPanel}>
          <input
            type="search"
            className={styles.comboSearch}
            placeholder="Search tokens…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className={styles.comboList}>
            {filtered.length === 0 && (
              <div className={styles.comboEmpty}>No tokens match.</div>
            )}
            {filtered.map((g) => (
              <div key={g.key} className={styles.comboGroup}>
                <div className={styles.comboGroupLabel}>{g.label}</div>
                {g.tokens.map((t) => (
                  <button
                    key={t.name}
                    type="button"
                    className={currentToken === t.name ? styles.comboRowActive : styles.comboRow}
                    onClick={() => pick(t.name)}
                    title={t.name}
                  >
                    {t.name.replace('--tui-', '')}
                  </button>
                ))}
              </div>
            ))}
          </div>
          <div className={styles.comboHint}>{defaultGroupKey} tokens most relevant here</div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ HELPERS ------------------------------ */

/**
 * Best-effort identification of the --tui-* token currently applied to
 * an element. First checks an inline `var(--tui-*)` (what livePreview
 * writes), then falls back to matching the element's computed color
 * value against every known token. If nothing matches, returns only
 * the computed value so the trigger still has something useful to
 * show.
 */
function readInlineTokenOr(
  el: HTMLElement,
  property: 'color' | 'background-color',
): { token: string | null; computed: string } {
  const inline = el.style.getPropertyValue(property).trim();
  const match = inline.match(/^var\((--tui-[A-Za-z0-9-]+)\)$/);
  if (match) {
    return { token: match[1], computed: getComputedStyle(el).getPropertyValue(property).trim() };
  }
  const computed = getComputedStyle(el).getPropertyValue(property).trim();
  const groupHint = property === 'color' ? 'front' : 'background-general';
  const resolved = findTokenByValue(computed, groupHint);
  return { token: resolved, computed };
}

function isTransparent(cssColor: string): boolean {
  if (!cssColor) return true;
  if (cssColor === 'transparent') return true;
  const m = cssColor.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(',').map((s) => s.trim());
    if (parts.length === 4 && parseFloat(parts[3]) === 0) return true;
  }
  return false;
}

function parsePx(value: string): number {
  const m = value.match(/([-\d.]+)px/);
  if (!m) return 0;
  return Math.round(parseFloat(m[1]));
}
