# Nintendo Switch Memory & Asset Optimization Checklist

Use this checklist to audit ported game binaries and asset directories to prevent crashes, out-of-memory errors, and performance degradation on Nintendo Switch (Tegra X1 / Horizon OS).

---

## 1. Memory Budgeting & Launch Mode Audit

- [ ] **Title Takeover Verification**:
  - [ ] Inform users to launch homebrew via **Title Takeover** (hold `R` while opening any installed game title).
  - [ ] Never run large ports in **Applet Mode** (opening via the Album icon provides only ~400MB of RAM).
  - [ ] Add runtime applet detection in code to warn users:
    ```c
    #ifdef __SWITCH__
    AppletType at = appletGetAppletType();
    if (at != AppletType_Application && at != AppletType_SystemApplication) {
        printf("WARNING: Running in Applet Mode! RAM limited to ~400MB. Please use Title Takeover!\n");
    }
    #endif
    ```
- [ ] **Physical RAM Constraints**:
  - Handheld & Docked total physical RAM: **4 GB LPDDR4**.
  - System OS reserved RAM: **~800 MB**.
  - Maximum usable game heap: **~3,280 MB**.
- [ ] **BSS & Stack Protection**:
  - [ ] Zero oversized static global arrays (`static char buf[32 * 1024 * 1024];`).
  - [ ] All buffers >64KB allocated dynamically on heap via `malloc()` or `calloc()`.
  - [ ] Thread stacks set to reasonable size (default 128KB–256KB per worker thread).

---

## 2. Texture & Graphics Optimization

- [ ] **Texture Compression (ASTC / BC7)**:
  - [ ] Tegra X1 natively decodes **ASTC** (Adaptive Scalable Texture Compression) in hardware.
  - [ ] Convert uncompressed PNGs/TGAs to ASTC using `astcenc`:
    ```bash
    # High-quality UI & characters (6x6 block size, ~3.56 bits/pixel)
    astcenc-avx2 -cl input.png output.astc 6x6 -medium

    # Backgrounds & environment textures (8x8 block size, ~2.00 bits/pixel)
    astcenc-avx2 -cl input.png output.astc 8x8 -fast
    ```
- [ ] **Resolution Budgeting**:
  - [ ] Target native handheld resolution: **1280x720**.
  - [ ] Target docked maximum resolution: **1920x1080**.
  - [ ] Downscale 4K / 1440p PC textures to 1080p/720p to conserve memory bandwidth.
- [ ] **Mipmapping & VRAM Leaks**:
  - [ ] Ensure dynamic texture creation inside the game loop is prohibited; load textures during scene initialization.
  - [ ] Call `SDL_DestroyTexture()` or `dkMemBlockDestroy()` upon scene transitions.

---

## 3. Audio Pipeline & Compression

- [ ] **Opus / Ogg Vorbis Conversion**:
  - [ ] Convert raw `.wav` sound files to `.opus` (optimal) or `.ogg`:
    ```bash
    # Opus encoding for voice and SFX (64-96 kbps VBR)
    opusenc --bitrate 96 --vbr sfx.wav sfx.opus

    # Opus encoding for high-quality music/BGM (128 kbps VBR)
    opusenc --bitrate 128 --vbr bgm.wav bgm.opus
    ```
- [ ] **Streaming vs Preloading**:
  - [ ] Stream long background music tracks directly from RomFS/SDMC rather than loading full PCM into RAM.
  - [ ] Keep short sound effects (SFX) loaded into memory buffers.

---

## 4. RomFS & Filesystem Case-Sensitivity Rules

- [ ] **Case Sensitivity Guard**:
  - [ ] Windows NTFS is case-insensitive (`Data/Level1.pak` == `data/level1.pak`).
  - [ ] Nintendo Switch RomFS and Horizon OS are **strictly case-sensitive**.
  - [ ] Lowercase all filenames in `romfs/` or ensure all asset loading strings in source code match exact disk casing.
- [ ] **Path Separators**:
  - [ ] Replace all Windows backslashes `\` with standard forward slashes `/`.
- [ ] **Save Data Management**:
  - [ ] Never write save files to `romfs:/` (RomFS is strictly read-only).
  - [ ] Mount user save data via `fsdevMountSaveData("save", ...)` or write to `sdmc:/switch/<game_name>/saves/`.

---

## 5. Horizon OS Panic Code Diagnostic Matrix

| Error Code | Meaning | Root Cause | Immediate Fix |
| :--- | :--- | :--- | :--- |
| `2168-0002` | **Data Abort (SIGSEGV)** | Null pointer dereference, 32-bit pointer truncation, or unaligned memory access. | Inspect stack trace in Atmosphere crash dump (`/atmosphere/crash_reports/`); check for `(DWORD)ptr` casts. |
| `2162-0002` | **Abort Called** | Explicit `abort()`, failed assertion, or unhandled C++ exception. | Check console output or add custom `__wrap_abort` logging. |
| `2002-3005` | **RomFS Mount Error** | `romfsInit()` failed to locate or parse RomFS image. | Ensure `romfs/` directory was specified during `elf2nro` packaging (`--romfsdir=romfs`). |
| `2168-0001` | **Instruction Abort** | Jumping to non-executable memory or invalid function pointer. | Verify function pointers and C++ vtable initialization. |
