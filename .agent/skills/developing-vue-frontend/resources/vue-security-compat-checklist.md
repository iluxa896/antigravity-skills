# Vue 3 Security, Radix Vue & Compatibility Checklist

This checklist provides a senior developer reference for building resilient, accessible, and enterprise-secure Vue 3 applications. It supports both **Inertia.js Monoliths** and **Standalone Vue 3 SPAs**, enforcing **Radix Vue** for complex interactive UI primitives, cross-platform device resilience, and cross-browser compatibility.

---

## Part 1: Dual Archetype Architecture & Security Hardening

### Archetype A: Inertia.js Monolith (Laravel / Rails + Vue 3)
- [ ] **Session & CSRF Based**: Rely entirely on server session cookies (`HttpOnly`, `SameSite=Lax/Strict`) and automated CSRF headers (`X-XSRF-TOKEN`).
- [ ] **Shared Server State**: Read authentication, flash messages, and user profiles directly from `usePage().props.auth.user`.
- [ ] **No Redundant Pinia Auth**: Do **NOT** install Pinia auth stores, manual JWT storage, or Axios bearer token interceptors for Inertia pages.
- [ ] **Inertia Form Handling**: Use `@inertiajs/vue3`'s `useForm()` for declarative submissions, automatic validation error mapping, `processing` disabled states, and clean resets.
- [ ] **Declarative Navigation**: Use Inertia `<Link href="...">` or programmatic `router.visit()` / `router.get()`.

### Archetype B: Standalone Vue 3 SPA (Vite / Nuxt + REST / GraphQL)
- [ ] **No Tokens in LocalStorage**: Never store sensitive JWT access tokens in `localStorage` or `sessionStorage` (vulnerable to XSS exfiltration).
- [ ] **In-Memory + Silent Refresh**: Store short-lived access tokens in Pinia memory (RAM); refresh via `HttpOnly`, `SameSite=Strict` cookies.
- [ ] **Client Navigation Guards**: Implement Vue Router guards (`beforeEach`) for navigation UX, backed by strict server-side API authorization.
- [ ] **Sensitive State Cleanup**: Automatically clear user profiles, cached queries, and form drafts in Pinia on logout.
- [ ] **Custom Form Composables**: Use typesafe validation composables (or VeeValidate / Zod) with explicit DTOs.

### Common Security Defenses (Both Archetypes)
- [ ] **DOM XSS Defense**: Never pass unescaped user-supplied HTML to `v-html`. Sanitize with `DOMPurify.sanitize(input)` if HTML rendering is strictly required.
- [ ] **Strict Link URL Validation**: Validate dynamic `:href`, `:src`, and `iframe` URLs. Deny `javascript:` and `data:text/html` schemes.
- [ ] **External Link Security**: Always pair external links with `target="_blank" rel="noopener noreferrer"`.
- [ ] **Template Injection Defense**: Never use runtime template compilation (`Vue.compile()`, `eval()`, `new Function()`). Pre-compile all templates at build time via Vite.
- [ ] **Numeric Coercion Safety**: Guard numeric prototype calls: `Number(value ?? 0).toFixed(2)` to prevent fatal `TypeError` on string inputs.
- [ ] **Division-by-Zero Defense**: Guard metric ratios, percentages, and progress formulas against zero denominators (`denominator <= 0 ? 0 : ...`).

---

## Part 2: Radix Vue Mandatory Primitives Checklist

Radix Vue provides unstyled, headless, WAI-ARIA compliant primitives with robust focus management, keyboard navigation, and portal rendering. Use Radix Vue for all complex interactive overlays and controls across both Inertia and Standalone SPAs:

