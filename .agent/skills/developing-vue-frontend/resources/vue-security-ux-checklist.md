# Vue 3 Security & High-Converting UX Checklist

This checklist provides a senior developer reference for building high-converting, resilient, and enterprise-secure Vue 3 applications.

---

## Part 1: Vue 3 Security Hardening Checklist

### 1. DOM XSS Protection
- [ ] **Sanitize `v-html`**: Never pass unescaped user-supplied HTML to `v-html`. Use `DOMPurify.sanitize(input)`.
- [ ] **Strict URL Validation**: Validate dynamic `:href`, `:src`, and `iframe` URLs. Deny `javascript:` and `data:text/html` schemes.
- [ ] **Template Injection Defense**: Never use runtime template compilation (`Vue.compile()`, `new Function()`, `eval()`). Always compile templates at build-time via Vite.
- [ ] **Safe Third-Party Integrations**: Wrap Markdown, syntax highlighters, and rich-text editors (Quill, TipTap) in strict HTML sanitizers before rendering.

### 2. Authentication & State Protection
- [ ] **No Tokens in LocalStorage**: Avoid storing sensitive JWT access tokens in `localStorage` or `sessionStorage` (prevent XSS exfiltration).
- [ ] **In-Memory + Silent Refresh**: Store short-lived access tokens in Pinia memory; rotate via HTTP-Only, SameSite=Strict cookies.
- [ ] **Sensitive State Cleanup**: Automatically clear user profile, cached queries, and form drafts in Pinia when user logs out.
- [ ] **Defense Against Prototype Pollution**: Freeze or deeply clone external JSON payloads before mutating global reactive state.

### 3. Routing & Navigation Guards
- [ ] **Server-Side Authorization**: Treat Vue Router client guards as UX navigation aids only. Enforce authorization checks on backend API endpoints.
- [ ] **Open Redirect Prevention**: Validate redirect query parameters (`/login?redirect=/dashboard`) to ensure target URL is a relative internal path starting with `/` (and not `//` or external domains).
- [ ] **Lazy-Loaded Route Chunks**: Ensure sensitive admin modules are isolated into separate chunks via dynamic imports to avoid exposing internal admin component code to unauthenticated visitors.

---

## Part 2: High-Converting Selling UI/UX Checklist

### 1. Visual Hierarchy & Aesthetic Impact
- [ ] **Magnetic Above-The-Fold**: Clear value proposition (H1), concise sub-headline explaining the transformation, high-contrast primary CTA, and trust social proof badge.
- [ ] **Layered Depth & Glassmorphism**: Use translucent glass backgrounds (`backdrop-filter: blur(12px)`), subtle borders (`1px solid rgba(255,255,255,0.08)`), and colored ambient drop-shadows.
- [ ] **Refined Micro-Interactions**: Hover elevation, subtle button press physics (`transform: scale(0.98)`), loading spinners on submit, and smooth accordion transitions.
- [ ] **Modern Typography**: Pair high-impact display sans-serif (Inter, Plus Jakarta Sans, Outfit) with consistent vertical rhythm.

### 2. Conversion Friction Eliminators
- [ ] **Interactive Pricing Toggles**: Smooth monthly/yearly billing switches with clear discount badges (e.g., "Save 20%").
- [ ] **Risk Reversal Indicators**: Place "30-Day Money-Back Guarantee", "No Credit Card Required", or "Cancel Anytime" directly underneath key CTA buttons.
- [ ] **Inline Form Validation**: Immediate feedback on blur, green checkmarks on valid inputs, clear and human error messages.
- [ ] **Mobile-First Responsive Layout**: Single column flow on mobile, sticky CTA bar on scroll for mobile users, touch target sizes at least 44x44px.

---

## Part 3: Vue 3 Code Quality & Best Practices
- [ ] Enforce `<script setup lang="ts">` across all Single File Components.
- [ ] Typed props with `defineProps<{ ... }>()` and emits with `defineEmits<{ ... }>()`.
- [ ] Clean separation of concerns: Extract complex business workflows to Composables (`useCheckout()`, `useAnalytics()`).
- [ ] Zero lint/type errors (`vue-tsc --noEmit`).
- [ ] Accessibility: Proper ARIA roles, `aria-expanded`, keyboard navigation (`Enter` / `Space` triggers), and color contrast ratios exceeding 4.5:1 (WCAG AA).
