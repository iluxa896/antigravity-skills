---
name: developing-vue-frontend
description: >-
  Assists with modern Vue 3 frontend development, creating high-converting selling designs,
  modern UI/UX aesthetics, and ultra-secure enterprise-grade Vue applications. Enforces Composition
  API, TypeScript, Pinia state management, DOM XSS prevention, Vue Router guards, performance
  optimization, and accessibility. Use when building, styling, or refactoring Vue components,
  designing high-converting landing pages/dashboards, or auditing Vue frontend code.
---

# Developing High-Converting & Secure Vue 3 Applications (Master Skill)

## When to use this skill
- Building or refactoring Vue 3 components, views, layouts, or composables (`<script setup lang="ts">`).
- Designing high-converting landing pages, SaaS dashboards, pricing tables, checkout steps, or interactive interfaces.
- Hardening Vue 3 frontend code against DOM XSS, prototype pollution, state leaks, and unauthorized route access.
- Implementing state management with Pinia setup stores, custom composables, or router navigation guards.
- Optimizing Vue rendering performance, lazy loading, bundle size, and WCAG 2.1 AA accessibility.
- Running the Vue component audit tool (`scripts/vue-audit-tool.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Visual UI/UX & Layout Aesthetics | Selecting color palettes, typography scales, glassmorphic overlays, ambient glow accents, and micro-interaction curves. |
| **Medium Freedom** | Component Structure & State Architecture | Structuring Pinia stores, designing composable APIs, defining Vue Router transitions, and chunking route lazy loads. |
| **Low Freedom** | Security, Typings & Accessibility | Mandatory `DOMPurify.sanitize()` on all `v-html`, typed `defineProps<{...}>()`, navigation auth guards, WAI-ARIA form bindings, zero sensitive tokens in `localStorage`. |

---

## 2. Core Engineering Pillars

### A. High-Converting & Non-Standard Selling Design (UI/UX)
- **Visual Distinction & Wow Factor**:
  - Avoid flat, generic templates. Use layered depth: subtle multi-tier box shadows, dynamic ambient glow effects (`box-shadow: 0 0 40px rgba(99, 102, 241, 0.15)`), and glassmorphic overlays (`backdrop-filter: blur(12px)`).
  - Use custom curated color palettes: Dark mode slate/zinc (`#090d16`, `#0f172a`), accented with electric violet, emerald, or warm amber highlights.
  - Implement fluid micro-interactions: Smooth hover lifts (`transform: translateY(-2px)`), button click ripples/press scale (`active:scale-[0.98]`), and interactive state badges.
- **Conversion-Optimized Hierarchy**:
  - **Focal Points**: High-contrast, magnetic Primary Call-to-Actions (CTAs) with gradient accents, pulsating badges ("Most Popular", "Live Demo"), and clear value propositions above the fold.
  - **Social Proof & Urgency**: Dynamic rating badges, customer proof counters, and interactive feature comparison matrices.
  - **Frictionless Form UX**: Floating labels, inline real-time validation, readable error microcopy, and auto-focus states.

### B. Comprehensive Frontend Security
- **DOM XSS Prevention**:
  - **Never** bind untrusted user input directly to `v-html`.
  - Always sanitize rich text content using `DOMPurify.sanitize()` before passing to `v-html`.
  - Prefer Vue template interpolation `{{ userContent }}` which automatically escapes HTML entities.
- **Safe Dynamic Content & Attributes**:
  - Sanitize URLs bound to `href` and `src` attributes against `javascript:` and `data:` schemes.
  - Validate and sanitize external redirect parameters in `vue-router` to prevent Open Redirect attacks.
- **Secure State & Token Management**:
  - Never store sensitive JWT access tokens in unencrypted `localStorage` or `sessionStorage` (vulnerable to XSS extraction).
  - Prefer HTTP-only, `SameSite=Strict`, Secure cookies handled by the backend, or in-memory Pinia storage synchronized with silent refresh rotation.
- **Content Security Policy (CSP)**:
  - Do not use runtime template compilation with `eval()` or `new Function()`.
  - Use strict build-time pre-compiled templates with Vite (`@vitejs/plugin-vue`).

### C. Modern Vue 3 Composition API & TypeScript Standards
- **Component Architecture**:
  - Standardize on Single File Components (SFC) with `<script setup lang="ts">`.
  - Use generic and typed `defineProps<{ ... }>()` and `defineEmits<{ ... }>()`.
  - Extract reusable stateful logic into type-safe composables (`useSafeFormValidation()`, `useAuth()`).
- **State Management (Pinia)**:
  - Use Setup Store syntax `defineStore('id', () => { ... })` for cleaner TypeScript inference and composable integration.
  - Keep stores single-responsibility; isolate domain state from transient UI state.
- **Performance & Code Splitting**:
  - Implement async route-level code splitting using dynamic imports: `component: () => import('@/views/DashboardView.vue')`.
  - Use `v-memo` or `<KeepAlive>` for expensive dynamic component re-renders.

---

## 3. Workflow: Plan -> Design -> Secure -> Validate

```markdown
- [ ] 1. Architecture & Layout Plan
      - Define component hierarchy and typed contracts (props, emits, DTO models).
      - Select design tokens (color palette, typography scale, responsive breakpoints).
- [ ] 2. High-Impact UI/UX Implementation
      - Implement semantic markup with accessible ARIA tags.
      - Add glassmorphism, micro-animations, and high-conversion CTA elements.
- [ ] 3. Security Hardening
      - Audit all v-html, dynamic bindings, URLs, and router parameters.
      - Ensure sanitized inputs and safe token/session storage in Pinia.
- [ ] 4. Automated Verification & Testing
      - Run Vue audit tool: node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs
      - Check TypeScript compilation (vue-tsc --noEmit or tsc).
      - Verify responsive layouts on Mobile (375px), Tablet (768px), and Desktop (1440px+).
```

---

## 4. Automated Vue Quality Verification

Run the built-in Vue auditor to inspect components for DOM XSS, insecure URLs, and accessibility:

```bash
node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path src/
```

---

## 5. Supporting Resources & Examples

- **Vue Audit Tool Script**: [vue-audit-tool.mjs](./scripts/vue-audit-tool.mjs) - Node.js CLI script auditing Vue SFCs for XSS, insecure links, and missing accessibility attributes.
- **High-Converting Selling Card**: [high-converting-selling-card.vue](./examples/high-converting-selling-card.vue) - Production-ready Vue 3 SFC with glassmorphism, animated CTA, and typed TypeScript props.
- **Safe Form Validation Composable**: [useSafeFormValidation.ts](./examples/useSafeFormValidation.ts) - Type-safe Vue 3 composable with real-time validation, XSS sanitization, and ARIA state bindings.
- **Secure Pinia Auth Store**: [secure-auth-store.ts](./examples/secure-auth-store.ts) - In-memory JWT access token management, silent refresh, and XSS-safe state isolation.
- **High-Converting UI Reference**: [high-converting-ui-patterns.md](./references/high-converting-ui-patterns.md) - Design tokens, conversion psychology, micro-interaction timing, and WCAG AA guidelines.
- **Vue Security & UX Checklist**: [vue-security-ux-checklist.md](./resources/vue-security-ux-checklist.md) - Actionable checklist for DOM XSS, routing guards, and CRO UI patterns.
