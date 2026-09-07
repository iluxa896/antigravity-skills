---
name: porting-switch-games
description: >-
  Provides expert game porting, decompilation, binary triage, and cross-compilation workflows
  for porting PC (Win32/x86, C/C++, Unity, GameMaker, Godot) and retro console games to native
  Nintendo Switch homebrew (libnx, SDL2, deko3d). Enforces memory budgeting (3.2GB Title Takeover limit),
  ASTC/Opus asset optimization, Win32-to-SDL2 shimming, and devkitA64 toolchains. Use when reverse
  engineering game binaries, porting PC games to Nintendo Switch, compiling homebrew (.nro/.nsp),
  decompiling with Ghidra/dnSpy/UndertaleModTool, or fixing nx-hbloader crashes.
---

# Nintendo Switch Game Porting & Reverse Engineering (Master Skill)

## When to use this skill
- Analyzing unknown PC game executables (`.exe`), assets (`.pak`, `data.win`), or ROMs to determine their engine stack.
- Decompiling x86 Win32 game logic with Ghidra or extracting C# assemblies with dnSpy / Il2CppDumper.
- Shimming legacy Windows subsystems (GDI, DirectDraw, DirectSound, Win32 message loops) to `SDL2` and `libnx`.
- Mapping Nintendo Switch Joy-Con / Pro Controller inputs, touch screen, and accelerometer to game controls.
- Optimizing game assets for Horizon OS (ASTC texture compression, Opus audio encoding, RomFS packaging).
- Diagnosing Horizon OS abort errors and panics (`2168-0002`, `2162-0002`, `2002-3005`).
- Auditing ported projects with the automated validator tool (`scripts/switch-port-validator.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Architecture & Strategy Selection | Selecting porting strategy (native source port vs Ghidra decompile vs static recompilation vs Wine/Box64 on L4T Linux). |
| **Medium Freedom** | Input Mapping & Subsystem Shims | Mapping Joy-Con buttons to game actions, configuring virtual resolutions, organizing RomFS directory hierarchies. |
| **Low Freedom** | Compiler Flags & Horizon OS Constraints | devkitA64 flags (`-march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft`), Title Takeover memory limits (3.2GB vs 400MB Applet mode), eliminating static BSS bloat, RomFS mount syntax (`romfsInit()`). |

---

## 2. Phased Porting Workflow

```markdown
- [ ] Phase 1: Binary Identification & Engine Triage
  - [ ] Check file signatures (PE x86/x64, Unity Mono/IL2CPP, GameMaker data.win, Godot *.pck).
  - [ ] Determine pointer widths (32-bit x86 vs 64-bit AArch64) and check for pointer truncation hazards.
- [ ] Phase 2: Logic Extraction & Decompilation
  - [ ] Unity: Decompile Assembly-CSharp.dll via dnSpy or dump symbols with Il2CppDumper.
  - [ ] GameMaker: Extract bytecode and audiogroups using UndertaleModTool.
  - [ ] Native Win32: Analyze PE in Ghidra, export C pseudo-code, strip x86 calling conventions (__stdcall).
- [ ] Phase 3: Subsystem Replacement (Win32 -> SDL2/libnx)
  - [ ] Include win32_to_sdl2_shim.h for window creation, timing (GetTickCount), and surfaces.
  - [ ] Map Joy-Con / Pro Controller inputs (A/B/X/Y, D-Pad, sticks) to GetAsyncKeyState().
  - [ ] Reroute hardcoded Windows file paths to RomFS (romfs:/) and saves to sdmc:/.
- [ ] Phase 4: Asset Optimization & Memory Budgeting
  - [ ] Convert uncompressed textures to ASTC (6x6 or 8x8 blocks) or downscale to 720p/1080p.
  - [ ] Convert WAV/PCM audio to Opus (opusenc @ 96-128kbps) or Ogg Vorbis.
  - [ ] Remove oversized static BSS global arrays; allocate dynamically via malloc().
- [ ] Phase 5: Build, Package & Verification
  - [ ] Compile with devkitA64 toolchain (aarch64-none-elf-gcc) and link -lnx -lSDL2.
  - [ ] Package ELF into .nro using elf2nro with --romfsdir and NACP metadata.
  - [ ] Run automated audit: node .agent/skills/porting-switch-games/scripts/switch-port-validator.mjs
```

---

## 3. Core Technical Directives

### A. Memory Safety: Title Takeover vs Applet Mode
Horizon OS limits homebrew to **~400MB** in Applet Mode (launched via Album). Ported games must run in **Title Takeover** (holding `R` while launching any official game card or digital title), which unlocks **~3,280 MB** of physical RAM and full GPU clock profiles.

### B. Prevention of Horizon OS Crash Codes
- **`2168-0002` (Fatal Data Abort)**: Never cast 64-bit pointers to 32-bit types (`(DWORD)ptr` or `(uint32_t)malloc(...)`). Replace with `uintptr_t`.
- **BSS Overflow**: Never declare multi-megabyte static arrays in global scope (`static char g_buffer[32 * 1024 * 1024];`). This crashes `nx-hbloader` before `main()` is executed. Always allocate heap memory dynamically.
- **`2002-3005` (RomFS Mount Error)**: Always call `romfsInit()` at startup and `romfsExit()` at shutdown. Ensure `--romfsdir=romfs` is passed to `elf2nro`.

### C. Filesystem Path Normalization
Windows NTFS is case-insensitive, but Horizon OS and RomFS are **strictly case-sensitive**. All filenames and path lookups must be normalized to lowercase or match exact disk casing. Backslashes `\` must be converted to forward slashes `/`.

---

## 4. Automated Port Validator Tool

Run the built-in static analysis scanner to check code and assets for compatibility:

```bash
node .agent/skills/porting-switch-games/scripts/switch-port-validator.mjs --path <project_dir>
```

---

## 5. Supporting Resources, Examples & References

- **Automated Port Validator**: [switch-port-validator.mjs](./scripts/switch-port-validator.mjs) - Node.js CLI tool auditing C/C++ source, Win32 APIs, BSS limits, and assets.
- **devkitA64 Build Script**: [build_nro.sh](./scripts/build_nro.sh) - Production-ready compilation script for `aarch64-none-elf-gcc` and `elf2nro` with RomFS and NACP support.
- **Reverse Engineering Guide**: [switch-reverse-engineering-guide.md](./references/switch-reverse-engineering-guide.md) - Deep architectural manual covering Ghidra, Unity Mono/IL2CPP, GameMaker, and Static Recompilation.
- **Engine Triage Guide**: [engine_triage.md](./resources/engine_triage.md) - Signatures and extraction tools for 10+ game engines and binary formats.
- **Memory & Asset Checklist**: [switch-memory-asset-checklist.md](./resources/switch-memory-asset-checklist.md) - Operational audit matrix for ASTC compression, Opus audio, and error codes.
- **Controller Mapping Matrix**: [controller-mapping-matrix.md](./resources/controller-mapping-matrix.md) - Production mappings for Joy-Cons, touch screen mouse emulation, deadzones, and co-op.
- **Win32 to SDL2 Shim Header**: [win32_to_sdl2_shim.h](./examples/win32_to_sdl2_shim.h) - Drop-in C/C++ header translating Win32 types, message loops, Joy-Con inputs, and DirectDraw surfaces.
- **Complete C Reference Game**: [switch-game-main.c](./examples/switch-game-main.c) - Complete, zero-placeholder C implementation of a 60 FPS Switch game loop with RomFS and software rendering.
- **devkitA64 Makefile**: [Makefile.switch](./examples/Makefile.switch) - Production-ready makefile configured for `aarch64-none-elf-gcc`, `elf2nro`, and RomFS embedding.
