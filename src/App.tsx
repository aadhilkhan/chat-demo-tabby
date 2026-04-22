import { type ComponentType } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Text } from '@tabby.ai/tabby-ui/O25/Text';
import PhoneFrame from './components/PhoneFrame/PhoneFrame';
import DesktopFrame from './components/DesktopFrame/DesktopFrame';
import TopBar, { type TopBarPrototype } from './components/TopBar/TopBar';
import { VariantsProvider } from './VariantsContext';
import Chat from './screens/Chat/Chat';

import styles from './App.module.css';

// Scaffold-time replaces the 'mobile' literal below with 'desktop' when
// the project is scaffolded with --layout desktop. Widened to a union so
// both branches of the layout conditional type-check.
const LAYOUT: 'mobile' | 'desktop' = /* __LAYOUT__ */ 'mobile';

interface PrototypeRoute extends TopBarPrototype {
  Component: ComponentType;
}

/**
 * Every prototype owns a top-level path so it's shareable as a clean URL.
 * Adding a new one?
 *   1. Build it under src/screens/<Name>/
 *   2. Append a new entry here — that wires up BOTH the route and the menu item.
 */
const PROTOTYPES: PrototypeRoute[] = [
  { path: '/chat', labelEn: 'Tabby Chat', labelAr: 'دردشة تابي', Component: Chat },
];

/**
 * Demo screen lookup via Vite's glob import. When the _demo/ folder is
 * removed at scaffold time (desktop layout, or user pre-specified screens)
 * the glob returns an empty map and we render a placeholder instead.
 * This avoids the App needing scaffold-time editing.
 */
const demoGlob = import.meta.glob<{ default: ComponentType }>('./_demo/Demo.tsx', {
  eager: true,
});
const DemoComponent: ComponentType | null =
  demoGlob['./_demo/Demo.tsx']?.default ?? null;

function DefaultPlaceholder() {
  return (
    <div className={styles.placeholder}>
      <Text variant="h3">Your prototype lives here</Text>
      <Text variant="body1Tight">
        Ask Claude to build the first screen, or add one under
        {' '}<code>src/screens/&lt;Name&gt;/</code>.
      </Text>
    </div>
  );
}

// Scaffold-time replaces the "1" below with the --variants value.
const VARIANTS_COUNT = /* __VARIANTS_COUNT__ */ 1;

// Passed through to TopBar so the center title + Copy blurbs have stable
// project identity. Scaffold writes these into Vite's define() via the
// .prototype-config.json step.
const PROJECT_NAME: string = import.meta.env.VITE_TABBY_PROJECT_NAME ?? 'prototype';
const PROJECT_ROOT: string = import.meta.env.VITE_TABBY_PROJECT_ROOT ?? '';

export default function App() {
  return (
    <VariantsProvider count={VARIANTS_COUNT}>
      <AppShell />
    </VariantsProvider>
  );
}

function AppShell() {
  const location = useLocation();
  const activePath = PROTOTYPES.length > 0
    ? PROTOTYPES.find((p) => location.pathname.startsWith(p.path))?.path ?? PROTOTYPES[0].path
    : '/';

  /*
   * Root-route precedence (Option B — "prototype wins"):
   *   1. If at least one prototype is registered, redirect `/` to it.
   *   2. Else if the scaffold kept `src/_demo/Demo.tsx`, show it.
   *   3. Else the placeholder.
   */
  const rootElement = PROTOTYPES.length > 0
    ? <Navigate to={PROTOTYPES[0].path} replace />
    : DemoComponent
      ? <DemoComponent />
      : <DefaultPlaceholder />;

  return (
    <div className={styles.page}>
      <TopBar
        prototypes={PROTOTYPES}
        activePath={activePath}
        projectName={PROJECT_NAME}
        projectRoot={PROJECT_ROOT}
      />

      {LAYOUT === 'mobile' ? (
        <div className={styles.stage}>
          <div className={styles.phoneDeck}>
            <PhoneFrame>
              <Routes>
                <Route
                  path="/"
                  element={rootElement}
                />
                {PROTOTYPES.map(({ path, Component }) => (
                  <Route key={path} path={path} element={<Component />} />
                ))}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </PhoneFrame>
          </div>
        </div>
      ) : (
        <div className={styles.desktopStage}>
          <DesktopFrame>
            <Routes>
              <Route
                path="/"
                element={rootElement}
              />
              {PROTOTYPES.map(({ path, Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </DesktopFrame>
        </div>
      )}
    </div>
  );
}
