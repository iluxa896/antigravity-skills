# Project Rules & Standards

## Coding Standards & Clean Architecture
- **PHP Standards**: All PHP code must adhere to PSR-12 or PSR-PER. Explicit native PHP 8.1+ type declarations (parameter types, return types, property types) are strictly mandatory. Do not enforce runtime `declare(strict_types=1);` per repository conventions.
- **Frontend & TypeScript Standards**: All Vue components must use `<script setup lang="ts">`. All composables, stores, helpers, and DTO contracts must be authored in strictly typed TypeScript (`.ts`). Prohibit loose `any` types and untyped JavaScript files in new/refactored modules.
- **Layered Architecture & Separation of Concerns**: Controllers, route handlers, and UI templates must remain thin. Core business logic, validation, and data mutations must live in dedicated Domain Services, Action classes, Form Requests, or Pinia stores.
- **Data Integrity & Safety**: Multi-step database mutations must be wrapped in atomic transactions with automatic rollback. Never use raw SQL string concatenation; enforce parameter binding everywhere.

## Cross-Platform Engineering Directives (iOS, Android, Mac, Windows)
- **iOS / iPhone (WebKit)**:
  - Use dynamic viewport units (`100dvh`, `min-h-[100dvh]`) instead of static `100vh` to accommodate expanding/collapsing Safari toolbars.
  - Support safe area insets via `env(safe-area-inset-top/bottom/left/right)` and `viewport-fit=cover`.
  - Prevent disruptive iOS auto-zoom on input focus by setting input `font-size: 16px` (or Tailwind `text-base`).
  - Disable default grey tap overlays using `-webkit-tap-highlight-color: transparent`.
  - Employ resilient scroll-locking (`useBodyScrollLock`) to prevent WebKit momentum-scroll compositor deadlocks and tile freezes.
- **Android (Chrome, Samsung Internet, Blink)**:
  - Remove 300ms double-tap latency by applying `touch-action: manipulation` to all buttons and interactive cards.
  - Handle hardware and gesture back navigation via browser history (`popstate`) so pressing back dismisses open overlays rather than navigating away from the page.
  - Prevent unintended browser pull-to-refresh on scrollable overlays via `overscroll-behavior-y: contain`.
  - Decouple modal backdrops from dialog flex-containers to prevent the Chromium 16–50ms flex-calculation visual flash.
- **Mac (macOS Safari & Chrome)**:
  - Apply clean font smoothing: `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;`.
  - Synchronize UI theme with system appearance via `prefers-color-scheme`.
  - Cleanly differentiate between `event.metaKey` (Command ⌘) and `event.ctrlKey` (Ctrl) for keyboard shortcuts.
- **Windows (Edge, Chrome, Firefox)**:
  - Enforce `scrollbar-gutter: stable` to eliminate horizontal layout shifts when scrollbars toggle or modals open.
  - Provide modern slim scrollbars (`scrollbar-width: thin; scrollbar-color: ...`).
  - Guarantee full readability in Windows High Contrast Mode using `@media (forced-colors: active)`.
  - Isolate hover states using `@media (hover: hover) and (pointer: fine)` to avoid sticky hover bugs on touch-screen laptops and tablets.

## Skill Architecture & Progressive Disclosure
- **Directory Structure**: Every skill must live under `.agent/skills/<skill-name>/` with a root `SKILL.md`.
- **Non-Bloated Runbooks**: Keep `SKILL.md` lean, punchy, and operational (<200–350 lines). Delegate detailed guides to `references/`, actionable checklists to `resources/`, and concrete code to `examples/`.
- **Zero Placeholders**: Reference code in `examples/` must be 100% complete, enterprise-grade, and free of `// TODO` or `...` shortcuts.
- **Forward Slashes**: Always use forward slashes `/` for all file and directory paths.

## Verification & Safety Directives
- Run `node .agent/skills/creating-agent-skills/scripts/validate-skills.mjs` before concluding skill updates.
- Run `php .agent/skills/developing-php-backend/scripts/php-lint.php` on all modified PHP files.
- Run `node .agent/skills/developing-vue-frontend/scripts/vue-audit-tool.mjs` on Vue components.
- Ensure all CLI scripts provide `--help`, handle errors gracefully, and exit with deterministic status codes (`0` or `1`).