### 1. Component Selection
- [ ] **Dialogs / Modals**: Use `DialogRoot` + `DialogPortal` + `DialogOverlay` + `DialogContent`. Never create custom `<Teleport>` overlays with manual focus trap hacks.
- [ ] **Dropdown Menus**: Use `DropdownMenuRoot` + `DropdownMenuTrigger` + `DropdownMenuContent` + `DropdownMenuItem`. Never create custom `<ul>` dropdowns with brittle `@click.outside` directives.
- [ ] **Popovers**: Use `PopoverRoot` + `PopoverTrigger` + `PopoverContent` for contextual floating panels.
- [ ] **Select / Combobox**: Use `SelectRoot` + `SelectTrigger` + `SelectContent` + `SelectItem` for accessible custom selection dropdowns.
- [ ] **Tooltips**: Use `TooltipProvider` + `TooltipRoot` + `TooltipTrigger` + `TooltipContent`. Never use browser `title` attributes or unstyled hover boxes.
- [ ] **Tabs**: Use `TabsRoot` + `TabsList` + `TabsTrigger` + `TabsContent` for keyboard-navigable tab panels.
- [ ] **Accordions**: Use `AccordionRoot` + `AccordionItem` + `AccordionTrigger` + `AccordionContent`.
- [ ] **Checkboxes**: Use `CheckboxRoot` + `CheckboxIndicator` for accessible custom tri-state checkboxes.
- [ ] **Alert Confirmations**: Use `AlertDialogRoot` + `AlertDialogAction` + `AlertDialogCancel` instead of blocking `window.confirm()`.

### 2. Integration Best Practices
- [ ] **Unstyled-First**: Style Radix primitives using project design tokens (Tailwind CSS or Vanilla CSS).
- [ ] **Trigger Slot Composition (`as-child`)**: Use `as-child` on trigger elements (`<DialogTrigger as-child>`, `<DropdownMenuTrigger as-child>`) to attach trigger behaviors directly to custom buttons without wrapper elements.
- [ ] **Automatic Focus Management**: Rely on Radix's built-in focus containment, initial focus targeting, and focus restoration upon closing.
- [ ] **Native Elements for Simplicity**: Do NOT wrap simple push buttons, standard form text inputs, or regular hyperlinks in Radix primitives — use standard semantic HTML `<button>`, `<input>`, `<a>`.

---

## Part 3: Senior Engineering Pragmatism (KISS, YAGNI & Browser Defaults)

- [ ] **Toolkit, Not Checklist**: Use patterns from this skill only when solving a concrete problem. If code is already working, secure, and readable: **leave it alone**.
- [ ] **Virtual DOM Keys (`:key`)**:
  - For **static read-only lists** (breadcrumbs, pagination links, navigation lists): Use standard `:key="index"` or `:key="item.name"`. Avoid cargo-cult string concatenations like `${item.name}-${index}`.
  - For **dynamic mutable lists** (rows with inputs, draggable items, items that can be inserted or deleted mid-list): Provide stable unique IDs (`:key="item.id"` or local `_uid`).
- [ ] **Native CSS Scrolling**: Prefer `overflow-x: auto; touch-pan-x; scrollbar-width: none;` over complex 50-line JavaScript mouse drag implementations.
- [ ] **Never Capture Pointer on Buttons**: Never call `setPointerCapture` on a parent container wrapping clickable buttons or links (pointer capture redirects `pointerup`, causing browsers to swallow synthetic click events).
- [ ] **No Speculative Cross-Tab Sync**: Avoid `BroadcastChannel` or `localStorage` timestamp synchronization unless multi-tab coordination is an explicit business requirement.

---

## Part 4: Vue 3 Code Quality & Composition API

- [ ] Use `<script setup>` (or `<script setup lang="ts">` if TypeScript is enabled) across all Single File Components.
- [ ] Explicit typed props via `defineProps<{ ... }>()` and emits via `defineEmits<{ ... }>()`.
- [ ] Enforce WCAG 2.1 AA keyboard support for custom non-native interactive elements:
  - Custom buttons/cards with `role="button"` must handle both `@keydown.enter` and `@keydown.space.prevent`.
  - Clickable table sort headers must provide `role="button"`, `tabindex="0"`, `:aria-sort`, and `:aria-label`.
