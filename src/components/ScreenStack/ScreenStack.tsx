import { AnimatePresence, motion, type Transition, type Variants } from 'motion/react';
import type { ReactNode } from 'react';
import styles from './ScreenStack.module.css';

interface ScreenStackProps {
  /**
   * Stable key for the current screen. Change it to trigger a transition.
   * e.g. 'form' -> 'success' slides the success screen in from the right.
   */
  screenKey: string;
  /**
   * +1 = forward (push): old screen slides OUT to the LEFT,
   *                      new screen slides IN from the RIGHT.
   * -1 = back (pop):     old screen slides OUT to the RIGHT,
   *                      new screen slides IN from the LEFT.
   * Default: +1.
   */
  direction?: 1 | -1;
  /**
   * Layout direction of the surrounding app. When 'rtl', the horizontal
   * axis is mirrored so a "forward push" still feels natural for an
   * Arabic reader (new screen enters from the leading edge as they read it).
   */
  dir?: 'ltr' | 'rtl';
  children: ReactNode;
}

/**
 * iOS-style side-to-side screen transition. The active child is rendered
 * inside an absolutely-positioned layer so two screens can coexist during
 * the crossfade without layout jumps.
 *
 * Parent must have `position: relative` and a defined height — typically
 * that's PhoneFrame's scrollable `.content` area, which this is designed
 * to sit directly inside.
 *
 * Uses motion's variants + `custom` pattern so the EXIT variant is
 * re-evaluated at exit time (not capture time) — this is what makes the
 * reverse (back) transition correctly slide the old screen to the RIGHT
 * instead of reusing the stale "forward" exit direction.
 */
const variants: Variants = {
  enter: (axis: number) => ({ x: `${axis * 100}%` }),
  center: { x: '0%' },
  exit: (axis: number) => ({ x: `${axis * -100}%` }),
};

const transition: Transition = { duration: 0.32, ease: [0.32, 0.72, 0, 1] };

export default function ScreenStack({
  screenKey,
  direction = 1,
  dir = 'ltr',
  children,
}: ScreenStackProps) {
  // In RTL, flip the sign so forward still means "enters from the leading
  // edge as the reader sees it." Everything below is axis-aware.
  const axis = dir === 'rtl' ? -direction : direction;

  return (
    <div className={styles.viewport}>
      <AnimatePresence mode="sync" initial={false} custom={axis}>
        <motion.div
          key={screenKey}
          custom={axis}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={transition}
          className={styles.screen}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
