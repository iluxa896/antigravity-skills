---
name: optimizing-seo-web
description: >-
  Guides technical SEO, search engine indexation, structured data, semantic HTML, and Core Web
  Vitals optimization across SPA, SSR, and SSG architectures. Enforces JSON-LD schemas,
  OpenGraph/Twitter meta tags, robots.txt, dynamic sitemaps, canonicalization, and crawl budget
  management. Use when auditing SEO, optimizing pages for Google/Bing indexing, implementing
  schema markup, improving Core Web Vitals, or fixing crawlability and rendering issues.
---

# Optimizing SEO & Web Indexation

## When to use this skill
- Auditing or designing site structure, URL hierarchy, internal linking, and semantic HTML5.
- Implementing JSON-LD structured data: Product, Article, FAQ, BreadcrumbList, Organization.
- Configuring `robots.txt`, XML sitemaps, canonical URLs, and `hreflang` tags.
- Troubleshooting indexing issues: CSR pitfalls, crawl budget waste, duplicate content, soft 404s.
- Optimizing Core Web Vitals: LCP < 2.5s, INP < 200ms, CLS < 0.1, TTFB < 800ms.

---

## 1. Architectural Paradigms (Server-First vs Client-First)

Before implementing SEO tags or structured data, explicitly determine the application architecture:

| Aspect | Archetype A: Server-First Monolith (Inertia.js / Laravel / Rails) | Archetype B: Standalone SPA / SSG (Nuxt / Next / Vite) |
| :--- | :--- | :--- |
| **Single Source of Truth** | Server-side template (`app.blade.php`). Fully rendered in the initial raw HTTP response. | Client / SSR head composables (`useHead`, `unhead`, `next/head`). |
| **JSON-LD Structured Data** | Built and rendered on the server (e.g. `SeoSchemaBuilder` in PHP). Zero client JS bundle overhead. | Built in client/SSR composables via TypeScript helpers (`json-ld-schemas.ts`). |
| **Social Previews (OpenGraph)** | Server-rendered in raw HTML. Guarantees instant previews in Telegram, VK, WhatsApp, Twitter. | Server-Side Rendered (SSR) or pre-rendered via Edge functions. |
| **Client Component Role** | Vue `<Head>` updates strictly the dynamic browser tab title, description, and canonical URL on SPA navigation. | Component manages both meta tags and dynamic structured data insertion. |
| **Anti-Pattern Warning** | **DO NOT** duplicate JSON-LD schema builders inside Vue components in an Inertia app (DRY violation & bundle bloat). | **DO NOT** rely on client-only JS rendering if social/search bots do not execute JavaScript. |

---

## 2. Core Technical SEO Principles

### Semantic HTML Architecture
- **Single `<h1>`**: Exactly one per page, reflecting primary search intent. Logical `h2 → h3 → h4` cascade, no skips.
- **Semantic Tags**: `<main>`, `<article>`, `<section>`, `<nav>`, `<aside>`, `<header>`, `<footer>` — eliminate unnecessary `<div>` soup.
- **Crawlable Hyperlinks**: Use standard `<a href="...">` with descriptive anchor text. Never use `<button @click="navigate()">` for navigation (search spiders cannot follow JavaScript click events).
- **Images**: Meaningful `alt` on informative images, `alt=""` on decorative graphics. Explicit `width`/`height` (prevent CLS). Use modern formats (`.webp`/`.avif`) + native `loading="lazy"`.

### JSON-LD Structured Data
Embed via `<script type="application/ld+json">`. Core schemas:
- **Organization / WebSite**: brand entity, logo, `searchAction` template.
- **BreadcrumbList**: hierarchical navigation path matching site breadcrumbs.
- **Product / Offer**: name, SKU, price, currency, availability (`InStock`/`OutOfStock`), ratings.
- **Article / BlogPosting**: headline, author, `datePublished`, `dateModified`, image.
- **FAQPage**: Question/Answer pairs for rich search snippet expansion.

### Meta Tags & Social Previews
- **Title Tag**: 50–60 characters. Format: `Primary Keyword – Benefit | Brand`.
- **Meta Description**: 120–155 characters, clear value proposition and call-to-action.
- **Canonical URL**: `<link rel="canonical" href="https://example.com/clean-path">` on every crawlable page to prevent duplicate content penalties.
- **OpenGraph**: `og:title`, `og:description`, `og:image` (1200×630px raster, <300 KB), `og:url`, `og:type`.
- **X (Twitter)**: `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.

---

## 3. Core Web Vitals Optimization

| Metric | Target Threshold | Primary Engineering Levers |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | $< 2.5\text{s}$ | Preload hero banner (`<link rel="preload" as="image">`), optimize TTFB via server caching, serve WebP/AVIF. |
| **INP** (Interaction to Next Paint) | $< 200\text{ms}$ | Offload heavy processing (e.g. image compression) to Web Workers, break long main-thread JS tasks ($> 50\text{ms}$). |
| **CLS** (Cumulative Layout Shift) | $< 0.1$ | Explicit `width`/`height` on images and media containers, `scrollbar-gutter: stable`, reserve space for dynamic widgets. |

---

## 4. Audit Workflow

```
1. Crawlability & Rendering
   – Verify robots.txt does NOT block CSS/JS assets or crawlable catalog routes.
   – Ensure HTTP 200 for valid pages, HTTP 404/410 for deleted content, 301 for canonical redirects.
   – Check initial raw HTML response: critical content, H1, meta tags, and JSON-LD must be present.

2. On-Page & Semantic Linting
   – node .agent/skills/optimizing-seo-web/scripts/seo-audit-linter.mjs --path resources/
   – Verify single H1, heading cascade, alt tags, canonical URLs, and OpenGraph dimensions.

3. Structured Data Validation
   – Validate server-rendered JSON-LD using Google Rich Results Test / Schema Validator.
   – Verify BreadcrumbList, Product, and WebSite schemas adhere strictly to Schema.org standards.
```

---

## 5. Reference Files

- **SEO Linter Script**: [seo-audit-linter.mjs](./scripts/seo-audit-linter.mjs) — inspects HTML, Vue, and Blade templates for headings, alt tags, canonicals, and meta tags.
- **JSON-LD Schema Helpers (SPA/Client)**: [json-ld-schemas.ts](./examples/json-ld-schemas.ts) — TypeScript builders for Schema.org structures (Archetype B).
- **Robots & Sitemap Generator**: [robots-and-sitemap-generator.js](./examples/robots-and-sitemap-generator.js) — zero-dependency sitemap and robots.txt generator.
- **SEO Architecture Guide**: [technical-seo-architecture.md](./references/technical-seo-architecture.md) — Googlebot rendering, crawl budget, and CWV deep-dive.
- **SEO Checklist**: [technical-seo-checklist.md](./resources/technical-seo-checklist.md) — actionable audit matrix and Core Web Vitals benchmarks.