- [ ] Clean separation of concerns: Keep SFC templates declarative; extract heavy domain logic into composables.

---

## Part 5: Cross-Platform Device Matrix (iOS, Android, macOS, Windows)

### 1. iOS / iPhone & iPad (WebKit)
- [ ] **Dynamic Viewport (`100dvh`)**: Use `100dvh` (with `100vh` fallback) so full-height containers adapt when Safari navigation bars collapse.
- [ ] **Safe Area Insets**: Add `env(safe-area-inset-top/bottom/left/right)` on fixed/sticky elements and modals; ensure `<meta name="viewport" content="viewport-fit=cover">` is present.
- [ ] **No Input Zoom**: Set input `font-size: 16px` (e.g. `text-[16px] sm:text-sm`) to prevent iOS Safari from zooming into the page on focus.
- [ ] **Tap Highlight Clear**: Add `-webkit-tap-highlight-color: transparent` to eliminate grey tap boxes.
- [ ] **Virtual Keyboard Handling**: Utilize the Visual Viewport API (`window.visualViewport`) to adapt drawer layouts when the soft keyboard appears.

### 2. Android (Chrome, Samsung Internet — Blink)
- [ ] **Eliminate 300ms Tap Delay**: Add `touch-action: manipulation` to all interactive buttons and cards.
- [ ] **Hardware Back Button Navigation**: Sync modal open state with history via `popstate` (`useAndroidBackModalSync`) so pressing back dismisses dialogs instead of navigating away.
- [ ] **Contain Pull-to-Refresh**: Apply `overscroll-behavior-y: contain` to scrollable dialogs and bottom sheets.
- [ ] **Decoupled Layers**: Separate backdrop overlay from dialog content to prevent Blink flex-box calculation flashes.

### 3. macOS (Safari & Chrome)
- [ ] **Font Smoothing**: Apply `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` for crisp Retina display text.
- [ ] **System Appearance Sync**: React gracefully to `prefers-color-scheme: dark/light`.
- [ ] **Platform Modifiers**: Check `event.metaKey` (Command ⌘) vs `event.ctrlKey` for keyboard shortcuts.
- [ ] **Trackpad Gesture Isolation**: Isolate carousel/slider touch gestures so horizontal trackpad swipes do not trigger browser history navigation.

### 4. Windows (Edge, Chrome & Firefox)
- [ ] **Zero Layout Shift (CLS)**: Add `scrollbar-gutter: stable` to prevent the page from twitching horizontally when scrollbars appear or lock.
- [ ] **Custom Modern Scrollbars**: Style scrollbars (`scrollbar-width: thin; scrollbar-color: ...` + `::-webkit-scrollbar`).
- [ ] **Windows High Contrast Mode**: Verify styles with `@media (forced-colors: active)` using system keywords (`CanvasText`, `ButtonText`).
- [ ] **Touch Laptop Hybrid Pointer**: Disentangle touch gestures from mouse hovers via `@media (hover: hover) and (pointer: fine)` vs `@media (pointer: coarse)`.

---

## Part 6: Cross-Browser Compatibility Checklist

- [ ] **`@supports` for `backdrop-filter`**: Wrap glassmorphic styles in `@supports (backdrop-filter: blur(1px))` with opaque fallback background.
- [ ] **Vendor prefix**: Always pair `backdrop-filter` with `-webkit-backdrop-filter`.
- [ ] **Dynamic viewport**: Use dual declaration `height: 100vh; height: 100dvh;`.
- [ ] **Scrollbars**: Firefox `scrollbar-width: thin` paired with WebKit `::-webkit-scrollbar`.
- [ ] **Verified Targets**: Safari 16+, Chrome 100+, Firefox 115+, Edge 100+ (including High Contrast Mode).

