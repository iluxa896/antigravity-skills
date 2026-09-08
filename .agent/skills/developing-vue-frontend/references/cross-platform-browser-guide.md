# Cross-Platform & Cross-Browser Engineering Guide

This architectural reference provides comprehensive device-specific quirks, browser compatibility matrices, and mandatory CSS patterns for building resilient Vue 3 applications across all target platforms and browsers.

---

## 1. Cross-Platform Device Matrix

### A. iOS / iPhone & iPad (Safari — WebKit)

| Issue | Impact | Solution |
| :--- | :--- | :--- |
| `100vh` ignores toolbar | Full-height layouts get clipped by the Safari address bar | Use `100dvh` with `100vh` fallback: `height: 100vh; height: 100dvh;` |
| Notches & Dynamic Island | Content overlaps hardware cutouts | `env(safe-area-inset-*)` + `<meta name="viewport" content="viewport-fit=cover">` |
| Input zoom bug | iOS auto-zooms viewport when `font-size < 16px` on inputs | Enforce `font-size: 16px` on `<input>`, `<select>`, `<textarea>` |
| Momentum scroll freeze | `overflow: hidden` during inertia freezes WebKit compositor 3–5s | Use `useBodyScrollLock` with `position: fixed` pattern |
| Grey tap highlight | Ugly grey overlay on tapped elements | `-webkit-tap-highlight-color: transparent` |
| Virtual keyboard | Software keyboard pushes layout, overlaps fixed elements | Visual Viewport API: `window.visualViewport.height` tracking |

### B. Android (Chrome, Samsung Internet — Blink)

| Issue | Impact | Solution |
| :--- | :--- | :--- |
| 300ms tap delay | Perceptible lag on button taps | `touch-action: manipulation` on all interactive elements |
| Hardware back exits page | Gesture/back button navigates away instead of closing modal | `useAndroidBackModalSync` — push temporary `history.pushState` |
| Pull-to-refresh in modals | Scrolling inside dialogs triggers browser refresh | `overscroll-behavior-y: contain` on scrollable containers |
| Flex-sibling flash | Backdrop + dialog as flex siblings causes 16–50ms visual flash | Decouple into independent `position: fixed` layers |

### C. macOS (Safari & Chrome)

| Issue | Impact | Solution |
| :--- | :--- | :--- |
| Blurry Retina text | Subpixel antialiasing causes fuzzy text on HiDPI | `-webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;` |
| Cmd vs Ctrl confusion | Keyboard shortcuts break for Mac users | `event.metaKey` (⌘) on macOS vs `event.ctrlKey` elsewhere |
| Trackpad history swipe | Two-finger horizontal swipe triggers browser back/forward | `touch-action: pan-y` on horizontal sliders/carousels |
| Dark mode sync | System appearance not respected | `prefers-color-scheme: dark/light` media query |

### D. Windows (Edge, Chrome & Firefox)

| Issue | Impact | Solution |
| :--- | :--- | :--- |
| Physical scrollbar CLS | Scrollbars consume width, causing horizontal layout shifts | `scrollbar-gutter: stable` on scroll containers |
| Ugly system scrollbars | Default scrollbars clash with modern UI | `scrollbar-width: thin; scrollbar-color: ...` + `::-webkit-scrollbar` |
| High Contrast Mode | Colors/borders become invisible | `@media (forced-colors: active)` with system keywords |
| Touch laptop hover bugs | Touch taps leave sticky `:hover` states | `@media (hover: hover) and (pointer: fine)` for hover effects only |

---

## 2. Cross-Browser Compatibility Matrix

### Minimum Supported Versions

| Browser | Engine | Min Version | Notable Limitations |
| :--- | :--- | :--- | :--- |
| **Safari** | WebKit | 16+ | No `scrollbar-gutter`; `backdrop-filter` needs `-webkit-` prefix; `100dvh` varies by minor |
| **Chrome** | Blink | 100+ | Stable baseline for modern CSS |
| **Firefox** | Gecko | 115+ | No `-webkit-backdrop-filter`; use `@supports`; `scrollbar-width: thin` native |
| **Edge** | Blink | 100+ | Mirrors Chrome; test High Contrast Mode specifically |

### CSS Feature Compatibility

| Feature | Safari | Chrome | Firefox | Edge | Fallback Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `backdrop-filter` | ✅ (prefixed) | ✅ | ✅ (115+) | ✅ | `@supports` + opaque background |
| `100dvh` | ✅ (15.4+) | ✅ (108+) | ✅ (121+) | ✅ (108+) | Dual declaration: `height: 100vh; height: 100dvh;` |
| `scrollbar-gutter: stable` | ❌ | ✅ | ✅ (97+) | ✅ | Compensate with `padding-right` on scroll lock |
| `scrollbar-width: thin` | ❌ | ❌ | ✅ | ❌ | `::-webkit-scrollbar` for Blink/WebKit |
| `env(safe-area-inset-*)` | ✅ | ✅ | ✅ | ✅ | `max(1rem, env(safe-area-inset-*))` |
| `@media (hover: hover)` | ✅ | ✅ | ✅ | ✅ | No fallback needed |
| `@media (forced-colors)` | ❌ | ✅ | ✅ | ✅ | Only relevant on Windows; graceful no-op elsewhere |
| CSS `gap` in flexbox | ✅ (14.1+) | ✅ | ✅ | ✅ | `margin` fallback for Safari 14.0 |

---

## 3. Mandatory CSS Patterns

### @supports Backdrop Filter Guard

```css
.overlay {
  /* Opaque fallback for all browsers */
  background: rgba(15, 23, 42, 0.92);
}

@supports (backdrop-filter: blur(1px)) {
  .overlay {
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
}
```

### Dual Scrollbar Styling (Firefox + Webkit)

```css
.scrollable-container {
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}

/* Chrome, Safari, Edge */
.scrollable-container::-webkit-scrollbar {
  width: 6px;
}

.scrollable-container::-webkit-scrollbar-track {
  background: transparent;
}

.scrollable-container::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.4);
  border-radius: 3px;
}
```

### Hover Isolation for Touch/Mouse Separation

```css
/* Desktop only: mouse / trackpad */
@media (hover: hover) and (pointer: fine) {
  .card:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.25);
  }
}

/* Touch devices: active tap feedback */
@media (pointer: coarse) {
  .card:active {
    transform: scale(0.97);
  }
}
```

### Dynamic Viewport Height with Fallback

```css
.full-height-container {
  height: 100vh; /* Fallback for older browsers */
  height: 100dvh; /* iOS Safari dynamic toolbar, Chrome mobile */
}
```

### Windows High Contrast Mode

```css
@media (forced-colors: active) {
  .card {
    border: 2px solid CanvasText;
  }
  .button {
    border: 2px solid ButtonText;
  }
  .link:focus-visible {
    outline: 2px solid Highlight;
  }
}
```
