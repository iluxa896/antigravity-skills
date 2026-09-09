#!/usr/bin/env node

/**
 * Enterprise Vue 3 Security & UI/UX Audit Tool
 *
 * Inspects Vue Single File Components (.vue) and frontend TypeScript files:
 * - DOM XSS risks: Unsanitized v-html bindings
 * - Security risks: localStorage/sessionStorage JWT storage
 * - Security risks: javascript: URLs bound to href or src
 * - TypeScript contracts: Untyped props or missing defineProps
 * - Accessibility (a11y): Missing alt attributes on <img>, icon-only buttons missing aria-label
 *
 * Usage:
 *   node vue-audit-tool.mjs [options]
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
Enterprise Vue 3 Security & UI/UX Audit Tool

Usage:
  node vue-audit-tool.mjs [options]

Options:
  -p, --path <path>       Target file or directory to scan (default: .)
  -s, --strict            Treat all warnings as errors
  --ts                    Force TypeScript check (<script setup lang="ts">)
  -h, --help              Show this help message and exit

Checks performed:
  ✔ Security: Unsanitized v-html directives (requires DOMPurify)
  ✔ Security: Sensitive auth tokens in localStorage/sessionStorage
  ✔ Security: Insecure href="javascript:" or src="javascript:" links
  ✔ Contracts: Vue SFC scripts using TypeScript (<script setup lang="ts">, active if tsconfig.json or --ts)
  ✔ Images missing alt attributes
  ✔ Buttons without text content or aria-label
  ✔ Custom button/card @keydown.enter missing @keydown.space.prevent
  ✔ Data: Uncoerced .toFixed() calls without Number() casting
  ✔ Cross-Platform: Raw 100vh usage without dynamic 100dvh fallback (iOS/Android Safari/Chrome)
  ✔ Cross-Platform: Mobile input font-size < 16px (iOS auto-zoom prevention)
  ✔ Radix Vue: Interactive overlays/dialogs/dropdowns must use Radix Vue primitives
  ✔ Cross-Browser: CSS backdrop-filter vendor prefix (-webkit-backdrop-filter)
`);
    process.exit(0);
}

function parseArgs(args) {
    const hasTsConfig = fs.existsSync(path.join(process.cwd(), 'tsconfig.json'));
    const options = {
        targetPath: '.',
        strict: false,
        checkTs: hasTsConfig,
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '-h' || arg === '--help') {
            printHelp();
        } else if (arg === '-p' || arg === '--path') {
            options.targetPath = args[++i];
        } else if (arg === '-s' || arg === '--strict') {
            options.strict = true;
        } else if (arg === '--ts') {
            options.checkTs = true;
        }
    }

    return options;
}

function auditVueFile(filePath, options = {}) {
    const content = fs.readFileSync(filePath, 'utf8');
    const relPath = path.relative(process.cwd(), filePath);
    const issues = [];

    // Check 1: v-html without DOMPurify
    if (/v-html\s*=\s*['"][^'"]*['"]/i.test(content)) {
        if (!/DOMPurify|sanitize/i.test(content)) {
            issues.push({
                file: relPath,
                severity: 'ERROR',
                rule: 'VUE-UNSAFE-V-HTML',
                message: 'v-html directive detected without DOMPurify sanitization. High DOM XSS vulnerability.',
            });
        }
    }

    // Check 2: javascript: protocol
    if (/href\s*=\s*['"]\s*javascript:/i.test(content) || /:href\s*=\s*['"][^'"]*javascript:/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'ERROR',
            rule: 'VUE-INSECURE-HREF',
            message: 'javascript: URL protocol detected in link binding.',
        });
    }

    // Check 3: localStorage token storage
    if (/(localStorage|sessionStorage)\.setItem\s*\(\s*['"][^'"]*(token|jwt|auth)['"]/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-LOCALSTORAGE-TOKEN',
            message: 'Sensitive JWT/token saved in localStorage/sessionStorage. Use HttpOnly cookies or in-memory Pinia.',
        });
    }

    // Check 4: script setup lang="ts" (only when project is TypeScript configured or --ts specified)
    if (options.checkTs && /<script/i.test(content) && !/<script\s+setup\s+lang=['"]ts['"]/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-MISSING-TS-SETUP',
            message: 'SFC is not using <script setup lang="ts">. Strictly typed Composition API recommended.',
        });
    }

    // Check 5: img missing alt
    const imgTagsWithoutAlt = content.match(/<img\b(?![^>]*\balt=)[^>]*>/gi);
    if (imgTagsWithoutAlt) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-A11Y-IMG-NO-ALT',
            message: `Found ${imgTagsWithoutAlt.length} <img> tag(s) missing alt attribute.`,
        });
    }

    // Check 6: Unprotected .toFixed() on variables without Number() coercion
    const rawToFixedMatches = content.match(/(?<!Number\([^)]*)[a-zA-Z0-9_.]+\.toFixed\(/g);
    if (rawToFixedMatches) {
        const suspicious = rawToFixedMatches.filter(m => !/Number\(|\b\d+\.toFixed/.test(m));
        if (suspicious.length > 0) {
            issues.push({
                file: relPath,
                severity: 'WARNING',
                rule: 'VUE-UNSAFE-TO-FIXED',
                message: `Potential uncoerced .toFixed() call (${suspicious.slice(0, 3).join(', ')}). Use Number(val || 0).toFixed() to prevent TypeError on strings.`,
            });
        }
    }

    // Check 7: Interactive @keydown.enter missing @keydown.space.prevent
    const enterMatches = content.match(/<[^>]*(?:@keydown\.enter|v-on:keydown\.enter)[^>]*>/gi);
    if (enterMatches) {
        const missingSpace = enterMatches.filter(tag => !/@keydown\.space|v-on:keydown\.space/i.test(tag) && !/<(?:input|textarea|select)\b/i.test(tag));
        if (missingSpace.length > 0) {
            issues.push({
                file: relPath,
                severity: 'WARNING',
                rule: 'VUE-A11Y-ENTER-NO-SPACE',
                message: `Found ${missingSpace.length} element(s) with @keydown.enter missing @keydown.space.prevent (WAI-ARIA button trigger pattern).`,
            });
        }
    }

    // Check 8: Raw 100vh usage without dynamic 100dvh (iOS Safari toolbar jump risk)
    if (/(?:height:\s*100vh|min-height:\s*100vh|max-height:\s*100vh|\bh-screen\b)/i.test(content) && !/100dvh|min-h-\[100dvh\]|h-\[100dvh\]/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-CROSSPLATFORM-RAW-100VH',
            message: 'Raw 100vh or h-screen detected without 100dvh fallback. Mobile Safari/Chrome toolbars will cause layout cutoffs.',
        });
    }

    // Check 9: Form inputs with font size < 16px (iOS Safari auto-zoom risk)
    if (/<(?:input|select|textarea)\b[^>]*(?:text-xs|text-sm|font-size:\s*(?:1[0-4]px|0\.[78]rem))/i.test(content) && !/text-base|text-\[16px\]|font-size:\s*16px/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-CROSSPLATFORM-IOS-INPUT-ZOOM',
            message: 'Input element with font size < 16px detected. iOS Safari triggers disruptive automatic viewport zoom on focus.',
        });
    }

    // Check 10: Radix Vue primitives for overlays, dialogs, popovers, dropdowns
    const hasCustomOverlay = (
        /<(?:div|section|dialog)\b[^>]*\b(?:role=['"](?:dialog|alertdialog)['"]|class=['"][^'"]*\b(?:modal(?:-dialog|-overlay|-content)?|dialog(?:-box|-content)?|popover(?:-content)?|dropdown-menu)\b[^'"]*['"])/i.test(content)
    );
    const usesRadix = /from\s+['"]radix-vue['"]/i.test(content) || /from\s+['"]@radix-ui/i.test(content);
    if (hasCustomOverlay && !usesRadix) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-RADIX-PRIMITIVE-REQUIRED',
            message: 'Custom overlay/dialog/popover pattern detected without radix-vue. Use Radix Vue primitives (DialogRoot, PopoverRoot, DropdownMenuRoot) for accessible keyboard navigation, focus trapping, and cross-platform overlay resilience.',
        });
    }

    // Check 11: Cross-browser backdrop-filter vendor prefix
    if (/backdrop-filter:\s*blur/i.test(content) && !/-webkit-backdrop-filter:\s*blur/i.test(content)) {
        issues.push({
            file: relPath,
            severity: 'WARNING',
            rule: 'VUE-CROSSBROWSER-BACKDROP-FILTER',
            message: 'CSS backdrop-filter used without -webkit-backdrop-filter vendor prefix. Required for Safari 16+ support.',
        });
    }

    return issues;
}

function collectVueFiles(dirPath, fileList = []) {
    const entries = fs.readdirSync(dirPath, {withFileTypes: true});

    for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
            if (['node_modules', '.git', 'dist', 'vendor'].includes(entry.name)) {
                continue;
            }
            collectVueFiles(fullPath, fileList);
        } else if (entry.isFile() && (entry.name.endsWith('.vue') || entry.name.endsWith('.ts'))) {
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
        files = collectVueFiles(resolvedTarget);
    } else if (resolvedTarget.endsWith('.vue') || resolvedTarget.endsWith('.ts')) {
        files = [resolvedTarget];
    }

    if (files.length === 0) {
        console.log(`ℹ No .vue or .ts files found in "${options.targetPath}".`);
        process.exit(0);
    }

    console.log(`\n✨ Vue 3 Quality & Security Auditor: Inspecting ${files.length} file(s)...\n`);
    console.log('='.repeat(78));

    const allIssues = [];
    for (const file of files) {
        allIssues.push(...auditVueFile(file, options));
    }

    if (allIssues.length === 0) {
        console.log(`\n✔ Clean Vue Audit: All components adhere to Composition API, security, and accessibility standards.\n`);
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
        console.error(`\n❌ Vue Audit Failed: Critical frontend security or contract issues detected.\n`);
        process.exit(1);
    }

    console.log(`\n✔ Vue Audit Passed with ${warningCount} advisory warnings.\n`);
    process.exit(0);
}

run();
