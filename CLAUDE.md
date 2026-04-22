# CLAUDE.md

Contract between Claude and the designer for this project. Read it in full before writing code.

The ONLY purpose here is to prototype Tabby flows using exclusively `@tabby.ai/tabby-ui` (**O25**) components and tokens. The designer describes what to build; Claude produces it. Explain visual/UX outcomes, not developer jargon.

---

## Non-negotiable rules — read before every change

1. **No custom UI primitives — override, don't recreate.** Never hand-roll a component that tabby-ui already ships. Import from `@tabby.ai/tabby-ui/O25/<Name>` — Button, TextField, Text, Chip, Supercell, BottomSheet, Badge, Switch, Loader, Snackbar, and every other O25 component.

   **When the Figma reference has properties, variants, or styling tabby-ui doesn't expose, DO NOT give up and hand-roll. Follow this fallback:**

   **(a) Use the closest tabby-ui variant.** Figma often has richer variant sets than the shipped code (colors, states, chrome flags). Pick the tabby-ui variant that's structurally closest and move on.

   **(b) Override with CSS Modules, using tabby-ui tokens only.** Every tabby-ui component accepts `className`. Attach a module class and override what you need. The example below is intentionally **neutral** — most overrides should look like this, not reach for accent:

   ```tsx
   import { Supercell } from '@tabby.ai/tabby-ui/O25/Supercell';
   import styles from './MyScreen.module.css';

   <Supercell
     level="1"
     headline="Pay in 4"
     className={styles.merchantRow}
   />
   ```

   ```css
   /* MyScreen.module.css */
   .merchantRow {
     background: var(--tui-background-general-level-1);
     border-radius: 16px;
   }
   .merchantRow [class*="Supercell_headline"] {
     color: var(--tui-front-primary);
   }
   ```

   Rules for overrides:
   - **Tokens only.** Never hardcode hex — pick from the token tables below.
   - **Match the Figma variable's color family.** If Figma binds a surface to `--tui-background-general`, you use `--tui-background-general-level-*`. Don't reach for accent (`--tui-front-accent`, `--tui-background-accent-muted-*`) unless Figma *explicitly* binds that element to an accent variable. Default to neutral (`--tui-front-primary`, `--tui-background-general-level-1`) — accent is for links, CTAs, and purposefully-branded highlights, not "any icon in a circle." Icons in circular containers default to `--tui-front-secondary` on `--tui-background-general-level-2` unless Figma says otherwise.
   - **Short and local.** If the override is 3+ rules, that's fine; 10+ rules means you're probably using the wrong component — re-check the tabby-ui catalog.
   - **Don't invent internals.** If you're guessing at a deep child selector, use a browser DevTools inspection instead of writing blind `[class*=]` selectors.

   **(c) Hand-roll only as a true last resort** — the component genuinely does not exist in tabby-ui (confirmed by scanning `node_modules/@tabby.ai/tabby-ui/O25/`). Example: a custom progress-step dotted rail. When you do, colocate in `.module.css`, use tokens, and flag it in a comment (`// NO tabby-ui equivalent — hand-rolled`).

2. **Read the component types in `node_modules` before writing UI.** Don't guess prop names — `variant`, `tone`, `size`, `level`, `inputSize` vary between components. The authoritative source is right there in the project:

   - **Component catalog**: `ls node_modules/@tabby.ai/tabby-ui/O25/` — every folder is an available O25 component.
   - **Types**: `node_modules/@tabby.ai/tabby-ui/O25/<Name>/<Name>.d.ts` — full TypeScript prop surface with JSDoc comments.
   - **Shipped CSS**: `node_modules/@tabby.ai/tabby-ui/O25/<Name>/<Name>.css` — useful when planning overrides (you can see which class selectors the component exposes).
   - **Icons**: `ls node_modules/@tabby.ai/tabby-ui/icons/core/` — every icon is in there, named `<Name><Size>` (e.g. `Plus24`, `Wallet24`).

   Everything is local, no network calls, no auth. Reading the `.d.ts` takes a second and prevents guessed props that fail typecheck.

   **Before writing any screen with Figma references, audit the component inventory up front.** For each component the Figma frame uses (Supercell, Chip, Button, etc.), open its `.d.ts` in `node_modules/@tabby.ai/tabby-ui/O25/<Name>/`. Note which variants/props exist in code. This tells you in advance where overrides will be needed, preventing the mid-build "this prop doesn't exist, I'll hand-roll" regression.

