import { useLayoutEffect } from 'react';

/**
 * Set the iPhone frame's "canvas" color for the current screen.
 *
 * The status bar and home indicator strips inside <PhoneFrame> are
 * transparent — they read through to `.screen`, which paints
 * `var(--phone-screen-bg)`. Default is `--tui-background-general-level-0`
 * (grey canvas), matching the most common prototype page background.
 *
 * Screens whose *major* background is something else (full-bleed white
 * level-1 surface, dark hero, branded tint, etc.) call this hook at the
 * top of the component with the matching token. The hook sets
 * `--phone-screen-bg` on `document.body`; because custom properties
 * inherit, the new value cascades down to `.screen` and the chrome
 * strips follow. Body's own `background` isn't touched, so the desktop
 * canvas around the phone stays level-0 grey.
 *
 * When the screen unmounts (route change), the var is removed and
 * `.screen` falls back to the default.
 *
 * Usage:
 *   import { usePhoneCanvas } from '../../lib/usePhoneCanvas';
 *
 *   export default function SuccessScreen() {
 *     usePhoneCanvas('var(--tui-background-general-level-1)');
 *     return <div className={styles.root}>…</div>;
 *   }
 *
 * Accepts any CSS `background` value: a `var(--tui-*)` reference
 * (preferred), a gradient, a raw color. Pass `null`/`undefined` to
 * skip the override (equivalent to not calling the hook).
 */
export function usePhoneCanvas(value: string | null | undefined) {
  useLayoutEffect(() => {
    if (!value) return;
    document.body.style.setProperty('--phone-screen-bg', value);
    return () => {
      document.body.style.removeProperty('--phone-screen-bg');
    };
  }, [value]);
}
