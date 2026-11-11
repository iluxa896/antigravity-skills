---
name: game-localization-pipeline
description: >-
  Comprehensive, engine-agnostic runbook and methodology for reverse-engineering,
  extracting, translating via agent swarms (zero external APIs), binary-repacking,
  and packaging console game localizations (e.g., Nintendo Switch Atmosphere LayeredFS,
  PlayStation, PC). Use whenever working on game translation, RomFS unpacking/repacking,
  font metric patching, UI layout fitting, IL2CPP metadata safety, or UI asset branding.
---

# Universal Game Localization & Console Modding Pipeline

This skill defines the standardized, zero-defect methodology for localizing video games across any engine (Unity, Unreal Engine, Godot, RPG Maker, or proprietary engines) and targeting console or PC modding environments (such as Nintendo Switch Atmosphere LayeredFS).

---

## Phase 1: Environment & Source RomFS Reconstruction
1. **Version Delta & Compressed Relocation Reconciliation**:
   - Reconstruct the complete target asset tree by layering Update/Patch data over the Base Game (resolving compressed archives e.g. `nsz -D` and programmatic delta relocation/BKTR tables when legacy CLI tools fail on sparse virtual/physical section sizes).
   - Strictly track **Base Title ID vs. Update Title ID**. In Atmosphere LayeredFS, mod directories ALWAYS use the **Base Title ID** (`atmosphere/contents/<BASE_TITLE_ID>/romfs/...`).
2. **Clean Baseline Rebuilds & Isolated Tooling**:
   - Run all tooling strictly inside an isolated project environment (e.g., `.venv`, portable tools in `.tools/`). Never pollute the host OS.
   - Purge temporary intermediate archives (`temp_nca/`, raw unmerged dumps) while retaining clean unpacked baseline assets (`extracted/`) and keys excluded by `.gitignore`.
   - **Clean Rebuild Rule**: Scene and asset repacking MUST always read from pristine unpacked baseline sources (`src_data`) rather than re-reading dirty output artifacts (`dst_data`), preventing stale edit persistence and repeated double-patching. Only multi-stage combined bundles should inherit prior-stage text while still sourcing baseline font/binary payloads from `src_data`.

---

## Phase 2: Full-Spectrum Discovery, Binary Callgraph & Safety Shielding
1. **Never Assume a Single Text Container (Static vs. Runtime Overrides)**:
   - Games split text across story scripts, database binaries, UI widgets/prefabs, and runtime localization tables inside compiled executable metadata (e.g., Unity IL2CPP `global-metadata.dat`, `.pak`/`.uasset` string tables).
   - Detect scripts/components on UI objects (e.g., `LocaleText` / dynamic localization IDs) that **overwrite** static prefab strings at runtime (`Awake`/`OnEnable`); always pair and synchronize both the static fallback and its runtime lookup string.
2. **Executable & Metadata Safety Gate (Mandatory Anti-Crash Analysis)**:
   - Compiled metadata pools frequently co-locate UI strings with **internal engine keys** (binary table section names, `AssetBundle` prefixes, `AudioMixer` groups, sorting layers, network/BCL constants). Overwriting a single shared key causes fatal boot aborts (e.g., `0x4A8 Data Abort`).
   - **BEFORE modifying executable/metadata string pools**: Trace executable cross-references, relocation slots, and localization switch/jump tables (e.g., AArch64 `ADRP+LDR`, `.rela.dyn`, callgraph BFS) to distinguish pure UI literals from engine keys.
   - Maintain a single-source-of-truth **protected-index blocklist** (`FORBIDDEN_LITERAL_INDICES`) with fail-fast rejection in the repacker/validator and post-build bit-for-bit verification of all protected literals, identifier string pools, and trailing metadata tables.
3. **Discrete Tag Shielding & Binary Denoising**:
   - Reverse-engineer exact control-code grammars rather than using greedy regexes (avoid corrupting inline tokens attached directly to words, e.g., `%rzombies`). Retain cross-lingual original source references (e.g., JP + EN) alongside UI hierarchy paths.
   - Filter binary noise (IEEE-754 floats, bone/clip identifiers) when scanning raw binary buffers, and maintain strict 1:1 multiset tag parity tests.

---

## Phase 3: Pure Agentic Translation Swarm (Strictly Zero External APIs)
1. **Strictly In-Agent Swarm (No External Machine Translation APIs)**:
   - **MANDATORY**: Translation MUST be performed entirely by local LLM subagents within the workspace.
   - **STRICTLY FORBIDDEN**: Using external translation APIs (Google Translate, DeepL, Bing, or third-party endpoints).
