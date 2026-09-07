---
name: developing-vue-frontend
description: >-
  Assists with modern Vue 3 frontend development, creating high-converting selling designs,
  cross-platform UI/UX (Android, iOS, Mac, Windows), and ultra-secure enterprise Vue applications.
  Enforces Composition API, strict TypeScript, Pinia state management, DOM XSS defense,
  viewport resilience (100dvh, safe areas, scroll locking), and accessibility. Use when building,
  styling, or refactoring Vue components, designing dashboards, or auditing frontend code.
---

# Developing High-Converting, Secure & Cross-Platform Vue 3 Applications (Master Skill)

## When to use this skill

- Building or refactoring Vue 3 components, views, or layouts using `<script setup lang="ts">`.
- Writing type-safe composables (`usePlatformAdaptation.ts`, `useSafeFormValidation.ts`, `useBodyScrollLock.ts`) or Pinia setup stores.
- Engineering cross-platform resilience across **iOS / iPhone**, **Android**, **macOS**, and **Windows**.
- Designing high-converting landing pages, SaaS dashboards, pricing cards, and modal dialogs.
- Hardening frontend code against DOM XSS, prototype pollution, token exfiltration, and open redirects.
- Auditing Vue components via the automated CLI scanner (`scripts/vue-audit-tool.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Visual UI/UX & Layout Aesthetics | Selecting color palettes, typography hierarchies, ambient glow accents, glassmorphic overlays, and micro-interaction easing curves. |
| **Medium Freedom** | Component Structure & State Architecture | Structuring Pinia stores, designing composable contracts, configuring dynamic chunking, and defining route transition animations. |
| **Low Freedom** | Security, Typings & Cross-Platform Quirks | Mandatory TypeScript (`lang="ts"`), `DOMPurify.sanitize()` on all `v-html`, dynamic viewport (`100dvh`), iOS input font-size >= 16px, `touch-action: manipulation`, zero sensitive tokens in `localStorage`. |

---

## 2. Core Engineering Pillars

### A. Clean Architecture & Strict TypeScript Contracts
- **Strict Composition API**: Standardize exclusively on Single File Components (SFC) with `<script setup lang="ts">`. Untyped JS modules are forbidden.
- **Typed Prop & Emit Contracts**: Use `defineProps<{...}>()` and `defineEmits<{...}>()`. Never use loose untyped prop arrays.
- **Domain Composables**: Extract all stateful business workflows into dedicated composables returning readonly state, typed handlers, and deterministic lifecycle disposal (`onScopeDispose`).
- **Encapsulated Pinia Stores**: Use Setup Store syntax `defineStore('id', () => { ... })` with explicit TypeScript DTO interfaces. Keep short-lived access tokens strictly in RAM (in-memory) with silent rotation via HttpOnly cookies.

### B. Deep Cross-Platform Engineering (iOS, Android, Mac, Windows)

| Platform | Core Challenge & Bug Risk | Enterprise Solution & Architecture |
| :--- | :--- | :--- |
| **iPhone / iOS** (WebKit) | • Expanding Safari toolbars break `100vh`<br>• Notches & home indicators overlap buttons<br>• Input focus triggers disruptive auto-zoom<br>• Momentum scroll freezes on `overflow: hidden`<br>• Grey tap overlay boxes | • Use `100dvh` (with `100vh` fallback)<br>• Apply `env(safe-area-inset-*)` & `viewport-fit=cover`<br>• Enforce input `font-size: 16px` (`text-base`)<br>• Use `useBodyScrollLock` (`position: fixed` offset)<br>• Add `-webkit-tap-highlight-color: transparent` |
| **Android** (Blink / Chrome) | • 300ms double-tap gesture latency<br>• Hardware/gesture back exits app instead of closing modal<br>• Unwanted pull-to-refresh on dialog scroll<br>• Backdrop flex-sibling render calculation flash (16–50ms) | • Apply `touch-action: manipulation`<br>• Use `useAndroidBackModalSync` via `popstate`<br>• Apply `overscroll-behavior-y: contain`<br>• Decouple backdrop & dialog into distinct fixed layers |
| **macOS** (Safari / Chrome) | • Blurry font rendering on Retina<br>• Power-user shortcut confusion (Cmd vs Ctrl)<br>• Two-finger swipe triggers browser history navigation | • Add `-webkit-font-smoothing: antialiased`<br>• Bind `event.metaKey` (⌘) vs `event.ctrlKey`<br>• Isolate slider touch actions (`touch-action: pan-y`) |
| **Windows** (Edge / Chrome) | • Physical scrollbars cause layout shifts (CLS)<br>• Ugly default system scrollbars<br>• Unreadable UI in High Contrast Mode<br>• Touch-screen laptops trigger sticky hover bugs | • Enforce `scrollbar-gutter: stable` on root wrappers<br>• Custom sleek styling (`scrollbar-width: thin`)<br>• Support `@media (forced-colors: active)`<br>• Isolate hover via `@media (hover: hover) and (pointer: fine)` |

### C. Security-by-Design & Robustness
- **DOM XSS Defense**: Never pass unescaped user strings to `v-html`. Always use `DOMPurify.sanitize()`. Prefer text interpolation `{{ content }}`.
- **Protocol Whitelisting**: Sanitize dynamic `:href` and `:src` bindings against `javascript:` and `data:` schemes.
- **Defensive Number Coercion**: Never invoke `.toFixed()` on raw API values without explicit numeric casting (`Number(val ?? 0).toFixed(2)`).
- **Division-by-Zero Defense**: Guard all percentages and ratios (`den <= 0 ? 0 : (num / den) * 100`).

### D. High-Converting UI/UX & Micro-Interactions
- **Magnetic Above-The-Fold**: Strong H1 headline, quantified social proof, and primary CTA within the initial viewport.
- **Layered Visual Depth**: Translucent surfaces (`backdrop-filter: blur(16px)`), subtle borders (`1px solid rgba(255,255,255,0.08)`), and ambient colored drop-shadows.
- **Touch vs Hover Separation**: Never rely on hover states for critical actions on mobile. Use distinct `:active` scaling for touch screens.

---

## 3. Step-by-Step Workflow (Plan -> Contract -> Implement -> Audit)

```markdown
- [ ] 1. Architecture & Typed Contracts
      - Define TypeScript interfaces for props, emits, and domain DTO models.
      - Ensure components use <script setup lang="ts"> and stores use typed Pinia.
- [ ] 2. Cross-Platform Layout & Styling
      - Apply 100dvh, safe area insets (env(safe-area-inset-*)), and scrollbar-gutter: stable.
      - Enforce font-size >= 16px on inputs and touch-action: manipulation on buttons.
      - Isolate hover lifts behind @media (hover: hover) and (pointer: fine).
- [ ] 3. Security Hardening & Zero-Trust Checks
      - Verify all v-html uses DOMPurify; sanitize dynamic href links.
      - Check numeric conversions and divide-by-zero guards.
- [ ] 4. Automated Audit Verification
      - Run Vue audit tool: node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path src/ --strict
```

---

## 4. Automated Vue Quality Verification

Run the built-in auditor across components to verify security, TypeScript, accessibility, and cross-platform safety:

```bash
node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path src/ --strict
```

---

## 5. Supporting Resources & Examples

- **Platform Adaptation Composable**: [usePlatformAdaptation.ts](./examples/usePlatformAdaptation.ts) - TypeScript composable for OS detection, visual viewport tracking, shortcut formatting (⌘ vs Ctrl), and Android back-button modal sync.
- **Bulletproof Modal Component**: [bulletproof-modal.vue](./examples/bulletproof-modal.vue) - Production modal with `100dvh`, safe-area insets, Android back sync, zero-deadlock WebKit scroll locking, and GPU compositing.
- **High-Converting Selling Card**: [high-converting-selling-card.vue](./examples/high-converting-selling-card.vue) - Conversion-optimized pricing card with hover isolation, touch-active physics, and high contrast support.
- **Safe Scroll Locking Composable**: [useBodyScrollLock.ts](./examples/useBodyScrollLock.ts) - Zero-deadlock WebKit momentum scroll locking with Windows `scrollbar-gutter` awareness.
- **Safe Form Validation Composable**: [useSafeFormValidation.ts](./examples/useSafeFormValidation.ts) - Type-safe form validation with XSS sanitization and WAI-ARIA helpers.
- **Secure Pinia Auth Store**: [secure-auth-store.ts](./examples/secure-auth-store.ts) - In-memory access token storage, HttpOnly silent refresh, and XSS isolation.
- **Cross-Platform UI Guide**: [high-converting-ui-patterns.md](./references/high-converting-ui-patterns.md) - Deep architectural guide on iOS, Android, Mac, and Windows viewport quirks, tokens, and motion curves.
- **Vue Security & Cross-Platform Checklist**: [vue-security-ux-checklist.md](./resources/vue-security-ux-checklist.md) - Actionable audit checklist covering DOM XSS, navigation guards, and complete OS device matrices.
- **Vue Audit CLI Script**: [vue-audit-tool.mjs](./scripts/vue-audit-tool.mjs) - Node.js CLI auditor inspecting SFCs for XSS, raw 100vh, input zoom bugs, and TypeScript usage.
