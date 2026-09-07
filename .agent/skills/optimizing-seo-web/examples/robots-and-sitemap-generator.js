/**
 * Production XML Sitemap & Robots.txt Generator
 *
 * Generates standards-compliant sitemap.xml and robots.txt.
 * Node.js Execution Directive: Explicitly exits with 0 on success or 1 on error.
 */

const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} SitemapEntry
 * @property {string} loc
 * @property {string} [lastmod]
 * @property {'always'|'hourly'|'daily'|'weekly'|'monthly'|'yearly'|'never'} [changefreq]
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

function generateSitemapXml(options) {
  const urlNodes = options.routes.map((route) => {
    const fullUrl = route.loc.startsWith('http')
      ? route.loc
      : `${options.hostname.replace(/\/+$/, '')}${route.loc.startsWith('/') ? '' : '/'}${route.loc}`;

    const lastmod = route.lastmod || new Date().toISOString().split('T')[0];
    const changefreq = route.changefreq || 'weekly';
    const priority = (route.priority !== undefined ? route.priority : 0.8).toFixed(1);

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

function main() {
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

    if (!fs.existsSync(config.outputDir)) {
      fs.mkdirSync(config.outputDir, { recursive: true });
    }

    const robotsContent = generateRobotsTxt(config);
    const sitemapContent = generateSitemapXml(config);

    const robotsPath = path.join(config.outputDir, 'robots.txt');
    const sitemapPath = path.join(config.outputDir, 'sitemap.xml');

    fs.writeFileSync(robotsPath, robotsContent, 'utf8');
    fs.writeFileSync(sitemapPath, sitemapContent, 'utf8');

    console.log(`[SEO Generator] Successfully generated:`);
    console.log(` - ${robotsPath}`);
    console.log(` - ${sitemapPath} (${config.routes.length} URLs)`);

    process.exit(0);
  } catch (err) {
    console.error(`[SEO Generator Error]`, err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  generateRobotsTxt,
  generateSitemapXml,
};
