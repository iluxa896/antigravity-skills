#!/usr/bin/env node

/**
 * Enterprise QA Test Suite & Edge-Case Validator
 *
 * Scans test files (*.spec.ts, *.test.ts, *-suite.ts, Test.php) to evaluate
 * test hygiene, boundary value coverage, destructive testing patterns, resilient selectors,
 * and negative path assertions.
 *
 * Usage:
 *   node qa-suite-runner.mjs [options]
 *
 * Options:
 *   -p, --path <dir>       Directory or file to scan (default: .)
 *   -t, --threshold <num>  Minimum QA readiness score (0-100, default: 70)
 *   -h, --help             Display this help message
 */

import fs from 'node:fs';
import path from 'node:path';

function printHelp() {
  console.log(`
Enterprise QA Test Suite & Edge-Case Validator

Usage:
  node qa-suite-runner.mjs [options]

Options:
  -p, --path <path>       Target file or directory to scan (default: .)
  -t, --threshold <num>   Minimum acceptable QA score (0-100, default: 70)
  -h, --help              Show this help message and exit

Checks performed:
  ✔ Boundary value & extreme limit assertions (null, empty strings, max int, large payloads)
  ✔ Negative path assertions (rejections, expected errors, HTTP 4xx/5xx status codes)
  ✔ Resilient selectors (data-testid, getByRole, getByTestId vs fragile CSS) for UI tests
  ✔ Concurrency & idempotency tests (double clicks, race conditions, atomic locks)
  ✔ Network failure & timeout handling (504 gateway timeouts, dropped connections)
`);
  process.exit(0);
}

function parseArgs(args) {
  const options = {
    targetPath: '.',
    threshold: 60,
    strict: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
    } else if (arg === '-p' || arg === '--path') {
      options.targetPath = args[++i];
    } else if (arg === '-t' || arg === '--threshold') {
      options.threshold = parseInt(args[++i], 10) || 60;
    } else if (arg === '-s' || arg === '--strict') {
      options.strict = true;
    }
  }

  return options;
}

const TEST_FILE_REGEX = /(\.(test|spec)\.(ts|js|tsx|jsx)|(-suite)\.(ts|js)|Test\.php)$/i;

