import styles from './StatusBar.module.css';

/**
 * iOS-style status bar rendered inside the phone frame's screen area.
 * Shows 9:41 (the Apple marketing time), a dynamic-island spacer that
 * sits under the notch cut-out in the frame PNG, and signal / wifi /
 * battery icons. Pure chrome — no props, no state, no tokens.
 */
export default function StatusBar() {
  return (
    <div className={styles.bar}>
      <span className={styles.clock}>9:41</span>
      <div className={styles.islandSpacer} aria-hidden />
      <div className={styles.indicators}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="18" height="12" viewBox="0 0 18 12" fill="none" aria-hidden>
      <rect x="0" y="9" width="3.2" height="3" rx="0.8" fill="black" />
      <rect x="4.8" y="6" width="3.2" height="6" rx="0.8" fill="black" />
      <rect x="9.6" y="3" width="3.2" height="9" rx="0.8" fill="black" />
      <rect x="14.4" y="0" width="3.2" height="12" rx="0.8" fill="black" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" fill="none" aria-hidden>
      <path d="M1.2 3.6C4 1.2 12 1.2 14.8 3.6" stroke="black" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M3.6 6.4C5.6 4.8 10.4 4.8 12.4 6.4" stroke="black" strokeWidth={1.8} strokeLinecap="round" />
      <path d="M6 9.2C7.2 8.4 8.8 8.4 10 9.2" stroke="black" strokeWidth={1.8} strokeLinecap="round" />
      <circle cx="8" cy="11.5" r="1" fill="black" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="28" height="13" viewBox="0 0 28 13" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="23" height="12" rx="2.5" stroke="black" strokeOpacity="0.35" />
      <rect x="2" y="2" width="20" height="9" rx="1.5" fill="black" />
      <path d="M25 4.5V8.5C25.8 8.1 25.8 4.9 25 4.5Z" fill="black" fillOpacity="0.4" />
    </svg>
  );
}
