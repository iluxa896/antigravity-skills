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
| Momentum scroll freeze | `overflow: hidden` during inertia freezes WebKit compositor 3–5s | Use Radix Vue primitives (`DialogRoot`), which natively handle safe body scroll locking |
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

---

## 4. Pointer Events, Scrolling & Interaction Mechanics (Anti-Overengineering)

### A. The "Pointer Capture vs Click Target" Trap

```
   ┌─────────────────────────────────────────────────────────────┐
   │ Scroll Wrapper with setPointerCapture(e.pointerId)          │
   │                                                             │
   │   ┌───────────────────────┐     ┌───────────────────────┐   │
   │   │ <button> Child A </button> │     │ <button> Child B </button> │   │
   │   └───────────────────────┘     └───────────────────────┘   │
   └─────────────────────────────────────────────────────────────┘
           │
           ▼
  User clicks Child A:
  1. pointerdown fires on Child A, bubbles to Wrapper.
  2. Wrapper calls setPointerCapture(e.pointerId).
  3. User releases mouse (pointerup).
  4. ⚠️ BUG: Browser directs pointerup to Wrapper (the capture target), NOT Child A!
  5. Browser requires pointerdown AND pointerup on the same target to fire a "click".
  6. Result: Child A NEVER receives a native click event. The button appears completely dead!
```

#### Senior Engineering Rules for Pointer Events:
1. **Never call `setPointerCapture` over interactive children**: If a container contains clickable buttons, links, or form inputs, capturing the pointer breaks the browser's native synthetic click dispatching.
2. **Native CSS Over JS Drag**: In 95% of cases, native CSS scrolling is superior:
   ```css
   .scroll-ribbon {
     overflow-x: auto;
     overflow-y: hidden;
     touch-action: pan-x;
     -webkit-overflow-scrolling: touch;
     scrollbar-width: none; /* Hide default scrollbar if desired */
   }
   .scroll-ribbon::-webkit-scrollbar {
     display: none;
   }
   ```
   Native CSS scrolling is GPU-accelerated, respects mouse wheels, trackpad horizontal swipes, momentum touch scrolling, and NEVER interferes with child button clicks.
3. **If Desktop Mouse Drag is Strictly Required**:
   - Only trigger drag mode if cursor movement exceeds a threshold (e.g. `distance > 6px`).
   - Listen to `mousemove` on `window` without pointer capture, or set `pointer-events: none` on children only while actively dragging.
   - Suppress the subsequent click event on release ONLY if an actual drag distance occurred.

---

## 5. Virtual DOM List Rendering Keys (`:key`) Pragmatism

Do not cargo-cult linter rules about keys. Understand Vue's diffing engine:

| List Category | Example | Recommended Key | Anti-Pattern to Avoid |
| :--- | :--- | :--- | :--- |
| **Static Read-Only Lists** | Breadcrumbs, pagination bars, navigation tabs, static footer links | `:key="index"` or `:key="item.name"` | ❌ `${item.name}-${index}` (unnecessary string allocation and template pollution) |
| **Dynamic Mutable Lists** | Modifiable form rows (specifications, tags), draggable lists, items with internal input state | `:key="item.id"` or client-generated `_uid` (`crypto.randomUUID()`) | ❌ `:key="index"` (causes Vue to reuse existing DOM nodes, detaching input state on deletion/reordering) |