function collectTestFiles(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'vendor', 'coverage'].includes(entry.name)) {
        continue;
      }
      collectTestFiles(fullPath, fileList);
    } else if (entry.isFile() && TEST_FILE_REGEX.test(entry.name)) {
      // Ignore default framework starter tests
      if (entry.name === 'ExampleTest.php') {
        continue;
      }
      fileList.push(fullPath);
    }
  }

  return fileList;
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(process.cwd(), filePath);
  const isE2eOrUi = /(@playwright|cypress|page\.|browser\.|locator\(|mount\(|render\()/i.test(content);

  const findings = {
    file: relPath,
    type: isE2eOrUi ? 'E2E/UI' : 'Unit/Integration',
    hasBoundaryTests: false,
    hasNegativeAssertions: false,
    hasResilientSelectors: false,
    hasIdempotencyOrConcurrency: false,
    hasNetworkOrTimeoutHandling: false,
    fragileSelectorCount: 0,
    score: 0,
  };

  // Boundary checks
  if (/(\bnull\b|\bundefined\b|""|''|2\*\*31|PHP_INT_MAX|999999|boundary|overflow|payload|assertEmpty|assertNull|assertCount\s*\(\s*0|\bzero\b|\bempty\b)/i.test(content)) {
    findings.hasBoundaryTests = true;
  }

  // Negative assertions
  if (/(toThrow|rejects|expectException|status\([345]\d\d\)|assertStatus\([345]\d\d\)|assertForbidden|assertUnauthorized|assertNotFound|assertRedirect|assertInvalid|assertJsonValidationErrors|assertSessionHasErrors|assertDatabaseMissing|assertFalse|toBeDisabled|assertThrows|status.*===.*4\d\d|invalid|forbidden|unauthorized)/i.test(content)) {
    findings.hasNegativeAssertions = true;
  }

  // Resilient selectors
  if (/(data-testid|getByTestId|getByRole|getByLabel|findByTestId)/i.test(content)) {
    findings.hasResilientSelectors = true;
  }

  // Fragile selectors
  const fragileMatches = content.match(/locator\(['"][^'"]*(nth-child|nth-of-type|\.css-|\bdiv\s*>\s*span)[^'"]*['"]\)/g);
  if (fragileMatches) {
    findings.fragileSelectorCount = fragileMatches.length;
  }

  // Idempotency / Concurrency
  if (/(dblclick|double.*click|idempotenc|concurrent|race condition|atomic|deadlock|mutex)/i.test(content)) {
    findings.hasIdempotencyOrConcurrency = true;
  }

  // Network / Fault resilience
  if (/(timeout|networkidle|gateway|504|offline|throttle|route\.abort|route\.fulfill|deadlock)/i.test(content)) {
    findings.hasNetworkOrTimeoutHandling = true;
  }

  // Context-aware scoring
  let score = 25; // Base score
  if (findings.hasBoundaryTests) score += 25;
  if (findings.hasNegativeAssertions) score += 25;

  if (isE2eOrUi) {
    if (findings.hasResilientSelectors) score += 15;
    if (findings.hasIdempotencyOrConcurrency || findings.hasNetworkOrTimeoutHandling) score += 10;
    if (findings.fragileSelectorCount > 0) score -= Math.min(20, findings.fragileSelectorCount * 5);
  } else {
    // Unit/Integration test
    if (findings.hasIdempotencyOrConcurrency || findings.hasNetworkOrTimeoutHandling) {
      score += 25;
    } else {
      score += 20; // Pure boundary/exception unit coverage is rewarded
    }
  }

  findings.score = Math.max(0, Math.min(100, score));
  return findings;
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
    files = collectTestFiles(resolvedTarget);
  } else if (TEST_FILE_REGEX.test(resolvedTarget)) {
    files = [resolvedTarget];
  }

  if (files.length === 0) {
    console.log(`ℹ No test files found in "${options.targetPath}".`);
    process.exit(0);
  }

  console.log(`\n🔍 QA Test Suite Audit Report: ${files.length} file(s) analyzed\n`);
  console.log('='.repeat(72));

  let totalScore = 0;
  let hasFailures = false;

  for (const file of files) {
    const report = auditFile(file);
    totalScore += report.score;

    const statusBadge = report.score >= options.threshold ? '✔ PASS' : '✖ FAIL';
    console.log(`[${statusBadge}] ${report.file} [${report.type}] (Score: ${report.score}/100)`);
    console.log(`   Boundary/Limit tests      : ${report.hasBoundaryTests ? '✔' : '⚠ Missing'}`);
    console.log(`   Negative path assertions  : ${report.hasNegativeAssertions ? '✔' : '⚠ Missing'}`);
    if (report.type === 'E2E/UI') {
      console.log(`   Resilient selectors       : ${report.hasResilientSelectors ? '✔' : '⚠ Missing'}`);
      console.log(`   Idempotency / Concurrency : ${report.hasIdempotencyOrConcurrency ? '✔' : '⚠ Missing'}`);
      console.log(`   Network fault resilience  : ${report.hasNetworkOrTimeoutHandling ? '✔' : '⚠ Missing'}`);
      if (report.fragileSelectorCount > 0) {
        console.log(`   ⚠ Fragile CSS selectors   : ${report.fragileSelectorCount} detected!`);
      }
    } else {
      console.log(`   Fault / Concurrency checks: ${report.hasIdempotencyOrConcurrency || report.hasNetworkOrTimeoutHandling ? '✔' : 'Optional for pure Unit'}`);
    }

    if (report.score < options.threshold) {
      hasFailures = true;
    }
    console.log('-'.repeat(72));
  }

  const averageScore = Math.round(totalScore / files.length);
  console.log(`\nQA Suite Average Score : ${averageScore}/100 (Threshold: ${options.threshold})`);

  if (averageScore < options.threshold || (options.strict && hasFailures)) {
    console.error(`\n❌ QA Audit Failed: Test suite quality score is below the required threshold of ${options.threshold}.\n`);
    process.exit(1);
  }

  console.log(`\n✔ QA Audit Passed: Test suites satisfy destructive testing and resilience criteria.\n`);
  process.exit(0);
}

run();

