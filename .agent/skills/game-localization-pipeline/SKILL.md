---
name: game-localization-pipeline
description: >-
  Comprehensive, engine-agnostic runbook and methodology for reverse-engineering,
  extracting, translating via agent swarms (zero external APIs), binary-repacking,
  and packaging console game localizations (e.g., Nintendo Switch Atmosphere LayeredFS,
  PlayStation, PC). Use whenever working on game translation, RomFS unpacking/repacking,
  font integration, or UI asset branding.
---

# Universal Game Localization & Console Modding Pipeline

This skill defines the standardized, zero-defect methodology for localizing video games across any engine (Unity, Unreal Engine, Godot, or proprietary engines) and targeting console modding environments (such as Nintendo Switch Atmosphere LayeredFS).

---

## Phase 1: Environment & Source RomFS Reconstruction
1. **Version Delta Reconciliation**:
   - Always reconstruct the full target RomFS by layering Update/Patch files over the Base Game.
   - Strictly note Base Title ID vs. Update Title ID. In Atmosphere LayeredFS, mod directories ALWAYS use the **Base Title ID** (`atmosphere/contents/<BASE_TITLE_ID>/romfs/...`).
2. **Clean Virtual Environment**:
   - Run all scripts strictly within isolated project virtual environments (e.g., `.venv`). Never install global system packages.

---

## Phase 2: Full-Spectrum Text Discovery (Forensic Audit)
1. **Never Assume a Single Text Container**:
   - Games often split text: system UI in one manager, quests in another, and cutscenes/dialogues scattered across serialized scene assets or script containers.
   - Always run an automated forensic scanner across ALL unpacked assets before finalizing the translation scope.
2. **Tag & Markup Shielding**:
   - Parse and catalog all control codes: BBCode, Unity RichText, formatting tags (`[c=N]`, `[p=N]`, `\n`, color codes, variable placeholders `{0}`).
   - Maintain a 1:1 tag count assertion in tests to ensure translations never break formatting or script parsers.

---

## Phase 3: Pure Agentic Translation Swarm (Strictly Zero External APIs)
1. **Strictly In-Agent Swarm (No External Machine Translation APIs)**:
   - **MANDATORY**: Translation MUST be performed entirely by LLM subagents within the workspace.
   - **STRICTLY FORBIDDEN**: Using external translation APIs (Google Translate, DeepL, Bing, or third-party web translation endpoints). No external API keys, tokens, or rate-limited network endpoints.
   - **Why Agentic Swarm**:
     * High literary quality and natural RPG character voice.
     * Deep understanding of context, game lore, gender forms, and terminology.
     * 100% deterministic control over formatting codes, escape sequences, and markup tags.
     * Complete offline autonomy and privacy without reliance on third-party services.
2. **Parallel Subagent Chunking**:
   - Divide large corpora (thousands of strings) into atomic, structured JSON chunks with shared glossaries.
   - Dispatch parallel translator subagents with distinct personas (e.g., RPG character voice, lore consistency auditor).
   - Require automated post-translation validation: 100% string coverage, 0 untranslated strings, 0 tag mismatches.

---

## Phase 4: Font Safety & Crash Prevention (Preload Integrity)
1. **Native Font Cyrillic Verification First**:
   - Before attempting to inject custom fonts (which frequently crashes console memory managers like `PreloadManager` due to illegal class/type pointers), dump and test the game's existing fonts. Many modern engines bundle Noto or broad Unicode glyph sets natively.
2. **Font Fallback Invariance**:
   - Never inject alien `MonoBehaviour` or `TMP_FontAsset` pointers into core game bundles (`resources.assets`, engine defaults) unless proven 100% bit-compatible with the console's IL2CPP runtime.

---

## Phase 5: Surgical Binary Repacking & Alignment Invariants
1. **Minimal Surgical Diffs (Surgical Injection)**:
   - Modify ONLY the specific target objects. Retain all untouched objects with 100% bit-for-bit invariance.
   - Enforce strict engine memory alignment (4-byte string padding, 8-byte object alignment).
   - For platforms without TypeTrees (e.g. Nintendo Switch IL2CPP), preserve exact TypeTree metadata flags (`_enable_type_tree = False`, target platform 38).
2. **Preserve Native Streaming & Container Formats**:
   - If an asset is designed to stream from companion files (`.resS`, `.pak`, etc.), understand whether the console runtime allows inline data or requires streamed byte offsets.
   - Avoid creating massive mod packages (hundreds of MBs) if an embedded or surgical modification can achieve the result with zero overhead.

---

## Phase 6: UI & Scene Hierarchy Forensics (Branding & Graphics)
1. **Trace the Real Active Screen**:
   - Never guess asset names (e.g., a file named `DR_Logo` might belong to an in-game minigame rather than the title screen).
   - Inspect the actual Scene graph / GameObject hierarchy to identify which component and texture actually renders on screen.
2. **Layer Rendering & Sibling Index Audit**:
   - Inspect Sibling Indices in Canvas / Scene hierarchies.
   - Verify whether background layers (`Sibling Index 0`) are occluded by foreground dynamic elements (e.g., animated characters, dragons, particle effects).
   - Always run visual simulation / coordinate checks to ensure added badges or banners are clearly visible and aesthetically integrated.

---

## Phase 7: LayeredFS Mod Packaging & Minimal Footprint
1. **Strict Exclusion of Forbidden / High-Risk Files**:
   - Mod directories must contain ONLY genuinely modified assets.
   - Never leave unneeded companion files, intermediate drafts, or risky engine bundles (`resources.assets`).
2. **Automated Adversarial Verification Suite**:
   - Require automated pytest suites covering:
     * 100% translation tag counts.
     * PathID set invariance (0 foreign, 0 dropped).
     * Reload fidelity (deserializing modded asset back through engine reader yields exact target data).
     * Mod directory file count and forbidden file exclusion assertions.
