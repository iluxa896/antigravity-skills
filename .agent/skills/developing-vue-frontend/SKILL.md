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

# Developing Accessible, Resilient & Secure Vue 3 Applications (Universal Master Skill)

## When to use this skill

- Building or refactoring Vue 3 components, views, or layouts (Composition API, `<script setup>`).
- Applicable to both **Inertia.js Monoliths** (Laravel/Rails + Vue) and **Standalone SPAs** (Vite/Nuxt + REST/GraphQL).
- Creating accessible interactive primitives (dialogs, popovers, dropdowns, tooltips, tabs) using **Radix Vue**.
- Engineering cross-platform resilience across **iOS / iPhone**, **Android**, **macOS**, and **Windows**.
- Ensuring cross-browser compatibility across **Safari**, **Chrome**, **Firefox**, and **Edge**.
- Hardening frontend code against DOM XSS, prototype pollution, and insecure link protocols.
- Auditing Vue codebases via the CLI scanner (`scripts/vue-audit-tool.mjs`).

---

## 1. Architectural Archetypes (Inertia.js vs Standalone SPA)

Before designing state or auth workflows, explicitly identify the application archetype:

| Architectural Aspect | Archetype A: Inertia.js Monolith | Archetype B: Standalone Vue 3 SPA |
| :--- | :--- | :--- |
| **Routing & Navigation** | Inertia router (`router.get()`, `<Link>`). Server is the single source of truth for routes. | Vue Router (`useRouter()`, `<RouterLink>`) with client-side navigation guards. |
| **Authentication & State** | Server-side sessions (HttpOnly cookies, CSRF protection). Shared props via `usePage().props.auth`. | Pinia setup stores. In-memory access tokens with silent HttpOnly refresh. |
| **Forms & Mutations** | Inertia `useForm()` with automatic CSRF, error mapping, and validation binding. | Custom composable / VeeValidate with explicit DTO payloads and Axios/Fetch clients. |
| **Anti-Pattern Warning** | **DO NOT** add Pinia auth stores, manual JWT interceptors, or Vue Router guards to an Inertia app. | **DO NOT** attempt to use Inertia form helpers or page props in a standalone SPA. |

---

## 2. Core Senior Principles (KISS, YAGNI & Anti-Overengineering)

### A. The "Toolkit, Not Checklist" Mandate
- The examples (`examples/`), guides (`references/`), and composables provided in this skill are a **toolkit** for solving specific technical problems.
- **NEVER** treat them as a mandatory compliance checklist to be blindly forced into working code.
- Apply patterns from this skill **ONLY** when a concrete, demonstrated issue in the existing codebase requires them.
- If code is already working, readable, secure, and predictable: **leave it alone**.

### B. Respect Browser & Platform Defaults
- **Native CSS First**: Always prefer native CSS solutions (`overflow-x: auto`, `touch-pan-x`, `scroll-smooth`, `position: sticky`) over custom JavaScript recreations.
- **Event Loop Integrity**: NEVER intercept or hijack pointer events over interactive elements.
  > ⚠️ **CRITICAL TRAP — Pointer Capture on Buttons**:
  > Never call `setPointerCapture` on a container that wraps clickable elements (`<button>`, `<a>`, `<input>`).
  > Capturing the pointer reroutes `pointerup` away from child buttons, causing the browser to **swallow native click events**.
  > Standard mouse dragging should only be applied where native CSS scrolling is insufficient, and must never disrupt click propagation.
- **Virtual DOM Keys (`:key`)**:
  - **Dynamic Mutable Lists**: When an array supports additions, deletions from arbitrary indexes, reordering, or contains internal input states (e.g. form specification rows), you **MUST** provide stable unique keys (`:key="item.id"` or local client `_uid`).
  - **Static Read-Only Lists**: For static navigation or paginators (e.g. breadcrumbs, pagination links, fixed table headers), `:key="index"` is completely standard, optimal, and free of unnecessary string concatenation overhead (`${item.name}-${index}` is a cargo-cult anti-pattern).

### C. Pragmatic Abstraction
- Do not extract single-use, 3-line inline checks into multi-file abstraction layers unless reused across multiple distinct domains.
- Do not add unrequested multi-tab communication channels (`BroadcastChannel`, `localStorage` timestamp sync) unless multi-tab synchronization is a specified business requirement.

---

## 3. Radix Vue for Interactive UI Primitives

