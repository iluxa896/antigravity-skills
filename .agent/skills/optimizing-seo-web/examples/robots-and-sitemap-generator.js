#!/usr/bin/env node
/**
 * Universal XML Sitemap & Robots.txt Generator
 *
 * Zero-dependency ESM Node.js script (Node 20+). Generates standards-compliant
 * robots.txt and sitemap.xml for any static/SSR site.
 *
 * Usage:
 *   node robots-and-sitemap-generator.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** @typedef {'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'} ChangeFreq */

/**
 * @typedef {Object} SitemapEntry
 * @property {string} loc
 * @property {string} [lastmod]
 * @property {ChangeFreq} [changefreq]
 * @property {number} [priority]
 */

/**
 * @typedef {Object} GeneratorOptions
 * @property {string} hostname
 * @property {string} outputDir
 * @property {SitemapEntry[]} routes
 * @property {string[]} [disallowPaths]
 * @property {string[]} [allowPaths]
 */

/** @param {string} str @returns {string} */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** @param {GeneratorOptions} opts @returns {string} */
function generateRobotsTxt(opts) {
  const base = opts.hostname.replace(/\/+$/, '');
  const lines = ['User-agent: *'];

  for (const p of opts.allowPaths ?? []) lines.push(`Allow: ${p}`);

  const disallow = opts.disallowPaths?.length
    ? opts.disallowPaths
    : ['/admin/', '/api/', '/checkout/'];

  for (const p of disallow) lines.push(`Disallow: ${p}`);

  lines.push('', `Sitemap: ${base}/sitemap.xml`, '');
  return lines.join('\n');
}

/** @param {GeneratorOptions} opts @returns {string} */
function generateSitemapXml(opts) {
  const base = opts.hostname.replace(/\/+$/, '');
  const today = new Date().toISOString().slice(0, 10);

  const nodes = opts.routes.map(({ loc, lastmod, changefreq = 'weekly', priority = 0.8 }) => {
    const url = escapeXml(loc.startsWith('http') ? loc : `${base}${loc.startsWith('/') ? '' : '/'}${loc}`);
    return [
      '  <url>',
      `    <loc>${url}</loc>`,
      `    <lastmod>${escapeXml(lastmod ?? today)}</lastmod>`,
      `    <changefreq>${changefreq}</changefreq>`,
      `    <priority>${Number(priority).toFixed(1)}</priority>`,
      '  </url>',
    ].join('\n');
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${nodes.join('\n')}\n</urlset>`;
}

/** @param {GeneratorOptions} opts @returns {{ robotsPath: string, sitemapPath: string }} */
function buildSitemapAndRobots(opts) {
  if (!existsSync(opts.outputDir)) mkdirSync(opts.outputDir, { recursive: true });

  const robotsPath = join(opts.outputDir, 'robots.txt');
  const sitemapPath = join(opts.outputDir, 'sitemap.xml');

  writeFileSync(robotsPath, generateRobotsTxt(opts), 'utf8');
  writeFileSync(sitemapPath, generateSitemapXml(opts), 'utf8');

  return { robotsPath, sitemapPath };
}

// ── CLI entry point ────────────────────────────────────────────────────────────
/** @type {GeneratorOptions} */
const config = {
  hostname:     'https://example.com',
  outputDir:    resolve(process.cwd(), 'public'),
  disallowPaths: ['/admin/', '/api/', '/checkout/', '/user/'],
  allowPaths:    ['/api/public/'],
  routes: [
    { loc: '/',        priority: 1.0, changefreq: 'daily'   },
    { loc: '/features', priority: 0.9, changefreq: 'weekly'  },
    { loc: '/pricing',  priority: 0.9, changefreq: 'weekly'  },
    { loc: '/blog',     priority: 0.8, changefreq: 'daily'   },
    { loc: '/about',    priority: 0.7, changefreq: 'monthly' },
    { loc: '/contact',  priority: 0.6, changefreq: 'monthly' },
  ],
};

try {
  const { robotsPath, sitemapPath } = buildSitemapAndRobots(config);
  console.log('[SEO Generator] Generated:');
  console.log(` • ${robotsPath}`);
  console.log(` • ${sitemapPath} (${config.routes.length} URLs)`);
  process.exit(0);
} catch (err) {
  console.error('[SEO Generator Error]', err);
  process.exit(1);
}

export { escapeXml, generateRobotsTxt, generateSitemapXml, buildSitemapAndRobots };
