import { useAnimationControls } from 'motion/react';

/**
 * Shake-on-invalid CTA helper.
 *
 * Tabby convention: we do NOT disable the main CTA while a form is invalid.
 * A disabled button provides no feedback about *why* it can't be pressed.
 * Instead, the button stays visually enabled and we shake it sideways when
 * the user submits with missing or invalid input. The shake is paired with
 * whatever inline error state the field already renders.
 *
 * Reserve `disabled={true}` only for specific use cases where the block is
 * real and permanent-until-other-state-changes — e.g. required consent
 * checkbox unchecked, rate-limit cooldown, wizard prerequisite not met.
 * "Fields are empty" or "value is invalid" are NOT reasons to disable.
 *
 * Usage:
 *   const { controls, shake } = useShake();
 *
 *   function handleSubmit(e) {
 *     e.preventDefault();
 *     if (!isValid) { shake(); return; }
 *     // ...proceed
 *   }
 *
 *   <motion.div animate={controls}>
 *     <Button type="submit">Continue</Button>
 *   </motion.div>
 *
 * The wrapper is a `<motion.div>` around the button. Width flows through
 * naturally — the inner Button keeps its own `width: 100%` when sticky-
 * footer layout expects it.
 */
export function useShake() {
  const controls = useAnimationControls();

  function shake() {
    controls.start({
      x: [-6, 6, -4, 4, -2, 2, 0],
      transition: { duration: 0.3 },
    });
  }

  return { controls, shake };
}
