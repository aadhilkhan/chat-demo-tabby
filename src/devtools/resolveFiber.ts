/**
 * Given a clicked DOM element, figure out which source file/line the
 * JSX lives in and what the original JSX tag name was.
 *
 * Resolution strategy — DOM-first, fiber-only as fallback:
 *
 *   1. Walk up the DOM from the target looking for the nearest element
 *      carrying `data-tabby-source="file:line:col"`. The Babel plugin
 *      configured in vite.config.ts stamps this on every JSXOpeningElement
 *      at build time. This is the primary path.
 *
 *   2. If nothing on the DOM carries the stamp (e.g. inside a component
 *      that swallows unknown props, or node_modules output), walk the
 *      fiber chain upward and return the nearest non-host fiber with a
 *      component name. Source file/line will be missing in this path,
 *      but component identity is still useful.
 *
 * The old path — reading `_debugSource` off fibers — no longer works in
 * React 19, which stopped exposing JSX source metadata on the fiber.
 *
 * This module uses `any` for fiber shapes because React's fiber type
 * is an internal contract. If a field we read ever changes we degrade
 * gracefully (the stamped DOM attrs keep working regardless).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ResolvedFiber {
  component: string;
  componentModule: string | null;
  source: { file: string; line: number; column: number };
  domNode: HTMLElement;
  fiber: any;
}

const REACT_FIBER_PREFIX = '__reactFiber$';

function getFiberFromNode(node: Node): any | null {
  for (const key of Object.keys(node)) {
    if (key.startsWith(REACT_FIBER_PREFIX)) {
      return (node as any)[key];
    }
  }
  return null;
}

function fiberComponentName(fiber: any): string | null {
  const type = fiber?.elementType ?? fiber?.type;
  if (!type) return null;
  if (typeof type === 'string') return type;
  if (typeof type === 'function') return type.displayName ?? type.name ?? null;
  if (typeof type === 'object') {
    // forwardRef / memo / etc.
    return (
      type.displayName ??
      (type.render && (type.render.displayName ?? type.render.name)) ??
      (type.type && (type.type.displayName ?? type.type.name)) ??
      null
    );
  }
  return null;
}

/**
 * Walks up the fiber chain to find a fiber whose rendered DOM is
 * somewhere nearby and whose source file looks like a tabby-ui module.
 * Used as a best-effort label for the blurb so Claude knows which
 * tabby-ui component was selected. Returns null if nothing resolves.
 */
function fiberModuleHint(fiber: any): string | null {
  const name = fiberComponentName(fiber);
  if (!name) return null;
  // tabby-ui component names are distinctive — Text, Button, Supercell,
  // Informer, Badge, etc. If the name matches a known PascalCase
  // convention assume O25 for now; false positives here only affect
  // the label, not correctness.
  if (/^[A-Z][A-Za-z0-9]+$/.test(name)) {
    return `@tabby.ai/tabby-ui/O25/${name}`;
  }
  return null;
}

/**
 * Confirms the DOM-stamping pipeline is wired. Walks the first few
 * dozen elements under #root looking for a `data-tabby-source`. If
 * nothing is stamped the overlay disables itself.
 */
export function detectFiberShape(): boolean {
  const root = document.getElementById('root');
  if (!root) return false;
  // querySelector is the fastest path — one search across the subtree.
  return Boolean(root.querySelector('[data-tabby-source]'));
}

function stripProjectRoot(fileName: string, projectRoot: string): string {
  if (!projectRoot) return fileName;
  const normalized = projectRoot.endsWith('/') ? projectRoot : projectRoot + '/';
  if (fileName.startsWith(normalized)) return fileName.slice(normalized.length);
  return fileName;
}

/**
 * Given a DOM element, resolve to a file+line+component identity by
 * walking up the DOM looking for `data-tabby-source` stamped by the
 * Babel plugin. `data-tabby-component` carries the original JSX tag
 * name (e.g. "Text", "Button") so we don't have to guess from fibers.
 *
 * Falls back to a fiber-chain walk if nothing in the DOM carries the
 * stamp — source info will be missing but component identity stays.
 */
export function resolveFiberFromElement(
  el: HTMLElement,
  projectRoot: string,
): ResolvedFiber | null {
  const stampedEl = findStampedAncestor(el);
  if (stampedEl) {
    const stamp = stampedEl.getAttribute('data-tabby-source')!;
    const componentName = stampedEl.getAttribute('data-tabby-component') ?? 'Component';
    const parsed = parseStamp(stamp);
    if (!parsed) return null;
    const fiber = getFiberFromNode(stampedEl) ?? getFiberFromNode(el);
    return {
      component: componentName,
      componentModule: fiber ? fiberModuleHint(fiber) : null,
      source: {
        file: stripProjectRoot(parsed.file, projectRoot),
        line: parsed.line,
        column: parsed.column,
      },
      domNode: stampedEl,
      fiber,
    };
  }

  // Fallback: no stamped ancestor. Use the fiber chain to at least
  // identify the component — source file/line will be unknown.
  const fiber = getFiberFromNode(el);
  if (!fiber) return null;
  let f: any = fiber;
  while (f) {
    const name = fiberComponentName(f);
    const isHost = typeof (f.elementType ?? f.type) === 'string';
    if (!isHost && name) {
      return {
        component: name,
        componentModule: fiberModuleHint(f),
        source: { file: 'unknown', line: 0, column: 0 },
        domNode: el,
        fiber: f,
      };
    }
    f = f.return;
  }
  return null;
}

function findStampedAncestor(el: HTMLElement): HTMLElement | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    if (cur.hasAttribute && cur.hasAttribute('data-tabby-source')) return cur;
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Parse a `data-tabby-source` value ("relative/path.tsx:<line>:<col>")
 * into its components. Exported so callers that route an edit to a
 * different stamped ancestor (e.g. the variant owner walk in
 * EditOverlay) can stamp the resulting LiveEdit with the right source.
 */
export function parseStamp(
  stamp: string,
): { file: string; line: number; column: number } | null {
  const lastColon = stamp.lastIndexOf(':');
  const secondLastColon = stamp.lastIndexOf(':', lastColon - 1);
  if (lastColon === -1 || secondLastColon === -1) return null;
  const file = stamp.slice(0, secondLastColon);
  const line = parseInt(stamp.slice(secondLastColon + 1, lastColon), 10);
  const column = parseInt(stamp.slice(lastColon + 1), 10);
  if (!file || Number.isNaN(line) || Number.isNaN(column)) return null;
  return { file, line, column };
}

