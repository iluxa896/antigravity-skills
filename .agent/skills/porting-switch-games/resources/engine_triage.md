# Game Engine & Binary Triage Guide for Nintendo Switch Porting

When presented with an unknown game folder or binary distribution, use this systematic checklist to identify the exact technology stack, disassembly tools, and porting path.

---

## 1. Engine Signature Detection Matrix

| File / Folder Signature | Engine / Technology | Disassembly & Extraction Tools | Target Porting Workflow |
| :--- | :--- | :--- | :--- |
| `*_Data/Managed/Assembly-CSharp.dll` | **Unity (.NET / Mono)** | `dnSpy`, `ILSpy`, `AssetStudio` | Decompile C# scripts to VS Solution $\rightarrow$ port to clean Switch Unity project or recompile with standalone Mono runtime. |
| `*_Data/il2cpp_data` + `GameAssembly.dll` | **Unity (IL2CPP)** | `Il2CppDumper`, `Ghidra`, `AssetStudio` | Run Il2CppDumper $\rightarrow$ restore function signatures $\rightarrow$ reverse engine hooks or decompile C++ logic. |
| `data.win` or `audiogroup*.dat` | **GameMaker Studio** | `UndertaleModTool` | Extract GML scripts and assets $\rightarrow$ repack bytecode into matching Switch GameMaker runner. |
| `*.pck` or `project.binary` | **Godot Engine** | `GDRE Tools` | Recover `.gd` scripts and scene hierarchy $\rightarrow$ build with Godot Switch homebrew port. |
| `.exe` containing `VCL`, `TForm`, `Delphi` | **Borland Delphi / C++Builder** | `IDR` (Interactive Delphi Reconstructor), `Ghidra` | Recover VCL forms and event handlers via IDR $\rightarrow$ decompile business logic in Ghidra $\rightarrow$ apply `win32_to_sdl2_shim.h`. |
| `.exe` + `main.pak` / `*.wad` | **Custom C/C++ (Raw Win32 PE)** | `Ghidra`, `PEview`, `x64dbg` | Decompile to C in Ghidra $\rightarrow$ eliminate Win32 API calls $\rightarrow$ compile with `devkitA64` + `SDL2`. |
| `.xbe` | **Original Xbox (x86)** | `xboxrecomp` | Statically translate XBE to C $\rightarrow$ map Direct3D 8 fixed-function pipeline to modern shaders $\rightarrow$ compile for Switch. |
| `.z64` / `.n64` | **Nintendo 64 (MIPS)** | `N64Recomp` | Recompile MIPS ROM to portable C $\rightarrow$ native 60fps / widescreen Switch build. |
| `*.rpyc` or `game/` folder | **Ren'Py (Python Visual Novel)** | `unrpyc`, `RenpySwitch` | Decompile bytecode to `.rpy` scripts $\rightarrow$ package into official RenpySwitch runtime. |
| `package.nw` or `resources.pak` | **NW.js / Electron (HTML5/JS)** | `nwsnapshot`, `asar` | Extract web bundle $\rightarrow$ run in lightweight WebKit / QuickJS Switch homebrew shell. |

---

## 2. PE Binary Architecture Extraction

Run `file` or inspect PE headers via command line:
```bash
# Check machine architecture
dumpbin /headers game.exe | grep "machine"
# or using readpe:
readpe --header optional game.exe
```

- `0x014C` $\rightarrow$ **32-bit x86 Intel 386+**.
- `0x8664` $\rightarrow$ **64-bit AMD64 (x86-64)**.
- If **32-bit**, watch out for 32-bit pointer casts (`(DWORD)ptr`), which will cause segfaults on 64-bit Switch AArch64.

---

## 3. Dependency & Subsystem Triage

Inspect imported DLLs using `dumpbin /imports game.exe` or Ghidra Symbol Tree:

| Imported DLL | Original PC Purpose | Recommended Switch Replacement |
| :--- | :--- | :--- |
| `USER32.DLL` | Windows, message loop, mouse/keyboard | `SDL2` window events (`SDL_PollEvent`, `SDL_CreateWindow`) |
| `GDI32.DLL` | 2D bitmapped graphics, DC, pens, brushes | Software frame buffer rendered via `SDL_UpdateTexture` |
| `DDRAW.DLL` | DirectDraw 2D surface acceleration | `SDL_Renderer` hardware accelerated textures |
| `D3D9.DLL` | Direct3D 9 hardware graphics | `SDL_Renderer` / OpenGL ES 2.0 / `deko3d` |
| `DSOUND.DLL` | DirectSound audio buffers | `SDL_OpenAudioDevice` or `libnx` `audren` |
| `MSS32.DLL` | Miles Sound System (AIL) digital audio | `SDL_QueueAudio` / `SDL2_mixer` or convert samples to Opus/OGG |
| `BINKW32.DLL` | Bink Video FMV cutscenes | Transcode `.bik` to WebM/MP4 via ffmpeg, or skip FMV calls |
| `WINMM.DLL` | `timeGetTime`, joystick, waveOut | `SDL_GetTicks()`, `SDL_GameController`, SDL audio |
| `WS2_32.DLL` | Winsock networking | BSD sockets from `libnx` (`socketInitializeDefault()`) |
| `DPLAYX.DLL` | DirectPlay peer-to-peer / lobby | BSD sockets or stub if single-player |

---

## 4. Triage Decision Flowchart

```text
Game Folder
  ├── Contains data.win? ------------> GameMaker -> UndertaleModTool -> Repack Runner
  ├── Contains *_Data/Managed? -------> Unity Mono -> dnSpy -> Export C# Project
  ├── Contains GameAssembly.dll? -----> Unity IL2CPP -> Il2CppDumper -> Ghidra Labeling
  ├── Contains *.pck? ----------------> Godot -> GDRE Tools -> Switch Godot Runner
  └── Raw .exe?
        ├── Check imports:
        │     ├── GDI / DirectDraw ----> Ghidra Export -> win32_to_sdl2_shim.h -> devkitA64
        │     └── D3D9 / D3D11 --------> Source Port / Static Recomp / Linux Switchroot
```
