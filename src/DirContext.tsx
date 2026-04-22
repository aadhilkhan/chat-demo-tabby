import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Language } from './types';

interface DirContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  dir: 'rtl' | 'ltr';
}

const DirContext = createContext<DirContextValue | null>(null);

export function useDirContext(): DirContextValue {
  const ctx = useContext(DirContext);
  if (!ctx) {
    throw new Error('useDirContext must be used within <DirProvider>');
  }
  return ctx;
}

interface DirProviderProps {
  initial?: Language;
  children: (ctx: DirContextValue) => ReactNode;
}

/**
 * Render-prop language + direction provider. The consumer (main.tsx) reads
 * `dir` synchronously so it can pass it into <BaseThemeProvider dir={...}>,
 * which wires up tabby-ui's stylis-plugin-rtl and the RTL font swap.
 */
export function DirProvider({ initial = 'en', children }: DirProviderProps) {
  const [lang, setLang] = useState<Language>(initial);
  const value: DirContextValue = {
    lang,
    setLang,
    dir: lang === 'ar' ? 'rtl' : 'ltr',
  };
  return (
    <DirContext.Provider value={value}>{children(value)}</DirContext.Provider>
  );
}
