/**
 * Applies a pending edit to the DOM immediately so the designer sees
 * the change live, and returns a revert function that snapshots the
 * value that was there BEFORE we touched it. Revert is capture-on-
 * first-apply so merging multiple tweaks to the same property still
 * rolls back to the original.
 *
 * This file is the single place that talks to the live DOM on behalf
 * of an edit. EditOverlay / EditSidebar / EditStack only call through
 * these functions.
 */

import type { ChangeEntry } from './blurb';
import { findVariantClass, variantToClassName } from './textVariants';

export type Revert = () => void;

/**
 * Apply a change to the element and return a revert function. The
 * revert function restores the property to its value BEFORE apply.
 *
 * Throws on unknown change types so a future schema extension doesn't
 * silently no-op.
 */
export function applyChange(el: HTMLElement, change: ChangeEntry): Revert {
  if (change.type === 'textContent') {
    const prev = el.textContent ?? '';
    el.textContent = change.newValue;
    return () => {
      el.textContent = prev;
    };
  }

  if (change.type === 'prop') {
    // The only prop we preview today is tabby-ui Text's `variant`.
    // Anything else we treat as a no-op preview (we still track it in
    // the edit stack so Claude gets the source edit, but the DOM
    // doesn't change until the file is rewritten).
    if (change.propName !== 'variant') {
      return () => {};
    }
    const prevClass = findVariantClass(el);
    const nextClass = variantToClassName(String(change.newValue));
    if (prevClass) el.classList.remove(prevClass);
    el.classList.add(nextClass);
    return () => {
      el.classList.remove(nextClass);
      if (prevClass) el.classList.add(prevClass);
    };
  }

  if (change.type === 'style') {
    const prop = change.styleProperty;
    const prevInline = el.style.getPropertyValue(prop);
    const prevPriority = el.style.getPropertyPriority(prop);
    el.style.setProperty(prop, change.newValue);
    return () => {
      if (prevInline) {
        el.style.setProperty(prop, prevInline, prevPriority);
      } else {
        el.style.removeProperty(prop);
      }
    };
  }

  // Exhaustive-check fallback.
  const exhaustive: never = change;
  throw new Error(`livePreview: unknown change type: ${JSON.stringify(exhaustive)}`);
}