3. **No Tailwind.** This repo has no Tailwind config. Styles live in colocated `.module.css` files. Class names are lowerCamelCase.

4. **Tokens only — never hardcoded hex. Never `var(--token, #hex)`.** Colors and line tokens come from tabby-ui's shipped CSS variables (`var(--tui-front-primary)`, `var(--tui-background-general-level-1)`, `var(--tui-line-primary)`, etc.).

   **Two hard bans:**
   - No raw hex in source. If you're about to type `#ffffff`, STOP and find the token.
   - No `var(--token, #hex)` fallback. The fallback silently masks drift: if the token name is wrong or typo'd, the hex renders plausibly, and an O25-light visual audit can't catch it because `level-0` and `level-2` both resolve to `#f2f5f7` (and `level-1`/`level-3` both to `#ffffff`). Use bare `var(--token)` only. If the token doesn't exist, re-check the "Figma → Tabby token crosswalk" section below — don't invent or fall back.

5. **Text through `<Text variant="...">`, not raw `<p>` or `<h1>`.** tabby-ui's Text component applies the correct type scale, font stack, and RTL font switching.

   Valid variants:
   - Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
   - Numeric headings: `h1Numeric`, `h2Numeric`, `h3Numeric`
   - Body: `body1Tight`, `body1TightBold`, `body1Loose`, `body1LooseBold`, `body2Tight`, `body2TightBold`, `body2Loose`, `body2LooseBold`
   - Caption: `caption`, `captionBold`
   - Special: `xl`, `numbers`, `capsL`, `capsM`, `capsS`, `microtext`

6. **Icon sizing — scale up, never down.** tabby-ui icons ship at fixed sizes (`Grid24`, `CheckM48`, etc.); the number in the name is the *native* size. SVG is vector, so passing `size={48}` to a `*24` glyph upscales cleanly with no blur. Downscaling is the opposite — `*48` glyphs are drawn for a 48-grid (thicker strokes, larger padding) and look heavy or misaligned at 24. If you need a 24px version, import the `*24` variant. If a larger native size doesn't exist, upscale the smaller one with the `size` prop.

7. **RTL via `dir` prop on `<BaseThemeProvider>`, not a `.lang-ar` class.** tabby-ui ships `stylis-plugin-rtl` and swaps fonts automatically when `dir="rtl"` (Inter → IBM Plex Sans Arabic). Never write a `.lang-ar` class or manually swap `padding-left` → `padding-right`. Use CSS logical properties (`inset-inline-end`, `margin-inline-start`) for prototype-specific chrome.

8. **One screen per directory.** New screens go in `src/screens/<ScreenName>/` with a colocated `.module.css`. Shared helpers in `src/lib/`, shared contexts in `src/` root.

9. **Phone frame is the convention for mobile.** Every mobile prototype renders inside `<PhoneFrame>` (`src/components/PhoneFrame/`) — 413×896 iPhone area. Don't render full-bleed desktop flows inside it; don't recreate the frame. Content taller than 896px scrolls inside; the frame stays fixed. Scrollbars are globally hidden in `src/global.css` — don't re-add `::-webkit-scrollbar` rules per screen.

   **Status bar + home indicator strips match the screen's major background.** Both strips have `background: transparent`; they read through to `.screen`, which paints `var(--phone-screen-bg)`. The default is `--tui-background-general-level-0` (grey canvas — the most common prototype page bg), so in that case the whole phone reads as one color top-to-bottom.

   When your screen's major background is *not* level-0 — full-bleed white (`level-1`), dark hero, branded color, etc. — call `usePhoneCanvas` from `src/lib/usePhoneCanvas.ts` at the top of the component with the matching token. Chrome strips follow automatically via the CSS var.

   ```tsx
   import { usePhoneCanvas } from '../../lib/usePhoneCanvas';

   export default function SuccessScreen() {
     usePhoneCanvas('var(--tui-background-general-level-1)'); // white chrome
     return <div className={styles.root}>…</div>;
   }
   ```

   Rules:
   - **Don't paint the chrome strips directly.** They're transparent on purpose — let the CSS var drive the color.
   - **Pass a token, not a raw hex.** Same rule as everywhere else (rule 4).
   - **One hook call per screen**, at the top of the component. Don't call it conditionally or from children.
   - **Skip the hook** when your screen's major bg *is* level-0. The default already matches.

   **Mobile layout rules (every mobile screen):**
   - **Side padding = 16px.** Tabby's mobile standard — not 20 or 24.
   - **Primary CTA sticks to the bottom.** Footer uses `margin-top: auto; position: sticky; bottom: 0;` on a flex-column `.screen` root with `min-height: 100%`. PhoneFrame reserves the home-indicator zone.
   - **Sticky footer has a gradient fade band above it.** Page-bg (level 0/2) meeting a level-1 footer makes a hard edge when content scrolls under. Every sticky footer ships a `.footer::before`: a 24px band fading `var(--tui-background-general-level-1)` → `transparent` upward.
   - **Home indicator is shipped by PhoneFrame**, not per-screen.

   **Desktop mode** (if this project was scaffolded with `--layout desktop`): PhoneFrame is replaced by `<DesktopFrame>`. Use a 1440px-max centered wrapper, 48px side padding, and do NOT apply the sticky-footer rules above.

