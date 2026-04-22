import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type VariantKey = 'A' | 'B' | 'C' | 'D';
const ALL_KEYS: VariantKey[] = ['A', 'B', 'C', 'D'];
/**
 * sessionStorage key the active variant persists to. Exported so other
 * consumers (e.g. the Restart button, or the optional /edit-mode
 * overlay once installed) can read/write the same key without drifting.
 */
export const VARIANT_STORAGE_KEY = 'tabby-prototype-active-variant';
const STORAGE_KEY = VARIANT_STORAGE_KEY;

interface VariantsContextValue {
  variants: VariantKey[];
  activeVariant: VariantKey;
  setActiveVariant: (v: VariantKey) => void;
}

const VariantsContext = createContext<VariantsContextValue | null>(null);

/**
 * `count` is the number of variants this project was scaffolded with (1–4).
 * Read at dev-server startup from `.prototype-config.json` via Vite's
 * `import.meta.env` OR explicit prop. When count ≤ 1 the toolbar pill hides.
 *
 * State persists in `sessionStorage` so hot-reloads keep the selected pill.
 */
export function VariantsProvider({
  count,
  children,
}: {
  count: number;
  children: ReactNode;
}) {
  const variants = useMemo<VariantKey[]>(
    () => ALL_KEYS.slice(0, Math.max(1, Math.min(4, count))),
    [count],
  );

  const [activeVariant, setActiveVariantState] = useState<VariantKey>(() => {
    if (typeof window === 'undefined') return 'A';
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as VariantKey | null;
    return stored && ALL_KEYS.includes(stored) ? stored : 'A';
  });

  useEffect(() => {
    if (!variants.includes(activeVariant)) {
      setActiveVariantState('A');
    }
  }, [variants, activeVariant]);

  const setActiveVariant = useCallback((v: VariantKey) => {
    setActiveVariantState(v);
    try {
      window.sessionStorage.setItem(STORAGE_KEY, v);
    } catch {
      // sessionStorage can fail in Safari private mode; ignore
    }
  }, []);

  const value = useMemo<VariantsContextValue>(
    () => ({ variants, activeVariant, setActiveVariant }),
    [variants, activeVariant, setActiveVariant],
  );

  return <VariantsContext.Provider value={value}>{children}</VariantsContext.Provider>;
}

export function useVariants(): VariantsContextValue {
  const ctx = useContext(VariantsContext);
  if (!ctx) throw new Error('useVariants must be used inside <VariantsProvider>');
  return ctx;
}
