import { useEffect, useState } from 'react';

/**
 * Edit mode only makes sense on wider viewports — below this breakpoint
 * the right sidebar + left edit stack would steal too much room from
 * the phone. Narrow-viewport users just see the prototype, no Edit UI.
 *
 * 900px gives ~300px for the phone once both drawers take their 280 +
 * 320 = 600px, with a small breathing margin.
 */
export const EDIT_MODE_MIN_WIDTH = 900;

export function useEditModeAvailable(): boolean {
  const query = `(min-width: ${EDIT_MODE_MIN_WIDTH}px)`;
  const getMatch = () =>
    typeof window === 'undefined' ? true : window.matchMedia(query).matches;

  const [available, setAvailable] = useState<boolean>(getMatch);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setAvailable(mql.matches);
    // Safari < 14 uses addListener/removeListener.
    if (mql.addEventListener) {
      mql.addEventListener('change', onChange);
      return () => mql.removeEventListener('change', onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, [query]);

  return available;
}
