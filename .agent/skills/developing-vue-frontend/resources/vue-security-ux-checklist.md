# Vue 3 Security & High-Converting UX Checklist

This checklist provides a senior developer reference for building high-converting, resilient, and enterprise-secure Vue
3 applications.

---

## Part 1: Vue 3 Security Hardening Checklist

### 1. DOM XSS Protection

- [ ] **Sanitize `v-html`**: Never pass unescaped user-supplied HTML to `v-html`. Use `DOMPurify.sanitize(input)`.
- [ ] **Strict URL Validation**: Validate dynamic `:href`, `:src`, and `iframe` URLs. Deny `javascript:` and
  `data:text/html` schemes.
- [ ] **Template Injection Defense**: Never use runtime template compilation (`Vue.compile()`, `new Function()`,
  `eval()`). Always compile templates at build-time via Vite.
- [ ] **Safe Third-Party Integrations**: Wrap Markdown, syntax highlighters, and rich-text editors (Quill, TipTap) in
  strict HTML sanitizers before rendering.

### 2. Authentication & State Protection

- [ ] **No Tokens in LocalStorage**: Avoid storing sensitive JWT access tokens in `localStorage` or `sessionStorage` (
  prevent XSS exfiltration).
- [ ] **In-Memory + Silent Refresh**: Store short-lived access tokens in Pinia memory; rotate via HTTP-Only,
  SameSite=Strict cookies.
- [ ] **Sensitive State Cleanup**: Automatically clear user profile, cached queries, and form drafts in Pinia when user
  logs out.
- [ ] **Defense Against Prototype Pollution**: Freeze or deeply clone external JSON payloads before mutating global
  reactive state.

### 3. Routing & Navigation Guards

- [ ] **Server-Side Authorization**: Treat Vue Router client guards as UX navigation aids only. Enforce authorization
  checks on backend API endpoints.
- [ ] **Open Redirect Prevention**: Validate redirect query parameters (`/login?redirect=/dashboard`) to ensure target
  URL is a relative internal path starting with `/` (and not `//` or external domains).

### 4. Mathematical & Numeric Data Robustness

- [ ] **Defensive Number Casting**: Always cast values before invoking numeric prototype methods:
  `Number(value ?? 0).toFixed(2)` to prevent fatal `TypeError` when APIs return numbers as strings.
- [ ] **Division-by-Zero Defense**: Guard metric ratios, percentages, and progress formulas against zero or negative
  denominators (`denominator <= 0 ? 0 : ...`).
- [ ] **Indicator & Badge Threshold Guards**: Never display metric badges, delta chips, or counter indicators with
  negative or meaningless zero states when representing positive metrics (`val <= 0 ? null : val`).
- [ ] **Placeholder Link Suppression**: When `href` defaults or evaluates to a placeholder target like `'#'`, suppress
  unintended page navigation via `@click="isPlaceholder && $event.preventDefault()"` and set
  `:aria-disabled="isPlaceholder"`.

---

## Part 2: High-Converting Selling UI/UX Checklist

### 1. Visual Hierarchy & Aesthetic Impact

- [ ] **Magnetic Above-The-Fold**: Clear value proposition (H1), concise sub-headline explaining the transformation,
  high-contrast primary CTA, and trust social proof badge.
- [ ] **Layered Depth & Glassmorphism**: Use translucent glass backgrounds (`backdrop-filter: blur(12px)`), subtle
  borders (`1px solid rgba(255,255,255,0.08)`), and colored ambient drop-shadows.
- [ ] **Refined Micro-Interactions**: Hover elevation, subtle button press physics (`transform: scale(0.98)`), loading
  spinners on submit, and smooth accordion transitions.
- [ ] **Modern Typography**: Pair high-impact display sans-serif (Inter, Plus Jakarta Sans, Outfit) with consistent
  vertical rhythm.

### 2. Conversion Friction Eliminators