All complex accessibility-critical UI primitives **MUST** be built on [Radix Vue](https://www.radix-vue.com/) primitives. Custom DOM hacks (`<Teleport>` with manual focus traps and `z-index` wars) invariably fail on keyboard navigation and screen readers.

| UI Primitive | Radix Vue Component | Typical Usage |
| :--- | :--- | :--- |
| **Modal / Dialog** | `DialogRoot`, `DialogPortal`, `DialogOverlay`, `DialogContent` | Product quick views, edit forms, confirmations |
| **Popover** | `PopoverRoot`, `PopoverTrigger`, `PopoverContent` | Color pickers, contextual detail popups |
| **Dropdown Menu** | `DropdownMenuRoot`, `DropdownMenuTrigger`, `DropdownMenuContent` | User profile menus, table action dropdowns |
| **Select / Combobox** | `SelectRoot`, `SelectTrigger`, `SelectContent`, `SelectItem` | Custom stylized selects with keyboard navigation |
| **Tooltip** | `TooltipProvider`, `TooltipRoot`, `TooltipTrigger`, `TooltipContent` | Accessible hover tooltips with delay control |
| **Tabs** | `TabsRoot`, `TabsList`, `TabsTrigger`, `TabsContent` | Content tab switchers with ARIA keyboard selection |
| **Checkbox** | `CheckboxRoot`, `CheckboxIndicator` | Accessible tri-state or customized checkboxes |

#### Radix Vue Integration Rules:
1. **Unstyled-First**: Radix Vue provides state, focus trapping, and ARIA roles; you provide all styling via Tailwind or CSS.
2. **Use `as-child` on Triggers**: Pass `as-child` to triggers (`<DialogTrigger as-child>`, `<DropdownMenuTrigger as-child>`) to attach Radix behaviors directly to your custom buttons without wrapping extra DOM nodes.
3. **Automatic Focus Trapping**: Do not manually manage `tabindex` or call `element.focus()` inside Radix dialogs — Radix manages focus containment and restoration on close automatically.
4. **Standard Buttons & Inputs**: Simple push buttons, standard form inputs, and regular navigation links do **NOT** require Radix; use standard semantic HTML `<button>`, `<input>`, `<a>`.
5. **Reference Implementations**:
   - See `examples/radix-dialog-example.vue` for a production-ready modal dialog with backdrop blur fallback, safe areas, and Android back sync.
   - See `examples/radix-dropdown-example.vue` for an accessible user menu compatible with both Inertia and Vue Router.

---

## 4. Cross-Platform & Cross-Browser Resilience

Every user-facing interface must be resilient across all four major client environments:

| Platform / Browser | Core Bug Risk | Senior Engineering Solution |
| :--- | :--- | :--- |
| **iOS / iPhone (WebKit)** | • Expanding address bar clips `100vh`<br>• Input focus triggers disruptive auto-zoom if font $< 16\text{px}$<br>• Grey tap overlay box on taps | • Use `100dvh` (with `100vh` fallback)<br>• Set `text-[16px] sm:text-xs/sm` on all inputs/selects/textareas<br>• Add `-webkit-tap-highlight-color: transparent` |
| **Android (Blink)** | • 300ms double-tap delay on buttons<br>• Hardware/gesture back exits app instead of closing modal | • Apply `touch-action: manipulation` on buttons/links<br>• Sync open modal state with history (`popstate`) where appropriate |
| **macOS (Safari / Chrome)**| • Trackpad 2-finger horizontal swipe triggers browser history navigation<br>• Fuzzy font rendering on HiDPI | • Set `touch-action: pan-y` on carousels/sliders<br>• Add `-webkit-font-smoothing: antialiased` |
| **Windows (Edge / Firefox)**| • Layout shift (CLS) when vertical scrollbar appears<br>• High Contrast Mode accessibility | • Add `scrollbar-gutter: stable` on root scrollable wrappers<br>• Support `@media (forced-colors: active)` |

---

## 5. Frontend Security & Quality Safeguards

- **DOM XSS Defense**:
  - Never render unescaped user-supplied markup via `v-html`. If HTML rendering is strictly required, sanitize with `DOMPurify.sanitize()`.
  - Prefer standard Vue template interpolation `{{ text }}`.
- **Link Protocol Sanitization**:
  - When rendering external links with dynamic URLs from untrusted sources, verify protocol begins with `http://` or `https://` to prevent `javascript:` or `data:` URL execution.
  - Always add `target="_blank" rel="noopener noreferrer"` on external links.
- **Numeric Casting Safety**:
  - Always guard against `NaN` and `TypeError` when invoking formatting: `Number(val ?? 0).toFixed(2)`.
  - Guard division against zero: `total <= 0 ? 0 : (count / total) * 100`.

---

## 6. Verification Workflow

1. **Static Audit**: Run `node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs --path <dir>` (add `--ts` only if project uses TypeScript).
2. **Production Bundle**: Test build compilation (`npm run build` or `docker compose exec -T app npm run build`).
3. **Honest Interactive Verification**:
   - Verify interactions using real user actions (physical clicks, typing).
   - **NEVER** use programmatic JS shortcuts (`element.click()`, `dispatchEvent()`) to artificially pass an interaction test when a real user interaction fails.
