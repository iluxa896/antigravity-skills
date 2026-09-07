# Technical SEO & Search Engine Indexation Checklist

This reference guide provides senior technical rules, indexing validation steps, and Core Web Vitals audit procedures.

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
- [ ] Exactly one `<h1\>` per page matching the page's primary search intent.
- [ ] Logical heading hierarchy (`h1` -> `h2` -> `h3`); never skip levels for styling purposes.
- [ ] Wrap navigation links in `<nav\>`, main body in `<main\>`, sidebar in `<aside\>`, and footers in `<footer\>`.
- [ ] All internal hyperlinks use `<a href="/path"\>` with keyword-descriptive anchor text.

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

## 4. Core Web Vitals Optimization Benchmarks

| Metric | Target (Good) | Primary Bottlenecks & Fixes |
| :--- | :--- | :--- |
| **LCP** (Largest Contentful Paint) | **< 2.5s** | Preload hero banner (`<link rel="preload" as="image">`), server caching, CDN edge delivery, TTFB < 800ms. |
| **INP** (Interaction to Next Paint) | **< 200ms** | Break long JavaScript execution tasks into microtasks (`requestAnimationFrame`, Web Workers, debounced handlers). |
| **CLS** (Cumulative Layout Shift) | **< 0.1** | Explicit `width` and `height` (or `aspect-ratio`) on images, videos, ads, and embeds. Reserve skeleton placeholders for dynamic widgets. |
| **TTFB** (Time to First Byte) | **< 800ms** | OPcache preloading, Redis page cache, optimized database queries, geo-distributed CDN caching. |
