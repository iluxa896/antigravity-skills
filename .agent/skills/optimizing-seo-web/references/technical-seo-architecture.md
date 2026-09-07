# Technical SEO Architecture, Indexation & Core Web Vitals

This architectural guide documents search engine crawler pipelines, rendering mechanics (SPA vs SSR), crawl budget engineering, and Core Web Vitals optimization.

---

## 1. Search Engine Crawler & Rendering Pipelines

Googlebot processes web pages in two distinct phases:
1. **Crawl & HTTP Response Phase**: The crawler requests the raw HTML. If content relies on client-side JS to render links and text, the initial indexing pass sees an empty page.
2. **Web Rendering Service (WRS)**: The page enters a render queue where a headless Chromium instance executes JavaScript. This can delay indexation by days or weeks.

### Recommended Architectural Fixes:
- **SSR (Server-Side Rendering)**: Render initial HTML on the server (Nuxt 3, Next.js, Nitro).
- **Dynamic Prerendering / Hydration**: If using an SPA (Vue/React), detect search bot user agents (`Googlebot`, `Bingbot`, `YandexBot`) and serve pre-rendered static HTML via Prerender.io or server-side headless Chrome.

---

## 2. Core Web Vitals (CWV) Engineering Guidelines

Google uses Core Web Vitals as a page experience ranking factor:

| Metric | Threshold | Key Optimization Tactics |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | `< 2.5s` | Preload hero image (`<link rel="preload" as="image">`), server-side TTFB `< 600ms`, WebP/AVIF formats. |
| **INP** (Interaction to Next Paint) | `< 200ms` | Break up long tasks (>50ms) using `scheduler.yield()` or `requestAnimationFrame`, avoid synchronous blocking loops. |
| **CLS** (Cumulative Layout Shift) | `< 0.1` | Specify explicit `width` and `height` on all `<img>` and `<video>` tags, reserve layout space for dynamic ads/banners. |

---

## 3. Crawl Budget Management for Faceted Navigation

E-commerce filter variations (e.g. `?color=red&size=m&sort=price_asc`) can generate millions of duplicate URLs that exhaust crawl budgets.

### Defense Rules:
1. **Canonicalization**: Always add self-referencing canonical URLs or point parameterized filter pages back to the root category page:
   ```html
   <link rel="canonical" href="https://example.com/shoes/running">
   ```
2. **Robots Disallow / Noindex**:
   ```text
   # robots.txt
   Disallow: /*?*sort=
   Disallow: /*?*filter=
   ```
3. **Internal Links**: Never use dynamic session IDs in URLs (`?session_id=...`).

---

## 4. Internationalization (`hreflang`) Architecture

For multi-regional and multi-language applications:
```html
<link rel="alternate" hreflang="en-us" href="https://example.com/us/page" />
<link rel="alternate" hreflang="en-gb" href="https://example.com/uk/page" />
<link rel="alternate" hreflang="ru" href="https://example.com/ru/page" />
<link rel="alternate" hreflang="x-default" href="https://example.com/page" />
```
Every localized page must include bidirectional reciprocal links back to all regional variants.
