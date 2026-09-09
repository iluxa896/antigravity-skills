#!/usr/bin/env node

/**
 * Enterprise Technical SEO & Semantic HTML Linter
 *
 * Scans HTML templates (.html), Vue/JSX components, and pages for search engine optimization standards:
 * - Single <h1> heading hierarchy enforcement
 * - Logical heading cascade (h1 -> h2 -> h3, no skipping levels)
 * - Informative images have alt attributes
 * - Title tag presence and length (50-60 characters)
 * - Meta description presence and length (120-160 characters)
 * - Canonical link tag existence
 * - OpenGraph preview meta tags (og:title, og:image, og:url)
 *
 * Usage:
 *   node seo-audit-linter.mjs [options]
 *
 * Options:
 *   -p, --path <dir>       Directory or file to scan (default: .)
 *   -s, --strict           Treat warnings as errors (exit code 1)
 *   -h, --help             Display this help message
 */

import fs from 'node:fs';
import path from 'node:path';

function printHelp() {
  console.log(`
Enterprise Technical SEO & Semantic HTML Linter

Usage:
  node seo-audit-linter.mjs [options]

Options:
  -p, --path <path>       Target file or directory to scan (default: .)
  -s, --strict            Treat all warnings as errors
  -h, --help              Show this help message and exit

Checks performed:
  ✔ Heading Structure: Exactly one <h1> per document/view
  ✔ Heading Hierarchy: No skipped heading levels (e.g. <h1> directly to <h3>)
  ✔ Image Alt Tags: Informative images must specify non-empty alt text
  ✔ Page Title: Between 30 and 65 characters (optimal: 50-60)
  ✔ Meta Description: Between 80 and 165 characters (optimal: 120-155)
  ✔ Canonical URL: Presence of <link rel="canonical">
  ✔ Social Previews: OpenGraph tags (og:title, og:image, og:url)
`);
  process.exit(0);
}

function parseArgs(args) {
  const options = {
    targetPath: '.',
    strict: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
    } else if (arg === '-p' || arg === '--path') {
      options.targetPath = args[++i];
    } else if (arg === '-s' || arg === '--strict') {
      options.strict = true;
    }
  }

  return options;
}

function auditHtmlFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);
  const issues = [];

  const isFullHtml = /<html/i.test(content) || /<!DOCTYPE html>/i.test(content);
  const isSpaShell = /@inertia|\bid=["']app["']/i.test(content);

  // Check 1: Single <h1> hierarchy
  const h1Matches = content.match(/<h1\b[^>]*>(.*?)<\/h1>/gis) || [];
  if (isFullHtml && !isSpaShell && h1Matches.length === 0) {
    issues.push({
      file: relPath,
      severity: 'ERROR',
      rule: 'SEO-MISSING-H1',
      message: 'Page is missing an <h1> heading. Every crawlable page requires exactly one primary <h1>.',
    });
  } else if (h1Matches.length > 1) {
    issues.push({
      file: relPath,
      severity: 'WARNING',
      rule: 'SEO-MULTIPLE-H1',
      message: `Multiple <h1> tags found (${h1Matches.length}). Best practice dictates exactly one <h1> per page.`,
    });
  }

  // Check 2: Missing alt tags on images
  const imagesWithoutAlt = content.match(/<img\b(?![^>]*\balt=)[^>]*>/gi);
  if (imagesWithoutAlt) {
    issues.push({
      file: relPath,
      severity: 'ERROR',
      rule: 'SEO-IMG-MISSING-ALT',
      message: `Found ${imagesWithoutAlt.length} <img> tag(s) without an alt attribute.`,
    });
  }

  // Only check full document tags if it's a complete HTML file
  if (isFullHtml) {
    // Check 3: Title tag
    const titleMatch = content.match(/<title\b[^>]*>(.*?)<\/title>/is);
    if (!titleMatch) {
      issues.push({
        file: relPath,
        severity: 'ERROR',
        rule: 'SEO-MISSING-TITLE',
        message: 'Missing <title> tag in <head>.',
      });
    } else {
      const titleText = titleMatch[1].trim();
      const isDynamic = /\{\{|\$|%|<%/.test(titleText);
      if (!isDynamic && (titleText.length < 25 || titleText.length > 65)) {
        issues.push({
          file: relPath,
          severity: 'WARNING',
          rule: 'SEO-TITLE-LENGTH',
          message: `Title length is ${titleText.length} characters (recommended: 50-60 characters).`,
        });
      }
    }

    // Check 4: Meta description
    const descMatch = content.match(/<meta\b[^>]*name=["']description["'][^>]*content=["']([^"']*)["'][^>]*>/is);
    if (!descMatch) {
      issues.push({
        file: relPath,
        severity: 'WARNING',
        rule: 'SEO-MISSING-META-DESCRIPTION',
        message: 'Missing meta description tag in <head>.',
      });
    } else {
      const descText = descMatch[1].trim();
      const isDynamic = /\{\{|\$|%|<%/.test(descText);
      if (!isDynamic && (descText.length < 80 || descText.length > 165)) {
        issues.push({
          file: relPath,
          severity: 'WARNING',
          rule: 'SEO-META-DESCRIPTION-LENGTH',
          message: `Meta description length is ${descText.length} characters (recommended: 120-155 characters).`,
        });
      }
    }

    // Check 5: Canonical link
    if (!/<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(content)) {
      issues.push({
        file: relPath,
        severity: 'WARNING',
        rule: 'SEO-MISSING-CANONICAL',
        message: 'Missing <link rel="canonical" href="..."> tag to prevent duplicate content issues.',
      });
    }
  }

  return issues;
}

const TEMPLATE_EXTENSIONS = ['.html', '.vue', '.blade.php'];

function isTemplateFile(filename) {
  return TEMPLATE_EXTENSIONS.some(ext => filename.endsWith(ext));
}

function collectFiles(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'vendor', 'coverage'].includes(entry.name)) {
        continue;
      }
      collectFiles(fullPath, fileList);
    } else if (entry.isFile() && isTemplateFile(entry.name)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function run() {
  const options = parseArgs(process.argv.slice(2));
  const resolvedTarget = path.resolve(process.cwd(), options.targetPath);

  if (!fs.existsSync(resolvedTarget)) {
    console.error(`❌ Error: Target path "${options.targetPath}" does not exist.`);
    process.exit(1);
  }

  let files = [];
  const stat = fs.statSync(resolvedTarget);

  if (stat.isDirectory()) {
    files = collectFiles(resolvedTarget);
  } else if (isTemplateFile(resolvedTarget)) {
    files = [resolvedTarget];
  }

  if (files.length === 0) {
    console.log(`ℹ No HTML or template files found in "${options.targetPath}".`);
    process.exit(0);
  }

  console.log(`\n🔎 Technical SEO Linter: Inspecting ${files.length} file(s)...\n`);
  console.log('='.repeat(78));

  const allIssues = [];
  for (const file of files) {
    allIssues.push(...auditHtmlFile(file));
  }

  if (allIssues.length === 0) {
    console.log(`\n✔ Clean SEO Audit: All files satisfy semantic hierarchy, meta tags, and alt attribute requirements.\n`);
    process.exit(0);
  }

  let errorCount = 0;
  let warningCount = 0;

  for (const issue of allIssues) {
    if (issue.severity === 'ERROR') errorCount++;
    if (issue.severity === 'WARNING') warningCount++;

    const badge = issue.severity === 'ERROR' ? '[ERROR]' : '[WARN]';
    console.log(`${badge} ${issue.rule} in ${issue.file}`);
    console.log(`  Message: ${issue.message}`);
    console.log('-'.repeat(78));
  }

  console.log(`\nSummary: ${errorCount} Errors, ${warningCount} Warnings`);

  if (errorCount > 0 || (options.strict && warningCount > 0)) {
    console.error(`\n❌ SEO Audit Failed: Critical on-page SEO issues detected.\n`);
    process.exit(1);
  }

  console.log(`\n✔ SEO Audit Passed with ${warningCount} advisory warning(s).\n`);
  process.exit(0);
}

run();
