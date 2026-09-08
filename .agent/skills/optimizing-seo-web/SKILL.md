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

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Content Strategy & Link Graph | Site taxonomy, topic clusters, keyword targeting, editorial structure. |
| **Medium** | Schema Selection & Meta Copy | FAQ vs HowTo vs Article schema, meta description CTAs, sitemap priority weights. |
| **Low** | Technical Directives | Exactly one `<h1>` per page, valid Schema.org JSON-LD, canonical syntax, standard robots.txt, HTTP 200/404. |

---

## 2. Core Technical SEO Principles

### Semantic HTML Architecture
- **Single `<h1>`**: One per page, reflects primary search intent. Logical `h2 → h3 → h4` cascade, no skips.
- **Semantic tags**: `<main>`, `<article>`, `<section>`, `<nav>`, `<aside>`, `<header>`, `<footer>` — no `<div>` soup.
- **Links**: Standard `<a href="...">` with descriptive anchor text. Never `<button @click="navigate()">`.
- **Images**: Meaningful `alt` on informative images, `alt=""` on decorative. Explicit `width`/`height`. Use `.webp`/`.avif` + `loading="lazy"`.

### JSON-LD Structured Data
Embed via `<script type="application/ld+json">`. Core schemas:
- **Organization / WebSite**: brand entity, logo, `searchAction` template.
- **BreadcrumbList**: hierarchical path.
- **Article / BlogPosting**: headline, author, `datePublished`, `dateModified`, image.
- **Product / Offer**: name, SKU, price, currency, availability, `aggregateRating`.
- **FAQPage**: Question/Answer pairs for rich snippet expansion.

### Meta Tags & Social Previews
- **Title**: 50–60 chars. Format: `Primary Keyword – Benefit | Brand`.
- **Meta description**: 120–155 chars, clear CTA.
- **Canonical**: `<link rel="canonical" href="https://example.com/clean-path">` on every page.
- **OpenGraph**: `og:title`, `og:description`, `og:image` (1200×630px), `og:url`, `og:type`.
- **X (Twitter)**: `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.

---

## 3. Audit Workflow

```
[ ] 1. Crawlability & Rendering
      – robots.txt must NOT block JS/CSS assets.
      – HTTP 200 for valid pages, HTTP 404/410 for missing pages.
      – Core content and links present in initial HTML (no JS-only render for critical text).
[ ] 2. On-Page & Semantic Audit
      – node .agent/skills/optimizing-seo-web/scripts/seo-audit-linter.mjs --path public/
      – Check H1-H6 hierarchy, title/description lengths, canonical consistency, alt tags.
[ ] 3. Structured Data Validation
      – Validate JSON-LD via Google Rich Results Test.
      – Verify BreadcrumbList, Product, FAQPage, Article schema nodes.
[ ] 4. Core Web Vitals
      – LCP: preload hero image (<link rel="preload">), optimize TTFB (SSR/edge caching).
      – INP: eliminate long tasks (>50ms) on main thread, defer non-critical JS.
      – CLS: explicit width/height on all images and embeds; reserve space for dynamic widgets.
```

---

## 4. Reference Files

- **SEO Linter Script**: [seo-audit-linter.mjs](./scripts/seo-audit-linter.mjs) — inspects HTML for headings, alt tags, canonicals, meta descriptions.
- **JSON-LD Schema Helpers**: [json-ld-schemas.ts](./examples/json-ld-schemas.ts) — TypeScript builders for valid Schema.org structures.
- **Robots & Sitemap Generator**: [robots-and-sitemap-generator.js](./examples/robots-and-sitemap-generator.js) — zero-dependency Node.js script.
- **SEO Architecture Guide**: [technical-seo-architecture.md](./references/technical-seo-architecture.md) — Googlebot rendering, crawl budget, Core Web Vitals deep-dive.
- **SEO Checklist**: [technical-seo-checklist.md](./resources/technical-seo-checklist.md) — CWV thresholds, HTTP status codes, `hreflang` implementation.