2. **Parallel Chunking, Glossary & Validation Guardrails**:
   - Partition large corpora into structured JSON chunks anchored by a unified domain glossary.
   - Enforce automated validation: 100% non-empty coverage where required, blank/script-key passthrough invariance, tag stack balancing, boundary whitespace parity, zero Cyrillic homoglyphs inside ASCII tags, and dialogue box geometry limits.

---

## Phase 4: Font Aesthetics, Proportionality & Preload Safety
1. **Verify Both `cmap` Coverage AND Horizontal Metrics (`hmtx` / `glyf`)**:
   - Do not assume native Cyrillic `cmap` support guarantees readable typography. Retro/CJK pixel fonts often assign **full-width Zenkaku metrics** (1000/2048 UPM with wide whitespace side bearings) to Cyrillic while Latin uses compact proportional metrics, causing sparse typography and severe UI overflows.
2. **Proportional In-Place Metric Remediation (Avoid Foreign Font Injections)**:
   - Prefer surgically patching the native embedded font binary (`TTFont` inside native `Font` buffers) over injecting foreign fonts/`TMP_FontAsset` pointers (which frequently triggers `PreloadManager` boot crashes on consoles).
   - **Idempotent Bounds Recalculation**: Always recompute glyph bounding boxes (`recalcBounds`) before measuring/shifting horizontal coordinates (`dx = target_lsb - xmin`, `dy = 0`) and setting proportional `advanceWidth = target_lsb + width + target_rsb`. Verify idempotency across repeated passes and empirically rasterize ASCII + target alphabet codepoints via FreeType to confirm 0 missing glyphs and crisp spacing.

---

## Phase 5: Surgical Binary Repacking & Alignment Invariants
1. **Minimal Surgical Diffs & Buffer Tracking**:
   - Modify ONLY targeted fields/objects; preserve all untouched objects, TypeTree flags (e.g., Unity Switch `platform 38`, `_enable_type_tree = False`), trailing metadata, and native streaming containers (`.resS`, `.pak`) bit-for-bit.
   - Enforce strict binary alignment (4-byte string padding, 8-byte object alignment, updating section size/offset deltas deterministically).
   - When chaining multiple patches onto one object in a single save pass (e.g., text + layout/font updates), pass explicit in-memory byte buffers (`modified_raws`) rather than re-reading pre-flush library wrappers.

---

## Phase 6: UI Container Geometry, Layout Patching & Live Bounds Audits
1. **Audit Active Runtime Geometry Against Live Font Metrics**:
   - Trace the active scene graph / sibling indices (`Canvas` hierarchies, `LayoutGroup` cells, active vs. unused debug/IAP prefabs) and inspect live serialized UI bytes—never rely on stale inspection JSONs or naive character-count estimates.
   - Measure rendered pixel width and wrapped height of **both static fallbacks and runtime-resolved strings** (including whitespace breakpoints before variable tokens like `【置換：...】`) under the real font's pixel metrics, UI scale, overflow modes (`Wrap`/`Truncate`), and true engine line-height ratio (`Font.m_LineSpacing / m_FontSize`).
2. **Surgical Layout Component Adjustments**:
   - Where authentic translated copy still exceeds rigid containers (e.g., fixed tabs, headers, grid cells), either adapt copy cleanly or surgically patch `m_FontSize` / overflow fields directly in serialized component buffers while preserving surrounding binary layout intact.

---

## Phase 7: LayeredFS Packaging, Negative Testing & Anti-Cheat QA
1. **Minimal Mod Footprint & Clean Deployment Hygiene**:
   - Stage ONLY genuinely modified assets under the Base Title ID directory (`atmosphere/contents/<BASE_TITLE_ID>/romfs/...`).
   - Remind users to **delete the previous mod folder cleanly** before copying an updated build onto console/SD storage so obsolete or mismatched files never persist across builds.
2. **Honest Adversarial Verification Suite (Zero Test Gaming)**:
   - Require automated `pytest` verification covering:
     * Critical executable/lookup path simulation against staged binaries (e.g., binary section tables, runtime lookup tables, bit-exact protected literals).
     * Negative/boundary tests on patchers (short/corrupt buffers, forbidden literal rejection, non-multiple-of-4 padding).
     * Reload fidelity deserializing final staged files, 8-byte alignment across 100% of serialized objects, FreeType glyph rendering without vacuous fallbacks (never `assert ... or True`), and live runtime pixel-fit assertions.
