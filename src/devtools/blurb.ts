/**
 * Emits the HTML-comment-wrapped JSON blurb that Claude recognizes and
 * applies. Format is v1 (see magic marker below); if we ever break the
 * shape, bump to v2 and update the SKILL.md paste-apply logic.
 */

export const BLURB_MARKER = '<!-- tabby-edit-v1';
export const BLURB_END = '-->';

export type ChangeEntry =
  | {
      type: 'textContent';
      oldValue: string;
      newValue: string;
    }
  | {
      type: 'prop';
      propName: string;
      oldValue: string | number | boolean | null;
      newValue: string | number | boolean | null;
    }
  | {
      type: 'style';
      styleProperty: string;
      oldValue: string;
      newValue: string;
      cssContext: {
        className: string;
        appliedBy: 'css-module' | 'inline' | 'global';
      };
    };

export interface EditPayload {
  kind: 'edit';
  version: 'v1';
  project: string;
  projectRoot: string;
  timestamp: string;
  source: { file: string; line: number; column: number };
  element: {
    component: string;
    componentModule: string | null;
    innerText?: string;
  };
  changes: ChangeEntry[];
  notes?: string;
  /**
   * Which A/B/C/D variant was active in the preview when the designer
   * made this edit. Claude uses this to target the right variant branch
   * when the source file is shared across variants — if the source is
   * already a variant-specific file (e.g. WelcomeB.tsx), this is just
   * confirming context.
   */
  activeVariant?: string;
}

function buildBlurb(payload: Omit<EditPayload, 'kind' | 'version' | 'timestamp'>): string {
  const full: EditPayload = {
    kind: 'edit',
    version: 'v1',
    timestamp: new Date().toISOString(),
    ...payload,
  };
  return `${BLURB_MARKER}\n${JSON.stringify(full, null, 2)}\n${BLURB_END}`;
}

/**
 * Build N blurbs, one per element-grouped change set, concatenated
 * with blank lines. Each standalone blurb has the same v1 shape — the
 * paste-apply handler in SKILL.md already walks the message for every
 * occurrence of the marker, so no schema change is needed downstream.
 */
export function buildBlurbs(
  shared: Pick<EditPayload, 'project' | 'projectRoot' | 'activeVariant'>,
  groups: Array<{
    source: EditPayload['source'];
    element: EditPayload['element'];
    changes: ChangeEntry[];
    notes?: string;
  }>,
): string {
  return groups
    .map((g) =>
      buildBlurb({
        ...shared,
        source: g.source,
        element: g.element,
        changes: g.changes,
        notes: g.notes,
      }),
    )
    .join('\n\n');
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback: hidden textarea + execCommand('copy'). Some browsers
    // still require this for non-user-initiated contexts.
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    return ok;
  }
}
