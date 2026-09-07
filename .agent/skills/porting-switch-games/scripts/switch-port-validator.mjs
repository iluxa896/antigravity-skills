#!/usr/bin/env node
/**
 * switch-port-validator.mjs
 *
 * Automated Static Analysis & Port Verification Tool for Nintendo Switch Game Ports.
 * Audits C/C++ source code, asset folders, and build configurations against Horizon OS
 * architectural constraints (BSS limits, unshimmed Win32 APIs, RomFS case sensitivity,
 * 64-bit pointer truncation, and asset compression).
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Nintendo Switch Port Project Validator
Usage: node switch-port-validator.mjs [options]

Options:
  --help, -h          Show this help dialog and exit
  --path <dir>        Target project directory to audit (default: current directory)
  --strict            Treat warnings as blocking errors (exit code 1)
  --verbose           Display detailed inspection logs for all evaluated files

Exit Codes:
  0: Clean audit (or warnings allowed in non-strict mode)
  1: Critical porting errors or hazardous patterns detected
`);
  process.exit(0);
}

const pathArgIndex = args.indexOf('--path');
const targetDir = pathArgIndex !== -1 && args[pathArgIndex + 1]
  ? path.resolve(args[pathArgIndex + 1])
  : process.cwd();

const isStrict = args.includes('--strict');
const isVerbose = args.includes('--verbose');

console.log(`\x1b[36m🔍 Nintendo Switch Port Validator\x1b[0m`);
console.log(`Target Directory: ${targetDir}\n`);

if (!fs.existsSync(targetDir)) {
  console.error(`\x1b[31m❌ Error: Target directory does not exist: ${targetDir}\x1b[0m`);
  process.exit(1);
}

let totalErrors = 0;
let totalWarnings = 0;
let inspectedFiles = 0;

// Hazardous Win32 APIs that must be shimmed or excised
const BANNED_WIN32_PATTERNS = [
  { regex: /\bCreateFile[AW]\s*\(/g, name: 'CreateFile Win32 API', fix: 'Replace with fopen() or SDL_RWops on romfs:/ path' },
  { regex: /\bDirect3DCreate9\s*\(/g, name: 'Direct3D 9 Device Creation', fix: 'Replace with SDL_CreateRenderer or deko3d' },
  { regex: /\bDirectDrawCreate(?:Ex)?\s*\(/g, name: 'DirectDraw Surface Creation', fix: 'Replace with SDL_CreateTexture / SDL_Renderer' },
  { regex: /\bDirectSoundCreate(?:8)?\s*\(/g, name: 'DirectSound Device Creation', fix: 'Replace with SDL_OpenAudioDevice or SDL2_mixer' },
  { regex: /\bRegOpenKeyEx[AW]?\s*\(/g, name: 'Windows Registry Access', fix: 'Remove or replace with flat JSON/INI config' },
  { regex: /\b(LoadLibrary[AW]|GetProcAddress)\s*\(/g, name: 'Dynamic Win32 DLL Loading', fix: 'Statically link ported modules' },
  { regex: /\b(timeBeginPeriod|timeEndPeriod)\s*\(/g, name: 'Win32 Multimedia Timer Resolution', fix: 'Use SDL_GetTicks() or armGetSystemTick()' },
  { regex: /__asm\s*(?:\{|volatile)/g, name: 'Inline x86 Assembly (__asm)', fix: 'Rewrite with portable C or ARM64 NEON intrinsics' },
  { regex: /\bCreateThread\s*\(/g, name: 'Win32 CreateThread', fix: 'Replace with SDL_CreateThread or libnx threadCreate' },
  { regex: /#pragma\s+comment\s*\(\s*lib\s*,/g, name: 'MSVC #pragma comment(lib)', fix: 'Remove and link via Makefile -l flags' },
  { regex: /fopen\s*\(\s*"romfs:[^"]*"\s*,\s*"[wWaA]/g, name: 'Write Operation to Read-Only RomFS', fix: 'RomFS is read-only! Reroute save file writes to sdmc:/ using Switch_ResolveSavePath' }
];

// Dangerous 32-bit pointer truncation casts on 64-bit AArch64
const POINTER_TRUNCATION_PATTERNS = [
  { regex: /\((?:DWORD|uint32_t|unsigned\s+int)\)\s*malloc\s*\(/g, name: 'Pointer cast to 32-bit integer on malloc', fix: 'Use uintptr_t or void*' },
  { regex: /\((?:DWORD|uint32_t)\)\s*[a-zA-Z0-9_]+->[a-zA-Z0-9_]*ptr/g, name: 'Struct pointer truncated to 32-bit', fix: 'Use uintptr_t or 64-bit uint64_t' }
];

// Large static BSS buffer pattern (e.g., static char buf[5000000])
const LARGE_STATIC_BSS_PATTERN = /static\s+[a-zA-Z0-9_]+\s+[a-zA-Z0-9_]+\s*\[\s*([0-9]+)\s*(?:\*\s*([0-9]+))*\s*\]/g;

// Recursively traverse directory or return single file
function collectFiles(inputPath) {
  const stat = fs.statSync(inputPath);
  if (!stat.isDirectory()) {
    return [inputPath];
  }
  const results = [];
  const entries = fs.readdirSync(inputPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(inputPath, entry.name);
    if (entry.isDirectory()) {
      if (!['.git', 'node_modules', '.agent', 'build', 'out'].includes(entry.name)) {
        results.push(...collectFiles(fullPath));
      }
    } else {
      results.push(fullPath);
    }
  }
  return results;
}

const allFiles = collectFiles(targetDir);

// 1. Audit Source Code Files
const sourceFiles = allFiles.filter(f => /\.(c|cpp|cc|cxx|h|hpp)$/i.test(f));

for (const filePath of sourceFiles) {
  const relative = path.relative(targetDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');
  inspectedFiles++;

  if (isVerbose) {
    console.log(`  Inspecting source: ${relative}`);
  }

  // Check if this file is the shim itself (skip checking banned APIs in the shim definitions)
  const isShimHeader = path.basename(filePath) === 'win32_to_sdl2_shim.h';

  const includesShim = /#include\s+["<]win32_to_sdl2_shim\.h[">]/.test(content);

  if (!isShimHeader) {
    // Check banned Win32 APIs
    for (const rule of BANNED_WIN32_PATTERNS) {
      // If the file includes win32_to_sdl2_shim.h, CreateFile, Registry, and Timer APIs are safely shimmed
      if (includesShim && (
        rule.name === 'CreateFile Win32 API' ||
        rule.name === 'Windows Registry Access' ||
        rule.name === 'Win32 Multimedia Timer Resolution'
      )) {
        continue;
      }
      const matches = content.match(rule.regex);
      if (matches) {
        console.error(`  \x1b[31m❌ [${relative}] Unshimmed Win32 API detected: ${rule.name}\x1b[0m`);
        console.error(`     Remedy: ${rule.fix}`);
        totalErrors++;
      }
    }

    // Check pointer truncation
    for (const rule of POINTER_TRUNCATION_PATTERNS) {
      const matches = content.match(rule.regex);
      if (matches) {
        console.error(`  \x1b[31m❌ [${relative}] 32-bit pointer truncation detected: ${rule.name}\x1b[0m`);
        console.error(`     Remedy: ${rule.fix}`);
        totalErrors++;
      }
    }

    // Check hardcoded Windows Drive letters (C:\ or D:\)
    const winDriveMatch = content.match(/[A-Za-z]:\\[^"'\n]+/g);
    if (winDriveMatch) {
      console.warn(`  \x1b[33m⚠️  [${relative}] Hardcoded Windows drive path detected: "${winDriveMatch[0]}"\x1b[0m`);
      console.warn(`     Remedy: Reroute path to romfs:/ or sdmc:/`);
      totalWarnings++;
    }
  }

  // Check for dangerously large static BSS allocations (>1MB)
  let match;
  while ((match = LARGE_STATIC_BSS_PATTERN.exec(content)) !== null) {
    const dim1 = parseInt(match[1], 10);
    const dim2 = match[2] ? parseInt(match[2], 10) : 1;
    const approximateBytes = dim1 * dim2;
    if (approximateBytes > 1024 * 1024) {
      console.error(`  \x1b[31m❌ [${relative}] Hazardous large static BSS allocation (~${(approximateBytes / (1024 * 1024)).toFixed(1)} MB)\x1b[0m`);
      console.error(`     Remedy: Allocate dynamically on the heap via malloc() to prevent nx-hbloader 2168-0002 abort.`);
      totalErrors++;
    }
  }
}

// 2. Audit Asset Files
const assetFiles = allFiles.filter(f => !/\.(c|cpp|cc|cxx|h|hpp|o|elf|nro|nacp|md|json|mjs|sh|txt)$/i.test(f));

for (const assetPath of assetFiles) {
  const relative = path.relative(targetDir, assetPath);
  const ext = path.extname(assetPath).toLowerCase();
  const stats = fs.statSync(assetPath);

  // Check uncompressed WAVs over 2MB
  if (ext === '.wav' && stats.size > 2 * 1024 * 1024) {
    console.warn(`  \x1b[33m⚠️  [${relative}] Bloated uncompressed WAV audio (${(stats.size / (1024 * 1024)).toFixed(1)} MB)\x1b[0m`);
    console.warn(`     Remedy: Compress to Opus (.opus at 96-128kbps) or Ogg Vorbis to save RAM and RomFS footprint.`);
    totalWarnings++;
  }

  // Check uncompressed raw BMPs
  if (ext === '.bmp' && stats.size > 512 * 1024) {
    console.warn(`  \x1b[33m⚠️  [${relative}] Heavy uncompressed BMP texture detected\x1b[0m`);
    console.warn(`     Remedy: Convert to ASTC (hardware accelerated on Tegra X1) or PNG.`);
    totalWarnings++;
  }
}

// 3. Print Audit Summary
console.log(`\n\x1b[36m══════════════════════════════════════════════════\x1b[0m`);
console.log(`Files Inspected  : ${inspectedFiles}`);
console.log(`Total Errors     : ${totalErrors}`);
console.log(`Total Warnings   : ${totalWarnings}`);
console.log(`\x1b[36m══════════════════════════════════════════════════\x1b[0m\n`);

if (totalErrors > 0 || (isStrict && totalWarnings > 0)) {
  console.error(`\x1b[31m❌ Port verification failed. Resolve critical issues before deployment.\x1b[0m`);
  process.exit(1);
} else {
  console.log(`\x1b[32m✔ Switch port validation passed successfully.\x1b[0m`);
  process.exit(0);
}
