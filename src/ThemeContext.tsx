import { createContext, useContext, useState, type ReactNode } from 'react';

export type TokenTheme = 'o25' | 'o26';

interface ThemeContextValue {
  theme: TokenTheme;
  setTheme: (theme: TokenTheme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useTokenTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTokenTheme must be used within <ThemeProvider>');
  }
  return ctx;
}

interface ThemeProviderProps {
  initial?: TokenTheme;
  children: (ctx: ThemeContextValue) => ReactNode;
}

/**
 * Render-prop provider for the active token theme. The consumer (main.tsx) reads
 * `theme` synchronously so it can conditionally wrap children in StylesO26Light,
 * which swaps the shipped tabby-ui semantic CSS variables from O25 → O26.
 *
 * Patterns only ever reference tabby-ui accent tokens (`--tui-front-accent`,
 * `--tui-background-accent-muted-*`). That means the correct accent hue — O25
 * purple or O26 blue — falls out of whichever theme is active. Do not lock
 * either theme in by default; let the toolbar toggle choose.
 */
export function ThemeProvider({ initial = 'o26', children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<TokenTheme>(initial);
  const value: ThemeContextValue = { theme, setTheme };
  return (
    <ThemeContext.Provider value={value}>{children(value)}</ThemeContext.Provider>
  );
}
