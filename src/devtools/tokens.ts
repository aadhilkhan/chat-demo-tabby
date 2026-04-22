/**
 * Scans the loaded stylesheets for --tui-* CSS custom properties that
 * resolve to a color, groups them by the segment of the token name
 * that matches tabby-ui's semantic layering (front / background-* /
 * line-* / etc.), and returns an ordered list of groups for the color
 * dropdown in EditSidebar.
 */

export interface TokenEntry {
  name: string; // full CSS custom property, e.g. --tui-front-primary
  value: string; // resolved color (hex/rgb/hsl/oklch)
}

export interface TokenGroup {
  /** Group label shown as a section header in the dropdown. */
  label: string;
  /** Stable key for matching against the "default-expanded" target. */
  key: string;
  tokens: TokenEntry[];
}

let cache: TokenEntry[] | null = null;

/**
 * Enumerate every `--tui-*` custom property defined in loaded
 * stylesheets, then resolve each to its final computed color by
 * applying it via a hidden probe element. The probe approach catches
 * tokens whose declared value is a `var()` chain (most semantic
 * tokens alias primitives) — reading getPropertyValue alone would
 * only return the literal `var(--other)` string for those.
 *
 * Non-color tokens (font sizes, timings, etc.) are discarded by the
 * final "does the probe return an rgb()?" check.
 */
function collectColorTokens(): TokenEntry[] {
  if (cache) return cache;
  const names = new Set<string>();
  for (let i = 0; i < document.styleSheets.length; i++) {
    const sheet = document.styleSheets[i];
    let rules: CSSRuleList | null = null;
    try {
      rules = sheet.cssRules;
    } catch {
      // Cross-origin stylesheets throw on .cssRules access; skip them.
      continue;
    }
    if (!rules) continue;
    for (let j = 0; j < rules.length; j++) {
      const rule = rules[j] as CSSStyleRule;
      if (!rule.style) continue;
      for (let k = 0; k < rule.style.length; k++) {
        const propName = rule.style[k];
        if (propName.startsWith('--tui-')) names.add(propName);
      }
    }
  }

  const probe = document.createElement('div');
  probe.style.position = 'fixed';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.top = '-9999px';
  document.body.appendChild(probe);

  // Use background-color (not color) for the probe: when var() is
  // invalid-at-computed-value-time (e.g. token is a number/duration),
  // background-color falls back to its initial value `rgba(0, 0, 0, 0)`
  // (transparent). That's distinguishable from any real color token.
  // Using color instead would revert to inherited rgba(0,0,0,0.87),
  // which is a common actual UI color → false positives.
  const TRANSPARENT = 'rgba(0, 0, 0, 0)';
  const entries: TokenEntry[] = [];
  for (const name of names) {
    probe.style.backgroundColor = '';
    probe.style.backgroundColor = `var(${name})`;
    const resolved = getComputedStyle(probe).backgroundColor;
    if (!resolved || !resolved.startsWith('rgb')) continue;
    if (resolved === TRANSPARENT) continue;
    entries.push({ name, value: resolved });
  }

  document.body.removeChild(probe);

  cache = entries.sort((a, b) => a.name.localeCompare(b.name));
  return cache;
}

/**
 * Group order is stable so designers see the most-used tokens up top.
 * Front (text) and Background are the 90% cases; others slot beneath.
 */
const GROUP_ORDER: Array<{ key: string; label: string; match: (n: string) => boolean }> = [
  { key: 'front', label: 'Text', match: (n) => n.startsWith('--tui-front-') },
  {
    key: 'background-general',
    label: 'Surfaces',
    match: (n) => n.startsWith('--tui-background-general-'),
  },
  {
    key: 'background-accent',
    label: 'Accent',
    match: (n) => n.startsWith('--tui-background-accent-'),
  },
  {
    key: 'background-positive',
    label: 'Positive',
    match: (n) => n.startsWith('--tui-background-positive-'),
  },
  {
    key: 'background-negative',
    label: 'Negative',
    match: (n) => n.startsWith('--tui-background-negative-'),
  },
  {
    key: 'background-warning',
    label: 'Warning',
    match: (n) => n.startsWith('--tui-background-warning-'),
  },
  {
    key: 'background-control',
    label: 'Controls',
    match: (n) => n.startsWith('--tui-background-control-'),
  },
  {
    key: 'background-special',
    label: 'Special',
    match: (n) => n.startsWith('--tui-special-') || n.startsWith('--tui-background-special-'),
  },
  {
    key: 'line',
    label: 'Lines',
    match: (n) => n.startsWith('--tui-line-'),
  },
  {
    key: 'other',
    label: 'Other',
    match: () => true, // catch-all, evaluated last
  },
];

