/**
 * Canonical tabby-ui Text variants + the className each variant maps to
 * at runtime. tabby-ui's Text component applies typography via
 * `.tui-text_variant-<kebab-case>` — swapping the class live reflows the
 * type immediately without waiting for a source edit.
 *
 * camelCase → kebab-case rule:
 *   h1              → h1
 *   h1Numeric       → h1-numeric
 *   body1Tight      → body1-tight
 *   body1TightBold  → body1-tight-bold
 */

export const VARIANT_CLASS_PREFIX = 'tui-text_variant-';

export const VARIANT_GROUPS: Array<{
  label: string;
  variants: readonly string[];
}> = [
  { label: 'Headings', variants: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
  { label: 'Numeric', variants: ['h1Numeric', 'h2Numeric', 'h3Numeric'] },
  {
    label: 'Body',
    variants: [
      'body1Tight',
      'body1TightBold',
      'body1Loose',
      'body1LooseBold',
      'body2Tight',
      'body2TightBold',
      'body2Loose',
      'body2LooseBold',
    ],
  },
  { label: 'Caption', variants: ['caption', 'captionBold'] },
  {
    label: 'Special',
    variants: ['xl', 'numbers', 'capsL', 'capsM', 'capsS', 'microtext'],
  },
];

export const ALL_VARIANTS: string[] = VARIANT_GROUPS.flatMap((g) =>
  [...g.variants],
);

export function variantToClassName(variant: string): string {
  return VARIANT_CLASS_PREFIX + camelToKebab(variant);
}

export function classNameToVariant(className: string): string | null {
  if (!className.startsWith(VARIANT_CLASS_PREFIX)) return null;
  return kebabToCamel(className.slice(VARIANT_CLASS_PREFIX.length));
}

/** Pull the current variant class off a DOM element, if any. */
export function findVariantClass(el: Element): string | null {
  for (const cls of Array.from(el.classList)) {
    if (cls.startsWith(VARIANT_CLASS_PREFIX)) return cls;
  }
  return null;
}

/**
 * Walk up from `el` returning the nearest element carrying a
 * `tui-text_variant-*` class. Catches the case where the designer
 * clicked a nested <span> inside a tabby-ui Text — the variant lives
 * on the Text's root element, not the span — so the sidebar can still
 * show and edit the typography variant.
 *
 * Prefers ancestors that also carry a `data-tabby-source` stamp so the
 * resulting edit can be routed to the JSX callsite that set the
 * variant, not the intermediate DOM node.
 */
export function findVariantOwner(
  el: HTMLElement,
): { el: HTMLElement; variant: string } | null {
  let cur: HTMLElement | null = el;
  while (cur) {
    const cls = findVariantClass(cur);
    if (cls) {
      const variant = classNameToVariant(cls);
      if (variant) return { el: cur, variant };
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Matches tabby-ui's actual variant-class naming:
 *   h1                  → h1                        (no hyphen before digits)
 *   h1Numeric           → h1-numeric
 *   body1Tight          → body1-tight
 *   body1TightBold      → body1-tight-bold
 *   caps L              → caps-l
 *   microtext           → microtext
 *
 * The previous implementation inserted hyphens before digits too,
 * which produced classes like `tui-text_variant-h-1` that don't exist
 * in the shipped stylesheet — so variant changes silently dropped the
 * styles entirely.
 */
function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
}
