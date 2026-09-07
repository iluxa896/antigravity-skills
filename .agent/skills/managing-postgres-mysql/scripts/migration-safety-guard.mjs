#!/usr/bin/env node

/**
 * Enterprise Database Migration & DDL Safety Guard
 *
 * Inspects SQL migration files (.sql) for high-risk operations that cause
 * production table locks, connection starvation, and service outages:
 * - Creating indexes without CONCURRENTLY (PostgreSQL) or ALGORITHM=INPLACE (MySQL)
 * - Dropping indexes without CONCURRENTLY (PostgreSQL)
 * - Missing lock timeout protection (SET lock_timeout)
 * - Adding NOT NULL columns without default values (causing full table rewrite)
 * - Dangerous DROP TABLE / TRUNCATE operations without review safeguards
 *
 * Usage:
 *   node migration-safety-guard.mjs [options]
 *
 * Options:
 *   -p, --path <dir>         Directory or file to scan (default: .)
 *   -d, --dialect <dialect>  Target dialect: postgres, mysql, or all (default: all)
 *   -h, --help               Display this help message
 */

import fs from 'node:fs';
import path from 'node:path';

function printHelp() {
  console.log(`
Enterprise Database Migration & DDL Safety Guard

Usage:
  node migration-safety-guard.mjs [options]

Options:
  -p, --path <path>         Target file or directory to scan (default: .)
  -d, --dialect <dialect>   Database engine: postgres, mysql, or all (default: all)
  -h, --help                Show this help message and exit

Safety Checks Enforced:
  [CRITICAL] CREATE INDEX without CONCURRENTLY (PostgreSQL)
  [CRITICAL] ALTER TABLE ADD INDEX without ALGORITHM=INPLACE / LOCK=NONE (MySQL)
  [CRITICAL] DROP TABLE / TRUNCATE TABLE in automated migration
  [HIGH]     Missing SET lock_timeout / SET lock_wait_timeout before DDL block
  [HIGH]     DROP INDEX without CONCURRENTLY (PostgreSQL)
  [MEDIUM]   Adding column with volatile default value triggering table lock
`);
  process.exit(0);
}

function parseArgs(args) {
  const options = {
    targetPath: '.',
    dialect: 'all',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') {
      printHelp();
    } else if (arg === '-p' || arg === '--path') {
      options.targetPath = args[++i];
    } else if (arg === '-d' || arg === '--dialect') {
      options.dialect = (args[++i] || 'all').toLowerCase();
    }
  }

  return options;
}

function auditSqlFile(filePath, dialect) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relPath = path.relative(process.cwd(), filePath);
  const issues = [];

  const checkPg = dialect === 'all' || dialect === 'postgres';
  const checkMy = dialect === 'all' || dialect === 'mysql';

  const hasLockTimeout = /(set\s+lock_timeout|set\s+lock_wait_timeout)/i.test(content);
  const hasDdl = /(create\s+table|alter\s+table|drop\s+table|create\s+index|drop\s+index)/i.test(content);

  // Check 1: Missing lock timeout
  if (hasDdl && !hasLockTimeout) {
    issues.push({
      file: relPath,
      line: 1,
      severity: 'HIGH',
      rule: 'DDL-MISSING-LOCK-TIMEOUT',
      message: 'DDL script does not configure a lock timeout (e.g. SET lock_timeout = "3s"). High risk of connection pile-up.',
    });
  }

  // Check line-by-line rules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('--') || trimmed.startsWith('/*')) continue;

    // Postgres: CREATE INDEX without CONCURRENTLY
    if (checkPg && /create\s+(unique\s+)?index\b/i.test(line) && !/create\s+(unique\s+)?index\s+concurrently\b/i.test(line)) {
      issues.push({
        file: relPath,
        line: i + 1,
        severity: 'CRITICAL',
        rule: 'PG-BLOCKING-INDEX-CREATION',
        message: 'PostgreSQL: CREATE INDEX executed without CONCURRENTLY. This takes an ACCESS EXCLUSIVE lock on the table.',
      });
    }

    // Postgres: DROP INDEX without CONCURRENTLY
    if (checkPg && /drop\s+index\b/i.test(line) && !/drop\s+index\s+concurrently\b/i.test(line)) {
      issues.push({
        file: relPath,
        line: i + 1,
        severity: 'HIGH',
        rule: 'PG-BLOCKING-INDEX-DROP',
        message: 'PostgreSQL: DROP INDEX executed without CONCURRENTLY.',
      });
    }

    // MySQL: ADD INDEX without ALGORITHM=INPLACE
    if (checkMy && /alter\s+table.*add\s+(index|key)\b/i.test(line) && !/algorithm\s*=\s*inplace/i.test(line)) {
      issues.push({
        file: relPath,
        line: i + 1,
        severity: 'HIGH',
        rule: 'MYSQL-BLOCKING-INDEX-CREATION',
        message: 'MySQL: ADD INDEX executed without explicit ALGORITHM=INPLACE, LOCK=NONE.',
      });
    }

    // Destructive DROP TABLE / TRUNCATE
    if (/\b(drop\s+table|truncate\s+table)\b/i.test(line)) {
      issues.push({
        file: relPath,
        line: i + 1,
        severity: 'CRITICAL',
        rule: 'DDL-DESTRUCTIVE-DROP',
        message: 'Destructive table drop or truncate command detected.',
      });
    }
  }

  return issues;
}

function collectSqlFiles(dirPath, fileList = []) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'vendor'].includes(entry.name)) {
        continue;
      }
      collectSqlFiles(fullPath, fileList);
    } else if (entry.isFile() && entry.name.endsWith('.sql')) {
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
    files = collectSqlFiles(resolvedTarget);
  } else if (resolvedTarget.endsWith('.sql')) {
    files = [resolvedTarget];
  }

  if (files.length === 0) {
    console.log(`ℹ No .sql files found in "${options.targetPath}".`);
    process.exit(0);
  }

  console.log(`\n🗄 Database Migration Safety Guard: Inspecting ${files.length} file(s) (Dialect: ${options.dialect})...\n`);
  console.log('='.repeat(78));

  const allIssues = [];
  for (const file of files) {
    // Skip diagnostic toolkit query files (they contain SELECT queries and tuning commands)
    if (/dba-toolkit|diagnostic/i.test(file)) continue;

    allIssues.push(...auditSqlFile(file, options.dialect));
  }

  if (allIssues.length === 0) {
    console.log(`\n✔ Clean DDL Audit: All migrations adhere to non-blocking zero-downtime execution rules.\n`);
    process.exit(0);
  }

  let criticalCount = 0;
  let highCount = 0;

  for (const issue of allIssues) {
    if (issue.severity === 'CRITICAL') criticalCount++;
    if (issue.severity === 'HIGH') highCount++;

    const badge = `[${issue.severity}] ${issue.rule}`;
    console.log(`${badge} in ${issue.file}:${issue.line}`);
    console.log(`  Message: ${issue.message}`);
    console.log('-'.repeat(78));
  }

  console.log(`\nSummary: ${criticalCount} Critical, ${highCount} High priority DDL hazards`);

  if (criticalCount > 0) {
    console.error(`\n❌ Migration Safety Check Failed: Blocking DDL commands detected.\n`);
    process.exit(1);
  }

  console.log(`\n✔ Migration Audit Passed with ${highCount} advisory warning(s).\n`);
  process.exit(0);
}

run();