10. **Animation libraries are restricted.** `motion` (framer-motion) is allowed only for:

   - **(a) Screen-to-screen transitions** via the shipped `<ScreenStack>` (`src/components/ScreenStack/`). iOS-native direction: forward = old slides LEFT + new enters RIGHT (`direction={1}`); back = mirrored (`direction={-1}`). RTL auto-mirrors. Orchestrator owns `step` + `direction`; child screens are dumb. Never hand-roll per-screen slides with `motion.div`.
   - **(b) Content-internal transitions** — `AnimatePresence` around swapping chunks of content in place (error state, loader replacing a field). Small fade + small translate.
   - **(c) Phone-screen height animation** to resize smoothly between screen states. Wrapper needs `position: relative`, `AnimatePresence mode="popLayout"`, and a `ResizeObserver` feeding height into `motion.div`.
   - **(d) Shake-on-invalid CTA** — use `useShake()` from `src/lib/useShake.ts`. See rule 11.

   The phone frame itself MUST NOT animate (transform, position, width). Anything outside (a)–(d) is a discussion first.

11. **Don't disable the primary CTA — shake it.** Tabby convention: the sticky-bottom primary CTA stays visually enabled even when the form is invalid or fields are empty. Submitting with invalid data triggers a horizontal shake, paired with whatever inline error state the field already renders. A disabled button provides no feedback about *why* it can't be pressed; a shake does.

   Use `useShake()` from `src/lib/useShake.ts`:

   ```tsx
   import { motion } from 'motion/react';
   import { useShake } from '../lib/useShake';

   const { controls, shake } = useShake();

   function handleSubmit(e) {
     e.preventDefault();
     if (!isValid) { shake(); return; }
     // proceed
   }

   <motion.div animate={controls}>
     <Button type="submit">Continue</Button>
   </motion.div>
   ```

   `isLoading={submitting}` is fine — busy is orthogonal to disabled; the spinner + blocked interaction are correct during an in-flight submit. Reserve `disabled={true}` for real, state-locked blocks (consent unchecked, rate-limit cooldown, prerequisite not met). "Empty" and "invalid" are shake cases, never disable cases.

---

## Variants (A/B/C/D)

