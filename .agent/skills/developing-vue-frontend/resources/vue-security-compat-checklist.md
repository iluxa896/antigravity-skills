# Vue 3 Security, Radix Vue & Compatibility Checklist

This checklist provides a senior developer reference for building resilient, accessible, and enterprise-secure Vue 3 applications with mandatory Radix Vue primitives, cross-platform device support, and cross-browser compatibility.

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

---

## Part 2: Radix Vue Mandatory Primitives Checklist

### 1. Component Selection

- [ ] **Dialogs / Modals**: Use `DialogRoot` + `DialogPortal` + `DialogOverlay` + `DialogContent`. Never use custom `<Teleport>` + `v-if` + manual focus trapping.
- [ ] **Popovers**: Use `PopoverRoot` + `PopoverTrigger` + `PopoverContent`. Never use custom `position: absolute` with `v-if` toggle.
- [ ] **Dropdown Menus**: Use `DropdownMenuRoot` + `DropdownMenuTrigger` + `DropdownMenuContent`. Never use custom `<ul>` with `@click.outside`.
- [ ] **Select / Combobox**: Use `SelectRoot` + `SelectTrigger` + `SelectContent` + `SelectItem`. Never use custom `<div>` with `role="listbox"`.
- [ ] **Tooltips**: Use `TooltipProvider` + `TooltipRoot` + `TooltipTrigger` + `TooltipContent`. Never use `title` attributes or custom hover `<div>`.
- [ ] **Accordions**: Use `AccordionRoot` + `AccordionItem` + `AccordionTrigger` + `AccordionContent`. Never use custom `v-if` toggle panels.
- [ ] **Tabs**: Use `TabsRoot` + `TabsList` + `TabsTrigger` + `TabsContent`. Never use custom `<button>` + `v-if` switching.
- [ ] **Alert Dialogs**: Use `AlertDialogRoot` + `AlertDialogAction` + `AlertDialogCancel`. Never use `window.confirm()`.

### 2. Integration Quality

- [ ] **Unstyled-First**: Radix Vue components have zero default styling — all CSS is provided by the project.
- [ ] **Slot Composition**: Use `as-child` prop for trigger elements to render custom trigger buttons without extra DOM wrappers.
- [ ] **Focus Management**: Do NOT manually implement `tabindex`, `focus()`, or keyboard trapping for Radix primitives — it's handled internally.
- [ ] **Animation via `data-state`**: Use Radix's `data-state="open|closed"` attributes for CSS animations or Vue `<Transition>`.
- [ ] **Portal Usage**: Use Radix's built-in portals (`DialogPortal`, `PopoverPortal`) instead of raw `<Teleport to="body">`.

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

## Part 4: Cross-Platform Device Matrix (iOS, Android, macOS, Windows)

### 1. iOS / iPhone & iPad (WebKit)
- [ ] **Dynamic Viewport (`100dvh`)**: Use `100dvh` (with `100vh` fallback) so modals and full-height layouts adapt when Safari address bars expand/collapse.
- [ ] **Safe Area Insets**: Use `env(safe-area-inset-top/bottom/left/right)` on sticky bars and modals; add `viewport-fit=cover` in HTML head.
- [ ] **No Input Zoom**: Set input `font-size: 16px` on mobile to prevent iOS Safari from zooming into the viewport.
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
- [ ] **Custom Modern Scrollbars**: Style scrollbars (`scrollbar-width: thin; scrollbar-color: ...` + `::-webkit-scrollbar`).
- [ ] **Windows High Contrast Mode**: Verify styles with `@media (forced-colors: active)` using system keywords (`CanvasText`, `ButtonText`).
- [ ] **Touch Laptop Hybrid Pointer**: Disentangle touch gestures from mouse hovers via `@media (hover: hover) and (pointer: fine)` vs `@media (pointer: coarse)`.

---

## Part 5: Cross-Browser Compatibility Checklist

### 1. CSS Feature Guards
- [ ] **`@supports` for `backdrop-filter`**: Wrap glassmorphic styles in `@supports (backdrop-filter: blur(1px))` with opaque fallback background.
- [ ] **Vendor prefix**: Always pair `backdrop-filter` with `-webkit-backdrop-filter`.
- [ ] **Dynamic viewport**: Use dual declaration `height: 100vh; height: 100dvh;` for browsers with partial `dvh` support.

### 2. Scrollbar Strategy
- [ ] **Firefox**: Use `scrollbar-width: thin; scrollbar-color: <thumb> <track>;` for native thin scrollbar.
- [ ] **Chrome / Safari / Edge**: Use `::-webkit-scrollbar`, `::-webkit-scrollbar-thumb`, `::-webkit-scrollbar-track` pseudo-elements.
- [ ] **Safari quirk**: `scrollbar-gutter: stable` is NOT supported — compensate with `padding-right` on scroll lock.

### 3. Font Rendering
- [ ] **Safari / Chrome**: Apply `-webkit-font-smoothing: antialiased;` for Retina clarity.
- [ ] **Firefox / macOS**: Apply `-moz-osx-font-smoothing: grayscale;`.

### 4. Verified Browser Targets
- [ ] **Safari 16+** (WebKit) — tested and working.
- [ ] **Chrome 100+** (Blink) — tested and working.
- [ ] **Firefox 115+** (Gecko) — tested and working.
- [ ] **Edge 100+** (Blink) — tested and working, including High Contrast Mode.
