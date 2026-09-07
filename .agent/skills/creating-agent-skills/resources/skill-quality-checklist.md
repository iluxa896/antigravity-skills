# Skill Quality & Audit Checklist

Use this checklist to audit existing skills or verify newly created skills before marking tasks complete.

---

## 1. Directory Structure & Naming Standard

- [ ] **Directory Location**: Located inside `.agent/skills/<skill-name>/` or `.agents/skills/<skill-name>/`.
- [ ] **No Loose Files**: No standalone `.md` files exist directly in `.agent/skills/`.
- [ ] **Naming Convention**: Directory name matches `^[a-z0-9]+(-[a-z0-9]+)*$` and is in gerund form (`managing-...`, `developing-...`, `configuring-...`).
- [ ] **Core File**: `SKILL.md` is present at the root of the skill folder.
- [ ] **Subdirectories**: Supporting files are properly organized into `examples/`, `resources/`, `references/`, and `scripts/`.

---

## 2. YAML Frontmatter Standards

- [ ] **Frontmatter Delimiters**: Starts on line 1 with `---` and closes with `---`.
- [ ] **Name Field**:
  - Exactly matches the folder name.
  - Max 64 characters.
  - Lowercase, hyphens, alphanumeric only.
- [ ] **Description Field**:
  - Written in the third person (`Provides...`, `Audits...`, `Configures...`).
  - Max 1024 characters.
  - Contains clear operational scope.
  - Contains explicit triggers: `Use when [specific keywords, scenarios, tasks, file types]`.
  - Avoids overly broad triggers that cause false-positive activations across unrelated tasks.

---

## 3. Content Architecture & Progressive Disclosure

- [ ] **Line Count**: `SKILL.md` is under 400 lines (hard ceiling: 500 lines).
- [ ] **Signal-to-Noise Ratio**:
  - No generic educational tutorials (does not explain standard syntax or introductory concepts).
  - Focuses on enterprise patterns, hard-earned gotchas, edge cases, and deterministic procedures.
- [ ] **Path Formatting**: All file links use forward slashes (`/`) and valid relative paths (e.g., `[Example](./examples/my-example.ts)`).
- [ ] **Degrees of Freedom**:
  - High-freedom tasks use heuristic bullet points.
  - Medium-freedom tasks use schemas and code templates.
  - Low-freedom tasks use explicit, copy-paste-safe commands and scripts.

---

## 4. Code & Reference Integrity (Zero Placeholder Policy)

- [ ] **Production-Ready Code**: All files in `examples/` are complete and syntactically valid.
- [ ] **No Placeholders**: Zero instances of `// TODO`, `// Implement here`, `/* ... */`, or dummy stubs.
- [ ] **Strict Typing**: Code examples use strict types, interfaces, and explicit method signatures.
- [ ] **Stack Isolation**: Examples are named with technology prefixes (e.g., `laravel-*`, `vue-*`, `postgres-*`) to enable stack-matching extraction.

---

## 5. Scripts & Automation (If Applicable)

- [ ] **Help Flag**: Any helper scripts in `scripts/` implement a `--help` option or clear usage output.
- [ ] **Deterministic Exit Codes**: CLI scripts explicitly call `process.exit(0)` on success and `process.exit(1)` on error (or language equivalent).
- [ ] **Cross-Platform Compatibility**: Avoid platform-exclusive assumptions unless explicitly declared.

---

## 6. Automated Verification

- [ ] Run the skill validation script to ensure all structural and frontmatter constraints pass:
  ```bash
  node .agent/skills/creating-agent-skills/scripts/validate-skills.mjs
  ```
- [ ] Verify that the skill is recognized and indexed in the agent's `<skills>` context.