This project may have been scaffolded with multiple variants. The active variant is managed by `VariantsContext` and surfaced in the toolbar as a small A/B/C/D pill next to the theme switch (hidden when there's only one variant).

### What makes a real variant

Variants must explore genuinely **different approaches** to the same problem, not different *finishes* on the same approach. If you can't explain in one sentence why a designer would pick variant B over variant A — and that sentence is *not* about a color, padding, or copy change — the variants are cosmetic and shouldn't exist.

**Forcing function (mandatory when variants > 1).** Before writing the first line of variant JSX, write a one-line axis statement per variant naming what's structurally different from A. Show the axes to the designer and wait for approval. If you can't write N distinct sentences, you don't have N variants — nudge the count down or ask which axis the designer wants explored.

**Axes that count as "genuinely different":**

| Axis | What varies |
|---|---|
| Information architecture | What's grouped, what's visible, what's behind interaction |
| Primary interaction model | Swipe vs scroll vs tap vs form vs wizard |
| Visual hierarchy / what leads | First thing the eye lands on (amount-first, plan-first, outcome-first, etc.) |
| Progressive disclosure | Single page vs stepped flow vs accordion |
| Problem framing | What job the screen claims to do ("Pay in 4" vs "Split your payment" vs "When do you want to pay?") |
| Density | Only counts if paired with a structural decision — cards vs rows vs dense grid. "Tighter spacing" alone is not an axis. |

**Anti-patterns — nudge the designer to drop the count:**

- Same layout, different button color → not a variant, a finish tweak
- Same layout, different copy → not a variant, a copy tweak
- Same layout, different background token level → not a variant; fix it in A, nuke B
- "A but tighter / looser" without a structural change → not a variant
- Four variants of a truly simple screen (2-field form, single-button splash) → more variants than the screen can support; negotiate the count down

Exception: if the designer *explicitly* asks for cosmetic-only variants ("give me 4 CTA color explorations"), that's a legitimate axis statement they've owned. Build it.

Note: variant switching is disabled while `/edit-mode` is active (the pill greys out). Structurally-different variants don't break edit-mode — the designer just finishes editing one variant before switching to compare.

### Single-screen prototype with variants

When the prototype is one screen, create sibling files per variant:
```
src/screens/Welcome/
  WelcomeA.tsx
  WelcomeB.tsx
  WelcomeA.module.css
  WelcomeB.module.css
  index.tsx            // reads activeVariant, renders the right sibling
```

`index.tsx` reads `useVariants()` and picks the sibling. Register `<Welcome />` once in `PROTOTYPES`.

### Multi-screen flow with variants — the important pattern

A **flow** is an ordered sequence of screens the designer clicks through (e.g. Email → OTP → Plan → Success). When a flow has multiple variants, every variant covers the SAME step list — you're comparing designs for the same journey, not different journeys.

**The rule:** when the designer switches the A/B/C/D pill mid-flow, the preview stays on the *same step* and only swaps the design. If they're on OTP in variant A and click B, they land on OTP in variant B — not back at Email.

File layout for a flow:

```
src/screens/Checkout/
  steps.ts             // ['Email', 'OTP', 'Plan', 'Success'] — single source of truth
  EmailA.tsx    EmailB.tsx    EmailA.module.css    EmailB.module.css
  OTPA.tsx      OTPB.tsx      OTPA.module.css      OTPB.module.css
  PlanA.tsx     PlanB.tsx     PlanA.module.css     PlanB.module.css
  SuccessA.tsx  SuccessB.tsx  SuccessA.module.css  SuccessB.module.css
  index.tsx            // the flow orchestrator — owns step + direction
```

The orchestrator (`index.tsx`) looks like this:

```tsx
import { useState } from 'react';
import ScreenStack from '../../components/ScreenStack/ScreenStack';
import { useVariants } from '../../VariantsContext';
import { useDir } from '../../DirContext';
import { STEPS, type Step } from './steps';
import EmailA from './EmailA';
import EmailB from './EmailB';
import OTPA from './OTPA';
import OTPB from './OTPB';
// … etc

const COMPONENTS = {
  A: { Email: EmailA, OTP: OTPA, Plan: PlanA, Success: SuccessA },
  B: { Email: EmailB, OTP: OTPB, Plan: PlanB, Success: SuccessB },
} as const;

export default function Checkout() {
  const { activeVariant } = useVariants();
  const { dir } = useDir();
  const [step, setStep] = useState<Step>('Email');
  const [direction, setDirection] = useState<1 | -1>(1);

  const goTo = (next: Step) => {
    const currIdx = STEPS.indexOf(step);
    const nextIdx = STEPS.indexOf(next);
    setDirection(nextIdx >= currIdx ? 1 : -1);
    setStep(next);
  };

  const Component = COMPONENTS[activeVariant]?.[step] ?? COMPONENTS.A[step];

  return (
    <ScreenStack screenKey={step} direction={direction} dir={dir}>
      <Component goTo={goTo} />
    </ScreenStack>
  );
}
```

Why this works:
- `step` is local state in the orchestrator. It does NOT reset when `activeVariant` changes — React preserves component state across prop changes.
- `ScreenStack`'s `screenKey={step}` means it only transitions when the *step* changes. A variant switch changes only `Component`, not `screenKey`, so the swap is instant (no slide).
- Each step component takes a `goTo` prop — it never owns its own routing. `goTo('OTP')` advances the flow with the right direction computed for you.
- All variants share the same step vocabulary defined in `steps.ts`. Never diverge step names across variants — if B has an "Intro" step A doesn't, promote it to the shared list and let A render a pass-through.

Register the orchestrator once in `PROTOTYPES` — it's a single route like `/checkout` that owns the whole flow internally.

**Don't** build per-variant flows as separate prototypes (Checkout-A, Checkout-B). That breaks the pill-preserves-step behavior and forces the designer to re-navigate after every switch.

---

## Docs access

- **Primary — local `node_modules`**:
  - Catalog: `ls node_modules/@tabby.ai/tabby-ui/O25/` (every folder is an available component).
  - Types: `node_modules/@tabby.ai/tabby-ui/O25/<Name>/<Name>.d.ts` — full prop surface with JSDoc.
  - Shipped CSS: `node_modules/@tabby.ai/tabby-ui/O25/<Name>/<Name>.css` — read before writing CSS-module overrides so you know which class selectors to target.
  - Icons: `ls node_modules/@tabby.ai/tabby-ui/icons/core/` — every glyph, named `<Name><Size>` (e.g. `Plus24`).
- **Storybook** at [tabby-ui.tabby.dev](https://tabby-ui.tabby.dev/) for visual exploration (requires Tabby SSO in the browser).

---

## Static assets + routing

Static files go in `assets/` (not `public/` — `vite.config.ts` sets `publicDir: 'assets'`). The dev server only scans on startup; restart after adding new files.

`react-router-dom@7` with `BrowserRouter`. Every prototype gets a top-level path (`/email`, `/checkout`, etc.). To add one: build under `src/screens/<Name>/`, then append `{ path, labelEn, labelAr, Component }` to `PROTOTYPES` in `src/App.tsx` — that entry wires up the route AND the hamburger menu item.

---

## Dev

```bash
pnpm dev                 # Vite on :5173
pnpm typecheck           # tsc -b
pnpm build               # typecheck + Vite prod build
```

**Verify before claiming done:** `pnpm typecheck && pnpm build` must both pass with zero errors.

---

## Design tokens

Authoritative source: `node_modules/@tabby.ai/tabby-ui/O25/styles/`. Always check `--tui-*` first; anything tabby-ui doesn't ship goes in `src/tokens.css` under `:root`.

**Text (`--tui-front-*`)**
| Token | Usage |
|---|---|
| `--tui-front-primary` | Primary text |
| `--tui-front-secondary` | Secondary text, captions, helper affordances (chevron) |
| `--tui-front-tertiary` | Disabled text, inactive indicators |
| `--tui-front-accent` | Accent/link color (Tabby iris-purple) |
| `--tui-front-positive` / `-negative` / `-warning` | Semantic glyph + message colors |
| `--tui-front-link` | Same value as accent, use for hypertext |
| `--tui-front-disabled` | Fully inert state |

**Backgrounds (`--tui-background-*`)**
| Token | Usage |
|---|---|
| `--tui-background-general-level-0` | Page canvas |
| `--tui-background-general-level-1` | Cards, sheets, footer surfaces |
| `--tui-background-general-level-2` | Muted surface, neutral tiles |
| `--tui-background-accent-muted-level-1/-2/-3` | Accent-branded surfaces ONLY (e.g. promo cards, selected chip). Not a general-purpose icon-circle background — use `--tui-background-general-level-2` for neutral icon containers. |
| `--tui-background-accent-strong` | Solid accent fill |
| `--tui-background-positive-muted-*` / `-strong` | Positive tint / fill |
| `--tui-background-negative-muted-*` / `-strong` | Negative tint / fill |
| `--tui-background-warning-muted-*` / `-strong` | Warning tint / fill |
| `--tui-background-control-primary` / `-secondary-*` | Button + control fills |
| `--tui-special-cashback-background` / `-strong` | Cashback brand pink |

**Lines**
| Token | Usage |
|---|---|
| `--tui-line-primary-*` | Borders, emphasized dividers |
| `--tui-line-disabled-*` | Soft in-card dividers (often paired with `opacity: 0.6` for hairlines) |
| `--tui-line-accent-*` / `-positive-*` / `-negative-*` / `-warning-*` | Semantic borders |
| `--tui-line-selected` | Selected state outline |

**Buttons** follow `--tui-button-{variant}-{tone}-{state}` naming (rarely hand-touched — `<Button>` handles them).

---

## Figma → Tabby token crosswalk

Tabby's Figma binds most design decisions to variable names matching the shipped code's `--tui-*` tokens. When you call `get_variable_defs` on a node (always do this before writing JSX — see SKILL.md Step 3), you'll see names like `--tui-front-primary`, `--tui-background-general`. Most map 1:1 to the code token; the background families need a small translation.

### Direct 1:1 (safe to use verbatim)

Any Figma variable ending in one of these can be pasted straight into your CSS as `var(<name>)`:

- `--tui-front-primary` / `-secondary` / `-tertiary` / `-accent` / `-negative` / `-positive` / `-warning` / `-link` / `-disabled`
- `--tui-background-control-primary` / `-control-secondary-*`
- `--tui-background-dark-overlay` / `-light-overlay`
- `--tui-invert-background-control-primary` / `-invert-front-*` / `-invert-*`
- `--tui-static-front-primary-invert`
- `--tui-line-primary-*` / `-accent-*` / `-positive-*` / `-negative-*` / `-warning-*` / `-disabled-*` / `-selected`
- `--tui-special-cashback-background` / `-strong`

### Flat Figma names → level-suffixed code tokens

**Critical:** the background families (`general`, `accent-muted`, `negative-muted`, `positive-muted`, `warning-muted`) are **flat in Figma** (e.g. `--tui-background-general`) but **level-suffixed in code** (e.g. `--tui-background-general-level-1`). You CANNOT pass the flat name through — in the shipped code it resolves to `level-0` by default, which is usually the grey canvas, not the white surface Figma shows.

Pick the level by hex. Reference table (O25 light):

| Figma name + hex | Code token | Code hex |
|---|---|---|
| `--tui-background-general: #ffffff` | `--tui-background-general-level-1` | `#ffffff` |
| `--tui-background-general: #f2f5f7` | `--tui-background-general-level-0` | `#f2f5f7` |
| `--tui-background-accent-muted: #f2e8ff` | `--tui-background-accent-muted-level-2` | `#f2e8ff` |
| `--tui-background-accent-muted: #eadefc` | `--tui-background-accent-muted-level-1` | `#eadefc` |
| `--tui-background-negative-muted: #ffe6e3` | `--tui-background-negative-muted-level-2` | `#ffe6e3` |
| `--tui-background-positive-muted` | `-level-2` (lightest tint) | — |
| `--tui-background-warning-muted` | `-level-2` (lightest tint) | — |

For any `-muted` background family, default to `level-2` (the lightest tint) unless Figma's hex specifically matches `level-1` (slightly darker).

### O25 light hex collision warning (critical)

**In O25 light, `-level-0` and `-level-2` both resolve to `#f2f5f7` (grey). `-level-1` and `-level-3` both to `#ffffff` (white).** So you cannot pick the right level by screenshot-eyeballing in light mode — a wrong level looks identical to a right level until you switch theme.

**In O26 dark, all four levels diverge.** Dark is the ground-truth theme for level verification. The adherence audit (SKILL.md Step 6.5) MUST include an O26 dark spot-check; the numeric `preview_inspect` pass helps catch wrong levels before they become visual bugs.

---

## Inline-edit overlay (dev-only) — installed by /edit-mode

A floating "Edit" toggle sits in the top bar. When active:

- Clicking any element inside the phone opens a right-docked properties
  sidebar (Figma-style) with content / typography / color / padding /
  margin / gap controls depending on what was clicked.
- Changes apply **live** to the DOM via class swaps + inline styles.
  No source file is touched until the designer copies the blurb.
- Pending changes stack on the left as cards. Per-card delete, Remove
  all, and Copy all changes.
- Toggling Edit off with pending changes opens a confirm dialog so
  changes aren't discarded by accident.

The overlay emits `<!-- tabby-edit-v1 ... -->` blurbs wrapping JSON
describing the edits. When the designer pastes one of those into a
Claude chat, the `/edit-mode` skill's paste-apply flow writes the
changes back to the source files.

`src/devtools/` is skill-managed — do not edit those files unless you
are the `/edit-mode` skill maintainer. Production builds skip the
Babel source-stamp plugin and omit the overlay entirely.
