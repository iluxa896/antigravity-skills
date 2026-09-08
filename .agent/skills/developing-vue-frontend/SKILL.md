---
name: developing-vue-frontend
description: >-
  Assists with modern Vue 3 frontend development enforcing Radix Vue for all interactive UI primitives,
  mandatory cross-platform resilience (Windows, macOS, iOS, Android), and cross-browser compatibility
  (Safari, Chrome, Firefox, Edge). Enforces Composition API, strict TypeScript, Pinia state management,
  DOM XSS defense, viewport resilience (100dvh, safe areas, scroll locking), and WCAG 2.1 AA accessibility.
  Use when building, styling, or refactoring Vue components, creating dialogs/popovers/dropdowns,
  designing layouts, or auditing frontend code.
---

# Developing Cross-Platform, Accessible & Secure Vue 3 Applications (Master Skill)

## When to use this skill

- Building or refactoring Vue 3 components, views, or layouts using `<script setup lang="ts">`.
- Creating interactive UI primitives (dialogs, popovers, dropdowns, tooltips, selects) — **must use Radix Vue**.
- Writing type-safe composables (`usePlatformAdaptation.ts`, `useSafeFormValidation.ts`) or Pinia setup stores.
- Engineering cross-platform resilience across **iOS / iPhone**, **Android**, **macOS**, and **Windows**.
- Ensuring cross-browser compatibility across **Safari**, **Chrome**, **Firefox**, and **Edge**.
- Hardening frontend code against DOM XSS, prototype pollution, token exfiltration, and open redirects.
- Auditing Vue components via the automated CLI scanner (`scripts/vue-audit-tool.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Visual UI/UX & Layout Aesthetics | Selecting color palettes, typography hierarchies, glassmorphic overlays, micro-interaction easing curves, ambient glow accents. |
| **Medium Freedom** | Component Structure & State Architecture | Structuring Pinia stores, designing composable contracts, configuring dynamic chunking, and defining route transition animations. |
| **Low Freedom** | Platform, Browser, Accessibility & Security | **Mandatory Radix Vue** for interactive primitives. Mandatory TypeScript (`lang="ts"`). `DOMPurify.sanitize()` on all `v-html`. Dynamic viewport (`100dvh`). iOS input `font-size >= 16px`. `touch-action: manipulation`. Zero sensitive tokens in `localStorage`. Cross-browser testing (Safari, Chrome, Firefox, Edge). Cross-platform testing (Windows, macOS, iOS, Android). |

---

## 2. Core Engineering Pillars

### A. Clean Architecture & Strict TypeScript Contracts
- **Strict Composition API**: Standardize exclusively on SFC with `<script setup lang="ts">`. Untyped JS modules are forbidden.
- **Typed Prop & Emit Contracts**: Use `defineProps<{...}>()` and `defineEmits<{...}>()`. Never use loose untyped prop arrays.
- **Domain Composables**: Extract all stateful business workflows into dedicated composables returning readonly state, typed handlers, and deterministic lifecycle disposal (`onScopeDispose`).
- **Encapsulated Pinia Stores**: Use Setup Store syntax `defineStore('id', () => { ... })` with explicit TypeScript DTO interfaces. Keep short-lived access tokens strictly in RAM with silent rotation via HttpOnly cookies.

### B. Mandatory Radix Vue for Interactive UI Primitives

**All accessibility-critical interactive components MUST be built on [Radix Vue](https://www.radix-vue.com/) primitives.** Custom implementations of these components are forbidden — they invariably fail on edge-case keyboard navigation, screen reader announcements, and focus trapping.

| UI Primitive | Radix Vue Component | Use Instead Of |
| :--- | :--- | :--- |
| **Modal / Dialog** | `DialogRoot`, `DialogPortal`, `DialogOverlay`, `DialogContent` | Custom `<Teleport>` + `v-if` modal wrappers |
| **Popover** | `PopoverRoot`, `PopoverTrigger`, `PopoverContent` | Custom `v-if` + `position: absolute` tooltips |
| **Dropdown Menu** | `DropdownMenuRoot`, `DropdownMenuTrigger`, `DropdownMenuContent` | Custom `<ul>` with `@click.outside` |
| **Select** | `SelectRoot`, `SelectTrigger`, `SelectContent`, `SelectItem` | Custom `<div>` dropdowns with `role="listbox"` |
| **Tooltip** | `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`, `TooltipContent` | `title` attributes or custom hover divs |
| **Accordion** | `AccordionRoot`, `AccordionItem`, `AccordionTrigger`, `AccordionContent` | Custom `v-if` toggle sections |
| **Tabs** | `TabsRoot`, `TabsList`, `TabsTrigger`, `TabsContent` | Custom `<button>` + `v-if` panel switching |
| **Alert Dialog** | `AlertDialogRoot`, `AlertDialogAction`, `AlertDialogCancel` | `window.confirm()` or custom confirm modals |

#### Radix Vue Integration Rules:
1. **Unstyled by default** — Radix Vue provides behavior and accessibility, you provide all CSS styling.
2. **Composition pattern** — Use Radix Vue's slot-based composition, never override internal DOM structure.
3. **Focus management** — Radix Vue handles focus trapping in dialogs, focus return on close, and arrow-key navigation in menus automatically. Do NOT manually manage focus for these primitives.
4. **Animation** — Use Vue's `<Transition>` or CSS animations on Radix content components. Radix provides `data-state="open|closed"` attributes for animation hooks.
5. **Portal rendering** — Use Radix's built-in portal components (`DialogPortal`, `PopoverPortal`) instead of raw `<Teleport to="body">`.

### C. Mandatory Cross-Platform Engineering (iOS, Android, macOS, Windows)

Every component and layout MUST be validated against all four target platforms. This is not optional.

| Platform | Core Challenge & Bug Risk | Mandatory Solution |
| :--- | :--- | :--- |
| **iPhone / iOS** (WebKit) | • Expanding Safari toolbars break `100vh`<br>• Notches & home indicators overlap buttons<br>• Input focus triggers disruptive auto-zoom<br>• Momentum scroll freezes on `overflow: hidden`<br>• Grey tap overlay boxes | • Use `100dvh` (with `100vh` fallback)<br>• Apply `env(safe-area-inset-*)` & `viewport-fit=cover`<br>• Enforce input `font-size: 16px`<br>• Rely on Radix Vue native scroll locking<br>• Add `-webkit-tap-highlight-color: transparent` |
| **Android** (Blink / Chrome) | • 300ms double-tap gesture latency<br>• Hardware/gesture back exits app instead of closing modal<br>• Unwanted pull-to-refresh on dialog scroll<br>• Backdrop flex-sibling render flash (16–50ms) | • Apply `touch-action: manipulation`<br>• Use `useAndroidBackModalSync` via `popstate`<br>• Apply `overscroll-behavior-y: contain`<br>• Decouple backdrop & dialog into distinct fixed layers |
| **macOS** (Safari / Chrome) | • Blurry font rendering on Retina<br>• Power-user shortcut confusion (Cmd vs Ctrl)<br>• Two-finger swipe triggers browser history | • Add `-webkit-font-smoothing: antialiased`<br>• Bind `event.metaKey` (⌘) vs `event.ctrlKey`<br>• Isolate slider touch actions (`touch-action: pan-y`) |
| **Windows** (Edge / Chrome) | • Physical scrollbars cause layout shifts (CLS)<br>• Ugly default system scrollbars<br>• Unreadable UI in High Contrast Mode<br>• Touch-screen laptops trigger sticky hover bugs | • Enforce `scrollbar-gutter: stable` on root wrappers<br>• Custom sleek styling (`scrollbar-width: thin`)<br>• Support `@media (forced-colors: active)`<br>• Isolate hover via `@media (hover: hover) and (pointer: fine)` |

### D. Mandatory Cross-Browser Compatibility

**Target browser matrix** (minimum supported versions):

| Browser | Engine | Min Version | Key Quirks to Guard Against |
| :--- | :--- | :--- | :--- |
| **Safari** | WebKit | 16+ | No `scrollbar-gutter`, `100dvh` support varies by minor version, `backdrop-filter` requires `-webkit-` prefix, `gap` in flexbox only from 14.1+ |
| **Chrome** | Blink | 100+ | Stable baseline; watch for experimental CSS containment changes |
| **Firefox** | Gecko | 115+ | `scrollbar-width: thin` supported; no `-webkit-backdrop-filter`; use standard `backdrop-filter` with `@supports` |
| **Edge** | Blink | 100+ | Mirrors Chrome behavior; test Windows High Contrast Mode via Edge DevTools |

#### Cross-Browser Rules:
1. **`@supports` guards**: Always use `@supports (backdrop-filter: blur(1px))` for glassmorphic surfaces. Provide opaque fallback.
2. **Vendor prefixes**: Apply `-webkit-backdrop-filter` alongside `backdrop-filter`. Apply `-webkit-font-smoothing` for Safari/Chrome.
3. **Scrollbar strategy**: Use `scrollbar-width: thin` (Firefox standard) AND `::-webkit-scrollbar` (Chrome/Safari/Edge) for complete coverage.
4. **CSS feature detection**: Never assume a CSS property exists. Use progressive enhancement with fallbacks.
5. **Testing obligation**: Interactive components must be manually verified in Safari, Chrome, and Firefox before marking complete.

### E. Security-by-Design & Robustness
- **DOM XSS Defense**: Never pass unescaped user strings to `v-html`. Always use `DOMPurify.sanitize()`. Prefer text interpolation `{{ content }}`.
- **Protocol Whitelisting**: Sanitize dynamic `:href` and `:src` bindings against `javascript:` and `data:` schemes.
- **Defensive Number Coercion**: Never invoke `.toFixed()` on raw API values without explicit numeric casting (`Number(val ?? 0).toFixed(2)`).
- **Division-by-Zero Defense**: Guard all percentages and ratios (`den <= 0 ? 0 : (num / den) * 100`).

---

## 3. Step-by-Step Workflow (Plan -> Contract -> Implement -> Audit)

```markdown
- [ ] 1. Architecture & Typed Contracts
      - Define TypeScript interfaces for props, emits, and domain DTO models.
      - Ensure components use <script setup lang="ts"> and stores use typed Pinia.
      - Identify which interactive primitives require Radix Vue (Dialog, Popover, Select, etc.).
- [ ] 2. Radix Vue Primitive Integration
      - Install radix-vue. Import required primitives.
      - Compose Radix components with custom styling (unstyled-first approach).
      - Verify focus trap, keyboard navigation, and screen reader announcements.
- [ ] 3. Cross-Platform Layout & Styling
      - Apply 100dvh, safe area insets (env(safe-area-inset-*)), and scrollbar-gutter: stable.
      - Enforce font-size >= 16px on inputs and touch-action: manipulation on buttons.
      - Isolate hover lifts behind @media (hover: hover) and (pointer: fine).
      - Test on iOS Safari, Android Chrome, macOS Safari, Windows Edge.
- [ ] 4. Cross-Browser Verification
      - Verify @supports fallbacks for backdrop-filter and scrollbar styling.
      - Test in Safari 16+, Chrome 100+, Firefox 115+, Edge 100+.
- [ ] 5. Security Hardening & Zero-Trust Checks
      - Verify all v-html uses DOMPurify; sanitize dynamic href links.
      - Check numeric conversions and divide-by-zero guards.
- [ ] 6. Automated Audit Verification
      - Run Vue audit tool: node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path src/ --strict
```

---

## 4. Automated Vue Quality Verification

Run the built-in auditor across components to verify security, TypeScript, accessibility, Radix Vue usage, and cross-platform safety:

```bash
node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path src/ --strict
```

---

## 5. Supporting Resources & Examples

- **Radix Vue Dialog Example**: [radix-dialog-example.vue](./examples/radix-dialog-example.vue) — Production dialog built on Radix Vue `DialogRoot` with native scroll lock, safe-area insets, Android back sync, and `@supports` backdrop-filter fallback.
- **Platform Adaptation Composable**: [usePlatformAdaptation.ts](./examples/usePlatformAdaptation.ts) — TypeScript composable for OS detection, visual viewport tracking, shortcut formatting (⌘ vs Ctrl), and Android back-button modal sync.
- **Safe Form Validation Composable**: [useSafeFormValidation.ts](./examples/useSafeFormValidation.ts) — Type-safe form validation with XSS sanitization and WAI-ARIA helpers.
- **Secure Pinia Auth Store**: [secure-auth-store.ts](./examples/secure-auth-store.ts) — In-memory access token storage, HttpOnly silent refresh, and XSS isolation.
- **Cross-Platform & Browser Guide**: [cross-platform-browser-guide.md](./references/cross-platform-browser-guide.md) — Deep architectural guide on iOS, Android, Mac, Windows viewport quirks and Safari/Chrome/Firefox/Edge compatibility matrices.
- **Vue Security & Compatibility Checklist**: [vue-security-compat-checklist.md](./resources/vue-security-compat-checklist.md) — Actionable audit checklist covering DOM XSS, Radix Vue validation, cross-platform device matrix, and cross-browser compatibility checks.
- **Vue Audit CLI Script**: [vue-audit-tool.mjs](./scripts/vue-audit-tool.mjs) — Node.js CLI auditor inspecting SFCs for XSS, raw 100vh, input zoom bugs, TypeScript usage, and missing Radix Vue primitives.
