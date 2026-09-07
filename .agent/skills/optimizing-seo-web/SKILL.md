---
name: optimizing-seo-web
description: >-
  Guides technical SEO, search engine indexation, structured data implementation, semantic HTML,
  and Core Web Vitals optimization across SPA, SSR, and SSG architectures. Enforces JSON-LD schemas,
  OpenGraph/Twitter meta tags, robots.txt, dynamic sitemaps, canonicalization, crawl budget management,
  and bot rendering strategies. Use when auditing SEO, optimizing web pages for Google/Bing indexing,
  implementing schema markup, or improving Core Web Vitals.
---

# Technical SEO & Search Engine Indexation Mastery (Master Skill)

## When to use this skill
- Designing or auditing site structure, URL hierarchy, internal linking, and semantic HTML5 for search engines.
- Implementing structured data (JSON-LD) for Products, Organizations, Articles, FAQs, Breadcrumbs, and Local Businesses.
- Configuring crawl directives, `robots.txt`, XML sitemaps, canonical URLs, and `hreflang` internationalization tags.
- Troubleshooting indexing issues (client-side rendering pitfalls, crawl budget exhaustion, duplicate content, soft 404s).
- Optimizing Core Web Vitals (LCP < 2.5s, INP < 200ms, CLS < 0.1) and server response times (TTFB < 800ms).
- Running the technical SEO and semantic HTML linter (`scripts/seo-audit-linter.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Content Strategy & Internal Link Graph | Designing site taxonomy, topic clusters, keyword targeting, anchor text phrasing, and editorial blog structure. |
| **Medium Freedom** | Schema Selection & Meta Microcopy | Choosing structured data types (FAQ vs HowTo vs Article), tailoring meta description call-to-actions, sitemap priority weights. |
| **Low Freedom** | Technical Directives & Syntax | Exactly one `<h1>` per document, valid Schema.org JSON-LD syntax, canonical tag syntax, standard `robots.txt` format, HTTP 200/404 headers. |

---

## 2. Core Technical SEO Principles

### A. Semantic HTML & Document Architecture
- **Single `<h1>` Hierarchy**: Exactly one descriptive `<h1>` per page reflecting the primary search intent. Maintain a logical heading cascade (`<h2>`, `<h3>`, `<h4>`) without skipping levels.
- **Semantic Tags**: Use `<main>`, `<article>`, `<section>`, `<nav>`, `<aside>`, `<header>`, and `<footer>` instead of unsemantic `<div>` containers.
- **Link & Anchor Hygiene**:
  - Always use standard `<a href="...">` tags with crawlable relative/absolute URLs.
  - Never use `<button @click="navigate()">` or `<span onclick="...">` for navigation.
  - Use descriptive, keyword-rich anchor text (avoid generic "click here" or "read more").
- **Image Optimization**:
  - Provide meaningful `alt` attributes for every informative image. Use `alt=""` for purely decorative images.
  - Specify explicit `width` and `height` attributes to prevent Cumulative Layout Shift (CLS).
  - Use modern formats (`.webp`, `.avif`) and lazy loading (`loading="lazy"`).

### B. Structured Data & JSON-LD Schemas
- Embed typesafe JSON-LD schema blocks via `<script type="application/ld+json">`.
- Core schemas to implement:
  - **Organization / WebSite**: Brand entity, logo, searchAction query template.
  - **BreadcrumbList**: Hierarchical site path.
  - **Article / BlogPosting**: Headline, author, datePublished, dateModified, image.
  - **Product / Offer**: Name, SKU, price, currency, availability, aggregateRating.
  - **FAQPage**: Question/Answer entities for instant rich snippet expansion in SERPs.

### C. Meta Tags & Social Previews
- **Title Tag**: 50–60 characters. Format: `Primary Keyword - Secondary Benefit | Brand Name`.
- **Meta Description**: 120–155 characters. Engaging summary with a clear call-to-action.
- **Canonical URLs**: Self-referencing `<link rel="canonical" href="https://example.com/clean-path">` to eliminate duplicate parameter variations.
- **OpenGraph & Twitter Cards**:
  - `og:title`, `og:description`, `og:image` (1200x630px), `og:url`, `og:type`.
  - `twitter:card` (`summary_large_image`), `twitter:title`, `twitter:description`, `twitter:image`.

---

## 3. Technical SEO Audit Workflow

```markdown
- [ ] 1. Crawlability & Rendering Check
      - Verify robots.txt allows public assets (JS/CSS must not be blocked).
      - Ensure server returns HTTP 200 for valid pages and HTTP 404/410 for missing pages.
      - Test whether core text and links render in initial HTML without client-side JS dependency.
- [ ] 2. On-Page & Semantic Architecture
      - Run SEO linter: node .agent/skills/optimizing-seo-web/scripts/seo-audit-linter.mjs
      - Audit H1-H6 hierarchy and title/meta length.
      - Verify canonical URLs and self-referencing canonical consistency.
      - Check alt tags, width/height dimensions, and image formats.
- [ ] 3. Structured Data Validation
      - Validate JSON-LD schemas against Schema.org and Google Rich Results guidelines.
      - Verify BreadcrumbList, Product, FAQPage, or Article schema nodes.
- [ ] 4. Core Web Vitals & Performance
      - LCP: Preload hero image, optimize server TTFB.
      - INP: Eliminate long JS execution tasks on main thread.
      - CLS: Reserve layout space for banners, ads, and dynamic widgets.
```

---

## 4. Automated SEO Verification

Run the built-in SEO linter across templates or pages:

```bash
node .agent/skills/optimizing-seo-web/scripts/seo-audit-linter.mjs --path public/
```

---

## 5. Supporting Resources & Examples

- **Technical SEO Linter Script**: [seo-audit-linter.mjs](./scripts/seo-audit-linter.mjs) - Node.js CLI script inspecting HTML templates for headings, alt tags, canonicals, and meta descriptions.
- **Typesafe JSON-LD Schema Generator**: [json-ld-schemas.ts](./examples/json-ld-schemas.ts) - TypeScript helpers for building valid Schema.org JSON-LD structures.
- **Robots & Sitemap Generator Script**: [robots-and-sitemap-generator.js](./examples/robots-and-sitemap-generator.js) - Automated script generating compliant `robots.txt` and `sitemap.xml`.
- **Technical SEO Architecture Guide**: [technical-seo-architecture.md](./references/technical-seo-architecture.md) - Deep guide covering Googlebot rendering pipelines, crawl budget optimization, and Core Web Vitals.
- **Technical SEO Checklist & Metrics**: [technical-seo-checklist.md](./resources/technical-seo-checklist.md) - Comprehensive checklist covering CWV thresholds, HTTP status codes, and `hreflang` tags.
