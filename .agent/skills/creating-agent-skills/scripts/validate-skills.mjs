#!/usr/bin/env node
/**
 * Antigravity Skills Automated Validator
 *
 * Verifies directory structure, YAML frontmatter standards, line budgets,
 * and relative link integrity across all skills in .agent/skills/.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Print usage help if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Antigravity Skills Automated Validator
Usage: node validate-skills.mjs [options]

Options:
  --help, -h       Show this help message and exit
  --dir <path>     Custom path to skills directory (defaults to .agent/skills)

Exit codes:
  0: All skills valid
  1: Validation errors detected
`);
  process.exit(0);
}

// Resolve skills directory
const customDirIndex = process.argv.indexOf('--dir');
let skillsDir;
if (customDirIndex !== -1 && process.argv[customDirIndex + 1]) {
  skillsDir = path.resolve(process.argv[customDirIndex + 1]);
} else {
  skillsDir = path.resolve(__dirname, '../../');
}

console.log(`\x1b[36m🔍 Inspecting Antigravity Skills in: ${skillsDir}\x1b[0m\n`);

if (!fs.existsSync(skillsDir)) {
  console.error(`\x1b[31m❌ Error: Skills directory does not exist: ${skillsDir}\x1b[0m`);
  process.exit(1);
}

const entries = fs.readdirSync(skillsDir, { withFileTypes: true });
let totalErrors = 0;
let totalWarnings = 0;
let validatedSkills = 0;

// 1. Check for invalid loose files in skills root
for (const entry of entries) {
  if (entry.isFile() && entry.name.endsWith('.md')) {
    console.warn(`\x1b[33m⚠️  Warning: Found loose markdown file in skills root: ${entry.name}\x1b[0m`);
    console.warn(`   Skills must be isolated directories with a SKILL.md file. This file will NOT be indexed by Antigravity.`);
    totalWarnings++;
  }
}

// 2. Validate each skill directory
for (const entry of entries) {
  if (!entry.isDirectory()) continue;

  const skillName = entry.name;
  const skillPath = path.join(skillsDir, skillName);
  const skillFile = path.join(skillPath, 'SKILL.md');

  console.log(`\x1b[34m📦 Validating skill: ${skillName}\x1b[0m`);
  let skillErrors = 0;

  // Check SKILL.md existence
  if (!fs.existsSync(skillFile)) {
    console.error(`  \x1b[31m❌ Missing SKILL.md in ${skillName}/\x1b[0m`);
    totalErrors++;
    continue;
  }

  const content = fs.readFileSync(skillFile, 'utf8');
  const lines = content.split('\n');

  // Check line count budget (<500 lines)
  if (lines.length > 500) {
    console.error(`  \x1b[31m❌ SKILL.md exceeds 500 lines (${lines.length} lines). Offload details to references/ or examples/.\x1b[0m`);
    skillErrors++;
  } else if (lines.length > 400) {
    console.warn(`  \x1b[33m⚠️  Warning: SKILL.md is close to limit (${lines.length} lines). Recommended under 400 lines.\x1b[0m`);
    totalWarnings++;
  }

  // Parse YAML Frontmatter
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    console.error(`  \x1b[31m❌ Missing or malformed YAML frontmatter at beginning of SKILL.md\x1b[0m`);
    skillErrors++;
  } else {
    const frontmatter = frontmatterMatch[1];

    // Check name
    const nameMatch = frontmatter.match(/^name:\s*([^\r\n]+)/m);
    if (!nameMatch) {
      console.error(`  \x1b[31m❌ Missing 'name' field in frontmatter\x1b[0m`);
      skillErrors++;
    } else {
      const declaredName = nameMatch[1].trim();
      const gerundRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
      if (!gerundRegex.test(declaredName)) {
        console.error(`  \x1b[31m❌ Invalid name format: '${declaredName}'. Must be lowercase hyphenated alphanumeric.\x1b[0m`);
        skillErrors++;
      }
      if (declaredName !== skillName) {
        console.warn(`  \x1b[33m⚠️  Mismatch: Directory name '${skillName}' differs from frontmatter name '${declaredName}'.\x1b[0m`);
        totalWarnings++;
      }
    }

    // Check description
    const descMatch = frontmatter.match(/description:\s*(?:>-|>|\|)?\r?\n?([\s\S]*?)(?=\n[a-z0-9_-]+:|$)/i);
    if (!descMatch || !descMatch[1].trim()) {
      console.error(`  \x1b[31m❌ Missing or empty 'description' in frontmatter\x1b[0m`);
      skillErrors++;
    } else {
      const descText = descMatch[1].replace(/\r?\n\s*/g, ' ').trim();
      if (descText.length > 1024) {
        console.error(`  \x1b[31m❌ Description exceeds 1024 characters (${descText.length} chars).\x1b[0m`);
        skillErrors++;
      }
      if (!descText.toLowerCase().includes('use when')) {
        console.warn(`  \x1b[33m⚠️  Frontmatter description should include an explicit 'Use when...' trigger statement.\x1b[0m`);
        totalWarnings++;
      }
    }
  }

  // Check relative links in SKILL.md
  const linkMatches = [...content.matchAll(/\[([^\]]+)\]\(((\.\/|\.\.\/)[^)]+)\)/g)];
  for (const match of linkMatches) {
    const linkPath = match[2].split('#')[0]; // strip hash
    if (!linkPath) continue;
    const resolvedPath = path.resolve(skillPath, linkPath);
    if (!fs.existsSync(resolvedPath)) {
      console.error(`  \x1b[31m❌ Dead relative link in SKILL.md: ${linkPath} (Target not found: ${resolvedPath})\x1b[0m`);
      skillErrors++;
    }
  }

  if (skillErrors === 0) {
    console.log(`  \x1b[32m✔ Valid\x1b[0m (${lines.length} lines)`);
  } else {
    totalErrors += skillErrors;
  }
  validatedSkills++;
}

console.log(`\n\x1b[36m══════════════════════════════════════════════════\x1b[0m`);
console.log(`Skills Validated : ${validatedSkills}`);
console.log(`Total Errors     : ${totalErrors}`);
console.log(`Total Warnings   : ${totalWarnings}`);
console.log(`\x1b[36m══════════════════════════════════════════════════\x1b[0m\n`);

if (totalErrors > 0) {
  console.error(`\x1b[31m❌ Skill validation failed with ${totalErrors} error(s).\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✔ All skills passed structural and frontmatter validation.\x1b[0m`);
  process.exit(0);
}