- [ ] **Interactive Pricing Toggles**: Smooth monthly/yearly billing switches with clear discount badges (e.g., "Save
  20%").
- [ ] **Risk Reversal Indicators**: Place "30-Day Money-Back Guarantee", "No Credit Card Required", or "Cancel Anytime"
  directly underneath key CTA buttons.
- [ ] **Inline Form Validation**: Immediate feedback on blur, green checkmarks on valid inputs, clear and human error
  messages.
- [ ] **Mobile-First Responsive Layout**: Single column flow on mobile, sticky CTA bar on scroll for mobile users, touch
  target sizes at least 44x44px.

---

## Part 3: Vue 3 Code Quality & Best Practices

- [ ] Enforce `<script setup lang="ts">` across all Single File Components.
- [ ] Typed props with `defineProps<{ ... }>()` and emits with `defineEmits<{ ... }>()`.
- [ ] Prop contract validators: Add `validator: (val) => [...]` and explicit runtime `type` (or TypeScript literal
  union) for enum-like variant or size props.
- [ ] Clean separation of concerns: Extract complex stateful workflows to domain Composables (`useCheckout()`,
  `useAnalytics()`, `useForm()`).
- [ ] Zero lint/type errors (`vue-tsc --noEmit`).
- [ ] **WCAG 2.1 AA WAI-ARIA Keyboard Triggers**:
    - Custom buttons, clickable cards, and actionable rows with `role="button"` MUST implement both `@keydown.enter` and
      `@keydown.space.prevent`.
    - Clickable table sort headers MUST provide `role="button"`, `tabindex="0"`, `:aria-sort`, `:aria-label`, and
      Enter/Space handlers.
- [ ] Color contrast ratios exceeding 4.5:1 (WCAG AA).

---

## Part 4: Mobile Viewport & Modal Architecture Checklist (WebKit & Blink Resiliency)

### 1. Scroll Locking & WebKit Compositor Deadlock Prevention

- [ ] **Zero Direct Body Overflow Mutation**: Never execute `document.body.style.overflow = 'hidden'` on open. Doing so
  during momentum scroll freezes iOS Safari compositor for 3–5 seconds and drops tile rendering.
- [ ] **Position-Fixed Scroll Lock Pattern**: Use `useBodyScrollLock` to save scroll offset (`window.scrollY`), apply
  `position: fixed; width: 100%; top: -${scrollY}px`, and restore with `window.scrollTo({ behavior: 'instant' })`.
- [ ] **Chained Scroll Containment**: Apply `overscroll-behavior: contain` to all scrollable modal containers to prevent
  momentum transfer to the underlying page.

### 2. Layout Stacking & Android Blink Glitch Prevention

- [ ] **Decouple Backdrop and Dialog Containers**: Never place a `position: fixed` backdrop and `position: relative`
  modal dialog as sibling flex-items inside one `display: flex` wrapper. Chromium calculates them as flex siblings on
  initial tick, causing a 16–50ms visual flash.
- [ ] **Symmetrical Root Transitions**: Place `<Transition>` directly at the root under `<Teleport to="body">` with
  `v-if="isOpen"` on the backdrop container and `v-if="isOpen"` on the inner dialog card. Never wrap `<Transition>`
  inside an outer unmounting `div`.
- [ ] **Conditional Event Listener Lifecycle**: Never attach global `window.addEventListener('keydown')` unconditionally
  on `onMounted` when a modal is closed. Use `watch(isOpen, ..., { immediate: true })` and clean up on `onUnmounted`.
- [ ] **Hardware Acceleration**: Explicitly set `-webkit-transform: translate3d(0,0,0); transform: translate3d(0,0,0);`
  and `-webkit-overflow-scrolling: touch` on the modal dialog card to enforce an isolated GPU layer.

### 3. Touch Gesture & Asset Optimization

- [ ] **Hover Isolation on Touch**: Wrap desktop hover interactions (`group-hover:opacity-100`, hover overlays) in
  `@media (hover: hover) and (pointer: fine)` to stop mobile taps from triggering synthetic hover states.
- [ ] **Eager Modal Images**: Set `loading="eager"` and explicit aspect ratios on primary modal hero images to eliminate
  async decoding layout jumps.

---

## Part 5: Cross-Platform Device & OS Matrix (Android, iOS, Mac, Windows)

### 1. iOS / iPhone & iPad (WebKit)
- [ ] **Dynamic Viewport (`100dvh`)**: Use `100dvh` (with `100vh` fallback) so modals and full-height layouts adapt when Safari address bars expand/collapse.
- [ ] **Safe Area Insets**: Use `env(safe-area-inset-top/bottom/left/right)` on sticky bars and modals; add `viewport-fit=cover` in HTML head.
- [ ] **No Input Zoom**: Set input `font-size: 16px` (Tailwind `text-base`) on mobile to prevent iOS Safari from zooming into the viewport.
- [ ] **Tap Highlight Clear**: Add `-webkit-tap-highlight-color: transparent` to eliminate grey tap boxes.
- [ ] **Virtual Keyboard Handling**: Use Visual Viewport API (`window.visualViewport`) to adjust scrollable drawers when software keyboard pops up.

### 2. Android (Chrome, Samsung Internet & Blink)
- [ ] **Eliminate 300ms Tap Delay**: Add `touch-action: manipulation` to all interactive buttons and cards.
- [ ] **Hardware Back Button Navigation**: Sync modal open state with history via `popstate` (`useAndroidBackModalSync`) so pressing back dismisses the overlay.
- [ ] **Contain Pull-to-Refresh**: Apply `overscroll-behavior-y: contain` to scrollable dialogs and bottom sheets.
- [ ] **Decoupled Layers**: Separate backdrop from modal card to avoid Blink flex calculation flashes.

### 3. macOS (Safari & Chrome)
- [ ] **Font Smoothing**: Apply `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` for crisp Retina display text.
- [ ] **System Appearance Sync**: React to `prefers-color-scheme: dark/light`.
- [ ] **Platform Modifiers**: Check `event.metaKey` (Command ⌘) vs `event.ctrlKey` for keyboard shortcuts.
- [ ] **Trackpad Gesture Isolation**: Isolate carousel/slider touch gestures so horizontal trackpad swipes do not trigger browser history navigation.

### 4. Windows (Edge, Chrome & Firefox)
- [ ] **Zero Layout Shift (CLS)**: Add `scrollbar-gutter: stable` to prevent the page from twitching horizontally when scrollbars appear or lock.
- [ ] **Custom Modern Scrollbars**: Style scrollbars (`scrollbar-width: thin; scrollbar-color: ...`).
- [ ] **Windows High Contrast Mode**: Verify styles with `@media (forced-colors: active)` using system keywords (`CanvasText`, `ButtonText`).
- [ ] **Touch Laptop Hybrid Pointer**: Disentangle touch gestures from mouse hovers via `@media (hover: hover) and (pointer: fine)` vs `@media (pointer: coarse)`.


