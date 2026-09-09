# Technical SEO & Search Engine Indexation Checklist

This reference guide provides senior technical rules, indexing validation steps, and Core Web Vitals audit procedures.

---

## 0. Architectural Single Source of Truth (DRY SEO)

- [ ] **Server-First Monoliths (Inertia.js / Laravel)**:
  - Master layout template (`app.blade.php`) is the **single source of truth** for `<head>`, OpenGraph, Twitter cards, and Schema.org JSON-LD scripts.
  - Social media bots (Telegram, VK, WhatsApp) and search engines receive 100% complete metadata in the raw initial HTTP response without waiting for JS execution.
  - Vue components handle **strictly dynamic SPA tab title, description, and canonical URL** via `<Head>` on route changes.
  - **Forbidden**: Do NOT duplicate JSON-LD schema generation inside Vue client components (DRY violation & bundle bloat).
- [ ] **Standalone SPAs (Vite / Nuxt)**:
  - Manage meta tags and JSON-LD via SSR / head composables (`useHead`).

---

## 1. Crawlability & Indexation Infrastructure

### Robots Directives (`robots.txt` & Meta Tags)
- [ ] **robots.txt**: Ensure critical JS, CSS, and image assets are NOT blocked (Googlebot requires assets to render DOM accurately).
- [ ] **Disallow Sensitive Paths**: Block `/admin/`, `/checkout/`, `/user/profile`, internal search queries (`?q=`, `?filter=`).
- [ ] **Meta Robots**: Use `<meta name="robots" content="index, follow">` on all canonical pages.
- [ ] **Noindex on Duplicate/Staging**: Enforce `<meta name="robots" content="noindex, nofollow">` on test environments and internal staging subdomains.
- [ ] **HTTP Headers (X-Robots-Tag)**: Set `X-Robots-Tag: noindex` on raw PDF, internal API responses, and JSON endpoints.

### XML Sitemap Architecture
- [ ] Valid UTF-8 XML sitemap located at `/sitemap.xml` and registered in `robots.txt` and Google Search Console.
- [ ] Exclude 4xx, 3xx redirects, and canonicalized-away duplicate URLs from sitemap.
- [ ] Include `<lastmod>` timestamps updated ONLY on genuine content modifications (do not spoof current timestamps).

---

## 2. On-Page HTML5 & Information Architecture

### Heading Hierarchy & Content Semantics
- [ ] Exactly one `<h1>` per page matching the page's primary search intent.
- [ ] Logical heading hierarchy (`h1` -> `h2` -> `h3`); never skip levels for styling purposes.
- [ ] Wrap navigation links in `<nav>`, main body in `<main>`, sidebar in `<aside>`, and footers in `<footer>`.
- [ ] All internal hyperlinks use `<a href="/path">` with keyword-descriptive anchor text.

### Canonicalization & Duplicate Management
- [ ] Every indexable page contains a self-referencing canonical tag: `<link rel="canonical" href="https://example.com/canonical-url">`.
- [ ] Lowercase URLs with consistent trailing slash convention across the entire domain.
- [ ] Force HTTPS and redirect non-www to www (or vice-versa) via permanent 301 redirects.

### Internationalization (`hreflang`)
- [ ] Implement bidirectional `hreflang` tags on multilingual pages:
  ```html
  <link rel="alternate" hreflang="en" href="https://example.com/en/page" />
  <link rel="alternate" hreflang="es" href="https://example.com/es/page" />
  <link rel="alternate" hreflang="x-default" href="https://example.com/page" />
  ```

---

## 3. Structured Data (JSON-LD) Matrix

| Page Type | Required Schema Type | Key Properties to Include |
| :--- | :--- | :--- |
| **Homepage** | `Organization` / `WebSite` | `name`, `url`, `logo`, `sameAs`, `potentialAction (SearchAction)` |
| **Product Page** | `Product` + `Offer` | `name`, `image`, `sku`, `brand`, `offers (price, priceCurrency, availability)`, `aggregateRating` |
| **Blog / Article** | `BlogPosting` / `Article` | `headline`, `image`, `datePublished`, `dateModified`, `author`, `publisher` |
| **FAQ Page / Section** | `FAQPage` | `mainEntity [ { @type: "Question", name, acceptedAnswer } ]` |
| **Category / Deep Pages**| `BreadcrumbList` | `itemListElement [ { @type: "ListItem", position, name, item } ]` |

---

## 4. Core Web Vitals

See thresholds and optimization tactics in [technical-seo-architecture.md](../references/technical-seo-architecture.md#2-core-web-vitals-cwv-engineering-guidelines).

| Metric | Target |
| :--- | :--- |
| **LCP** | < 2.5s — preload hero image, TTFB < 800ms, CDN edge |
| **INP** | < 200ms — break long tasks, defer non-critical JS |
| **CLS** | < 0.1 — explicit width/height on all media |
| **TTFB** | < 800ms — OPcache, Redis page cache, geo CDN |
