import type { ReactNode } from 'react';
import StatusBar from './StatusBar';
import styles from './PhoneFrame.module.css';

interface PhoneFrameProps {
  children: ReactNode;
}

/**
 * iPhone frame used for every prototype. Outer box is 497×980, with a
 * 42px bezel. The inner screen area (413×896) hosts the app content.
 *
 * Structure:
 *   <outer positioned shell (drop-shadow)>
 *     <inner absolute screen (border-radius, overflow hidden)>
 *       <StatusBar />
 *       <scrollable content area> {children} </scrollable content area>
 *       <homeIndicator />
 *     </inner>
 *     <img overlay: iphone-frame.png>   ← bezel + notch + speaker
 *   </outer>
 *
 * Status bar and home indicator have transparent backgrounds. `.screen`
 * paints `var(--phone-screen-bg)` with a default of
 * `--tui-background-general-level-0`, so chrome strips match the most
 * common prototype canvas by default. Prototype screens with a
 * different major background call `usePhoneCanvas` from
 * `src/lib/usePhoneCanvas.ts` to update the var for their route. See
 * PhoneFrame.module.css for the full rationale.
 *
 * `data-tabby-editable-root` is the edit-mode anchor — the overlay
 * resolves hover/select targets to elements inside this container
 * only, so clicking on the status bar or home indicator chrome can't
 * select them as editable.
 */
export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className={styles.frame}>
      <div className={styles.screen}>
        <StatusBar />
        <div className={styles.content} data-tabby-editable-root>{children}</div>
        <div className={styles.homeIndicator} aria-hidden />
      </div>
      <img
        src="/iphone-frame.png"
        alt=""
        className={styles.overlay}
        aria-hidden
      />
    </div>
  );
}