export function getTokenGroups(): TokenGroup[] {
  const all = collectColorTokens();
  const groups: TokenGroup[] = GROUP_ORDER.map((g) => ({ key: g.key, label: g.label, tokens: [] }));
  for (const token of all) {
    for (let i = 0; i < GROUP_ORDER.length; i++) {
      if (GROUP_ORDER[i].match(token.name)) {
        groups[i].tokens.push(token);
        break;
      }
    }
  }
  return groups.filter((g) => g.tokens.length > 0);
}

/**
 * Pick the group that should be expanded by default based on the CSS
 * property being edited. For text colors we prioritize Front tokens;
 * for backgrounds we start with Surfaces.
 */
export function defaultGroupKeyFor(property: 'color' | 'background-color' | 'border-color'): string {
  if (property === 'color') return 'front';
  if (property === 'background-color') return 'background-general';
  return 'line';
}

/**
 * Reverse-lookup: given a computed color string (e.g. "rgb(29, 35, 41)"),
 * find the semantic `--tui-*` token whose resolved value matches it.
 *
 * Primitive tokens (chrome-1000, neutral-*, iris-*, red-*, etc.) are
 * intentionally EXCLUDED. Those are the underlying palette Tabby's
 * themes alias to and aren't meaningful to a designer editing a
 * specific role — we want to surface `front-primary`, not the raw
 * chrome value it happens to equal.
 *
 * `groupHint` biases which semantic group wins when multiple tokens
 * alias to the same value (e.g. front vs line for a color property).
 * Returns null if no semantic token matches.
 */
export function findTokenByValue(
  computed: string,
  groupHint?: string,
): string | null {
  const target = normalizeColor(computed);
  if (!target) return null;
  const all = collectColorTokens();

  // Filter to semantic-only tokens. "Other" is the catch-all primitives
  // bucket, so anything that lands there is a raw palette token.
  const semanticNames = new Set<string>();
  for (const g of getTokenGroups()) {
    if (g.key === 'other') continue;
    for (const t of g.tokens) semanticNames.add(t.name);
  }
  const semantic = all.filter((t) => semanticNames.has(t.name));

  // First pass: prefer tokens in the hinted group.
  if (groupHint) {
    const group = GROUP_ORDER.find((g) => g.key === groupHint);
    if (group) {
      const hit = semantic.find(
        (t) => group.match(t.name) && normalizeColor(t.value) === target,
      );
      if (hit) return hit.name;
    }
  }
  // Fallback: any semantic group.
  const hit = semantic.find((t) => normalizeColor(t.value) === target);
  return hit ? hit.name : null;
}

/**
 * Normalize a CSS color string to `#rrggbb` (lowercase) so rgb/hex
 * variants can be compared. Returns null for unparseable input.
 * Only handles hex + rgb(a) — other formats (hsl/oklch/color()) are
 * left to the browser's computed-style resolution, which we trust to
 * produce rgb() in most environments.
 */
/**
 * Normalize a CSS color string to `#rrggbbaa` (lowercase, always 9
 * chars). Preserves alpha so a translucent color like rgba(0, 0, 0,
 * 0.87) doesn't falsely match the opaque --tui-chrome-1000 (#000000).
 */
function normalizeColor(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  if (s.startsWith('#')) {
    if (s.length === 7) return s + 'ff';
    if (s.length === 4) {
      // #abc → #aabbccff
      return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + 'ff';
    }
    if (s.length === 5) {
      // #abcd → #aabbccdd
      return '#' + s[1] + s[1] + s[2] + s[2] + s[3] + s[3] + s[4] + s[4];
    }
    if (s.length === 9) return s;
    return null;
  }

  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(/[,\s/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const [r, g, b] = parts.slice(0, 3).map((p) => parseInt(p, 10));
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    const alphaRaw = parts.length >= 4 ? parseFloat(parts[3]) : 1;
    const alpha = Math.round(Math.min(1, Math.max(0, alphaRaw)) * 255);
    return (
      '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0') +
      alpha.toString(16).padStart(2, '0')
    );
  }
  return null;
}
