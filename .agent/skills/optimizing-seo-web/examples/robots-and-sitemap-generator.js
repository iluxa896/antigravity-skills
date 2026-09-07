#!/usr/bin/env node
/**
 * Universal XML Sitemap & Robots.txt Generator
 *
 * Production-ready, zero-dependency Node.js script. Runnable in ANY environment
 * (Node 16+, PHP/Laravel, Docker, CI/CD) without requiring TypeScript, ts-node, or bundlers.
 *
 * Usage:
 *   node robots-and-sitemap-generator.js
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'} ChangeFrequency
 *
 * @typedef {Object} SitemapEntry
 * @property {string} loc - Relative or absolute URL of the page
 * @property {string} [lastmod] - ISO date string (YYYY-MM-DD)
 * @property {ChangeFrequency} [changefreq] - Crawl frequency hint
 * @property {number} [priority] - Priority score between 0.0 and 1.0
 *
 * @typedef {Object} GeneratorOptions
 * @property {string} hostname - Target production hostname (e.g. 'https://example.com')
 * @property {string} outputDir - Absolute or relative output directory for generated files
 * @property {SitemapEntry[]} routes - List of site routes to include
 * @property {string[]} [disallowPaths] - Paths to disallow in robots.txt
 * @property {string[]} [allowPaths] - Paths to explicitly allow in robots.txt
 */

/**
 * Escapes special XML characters to prevent markup injection
 * @param {string} str
 * @returns {string}
 */
function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generates standards-compliant robots.txt content
 * @param {GeneratorOptions} options
 * @returns {string}
 */
function generateRobotsTxt(options) {
  const lines = [
    '# User-agent directives for Web Crawlers',
    'User-agent: *',
  ];

  if (options.allowPaths && options.allowPaths.length > 0) {
    options.allowPaths.forEach((p) => lines.push(`Allow: ${p}`));
  }

  if (options.disallowPaths && options.disallowPaths.length > 0) {
    options.disallowPaths.forEach((p) => lines.push(`Disallow: ${p}`));
  } else {
    lines.push('Disallow: /admin/');
    lines.push('Disallow: /api/');
    lines.push('Disallow: /checkout/');
  }

  lines.push('');
  lines.push(`Sitemap: ${options.hostname.replace(/\/+$/, '')}/sitemap.xml`);
  lines.push('');

  return lines.join('\n');
}

/**
 * Generates standards-compliant sitemap.xml content
 * @param {GeneratorOptions} options
 * @returns {string}
 */
function generateSitemapXml(options) {
  const urlNodes = options.routes.map((route) => {
    const rawUrl = route.loc.startsWith('http')
      ? route.loc
      : `${options.hostname.replace(/\/+$/, '')}${route.loc.startsWith('/') ? '' : '/'}${route.loc}`;

    const fullUrl = escapeXml(rawUrl);
    const lastmod = escapeXml(route.lastmod || new Date().toISOString().split('T')[0]);
    const changefreq = route.changefreq || 'weekly';
    const priority = Number(route.priority !== undefined ? route.priority : 0.8).toFixed(1);

    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes.join('\n')}
</urlset>`;
}

/**
 * Generates and writes sitemap.xml and robots.txt to disk
 * @param {GeneratorOptions} options
 * @returns {{ robotsPath: string, sitemapPath: string }}
 */
function buildSitemapAndRobots(options) {
  if (!fs.existsSync(options.outputDir)) {
    fs.mkdirSync(options.outputDir, { recursive: true });
  }

  const robotsContent = generateRobotsTxt(options);
  const sitemapContent = generateSitemapXml(options);

  const robotsPath = path.join(options.outputDir, 'robots.txt');
  const sitemapPath = path.join(options.outputDir, 'sitemap.xml');

  fs.writeFileSync(robotsPath, robotsContent, 'utf8');
  fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');

  return { robotsPath, sitemapPath };
}

// Direct CLI Execution
if (require.main === module) {
  try {
    const config = {
      hostname: 'https://example.com',
      outputDir: path.resolve(process.cwd(), 'public'),
      disallowPaths: ['/admin/', '/api/', '/checkout/', '/user/'],
      allowPaths: ['/api/public/'],
      routes: [
        { loc: '/', priority: 1.0, changefreq: 'daily' },
        { loc: '/features', priority: 0.9, changefreq: 'weekly' },
        { loc: '/pricing', priority: 0.9, changefreq: 'weekly' },
        { loc: '/blog', priority: 0.8, changefreq: 'daily' },
        { loc: '/about', priority: 0.7, changefreq: 'monthly' },
        { loc: '/contact', priority: 0.6, changefreq: 'monthly' },
      ],
    };

    const { robotsPath, sitemapPath } = buildSitemapAndRobots(config);
    console.log(`[SEO Generator] Successfully generated:`);
    console.log(` - ${robotsPath}`);
    console.log(` - ${sitemapPath} (${config.routes.length} URLs)`);

    process.exit(0);
  } catch (err) {
    console.error(`[SEO Generator Error]`, err);
    process.exit(1);
  }
}

module.exports = {
  escapeXml,
  generateRobotsTxt,
  generateSitemapXml,
  buildSitemapAndRobots,
};
