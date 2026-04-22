import type { ReactNode } from 'react';
import styles from './DesktopFrame.module.css';

/**
 * Zero-chrome wrapper used when a project is scaffolded with
 * `--layout desktop`. No phone bezel, no status bar — just a centered
 * max-width container so desktop flows render like they would on a
 * 1440×900 viewport. Use 48px side padding inside screens (NOT the
 * 16px mobile convention).
 */
export default function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <div className={styles.root}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
