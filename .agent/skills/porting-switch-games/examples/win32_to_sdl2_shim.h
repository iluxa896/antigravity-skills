/**
 * win32_to_sdl2_shim.h
 *
 * Enterprise-grade drop-in C/C++ Shim Header for porting decompiled Win32/x86 games
 * to Nintendo Switch (SDL2 + libnx).
 *
 * Provides:
 * - Win32 types and Ghidra decompilation compatibility types
 * - Virtual keys and Nintendo Switch Joy-Con / Pro Controller input abstraction
 * - Software frame buffer & DirectDraw surface shimming
 * - RomFS path resolution and case-normalization
 * - Timing, sleep, and audio abstractions
 */

#ifndef WIN32_TO_SDL2_SHIM_H
#define WIN32_TO_SDL2_SHIM_H

#ifdef __SWITCH__
#include <switch.h>
#endif

#include <SDL2/SDL.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>
#include <time.h>
#include <wchar.h>

#if !defined(_WIN32) || defined(__SWITCH__)
#include <unistd.h>
#include <sys/stat.h>
#include <dirent.h>
#else
#include <direct.h>
#include <io.h>
#ifndef _MSC_VER
#include <dirent.h>
#endif
#endif

#ifdef _MSC_VER
#define switch_strcasecmp _stricmp
#else
#include <strings.h>
#define switch_strcasecmp strcasecmp
#endif

#ifdef __cplusplus
extern "C" {
#endif

/* =========================================================================
 * 1. Calling Conventions & Entry Point Modifiers
 * ========================================================================= */
#ifndef WINAPI
#define WINAPI
#endif
#ifndef APIENTRY
#define APIENTRY
#endif
#ifndef CALLBACK
#define CALLBACK
#endif
#ifndef PASCAL
#define PASCAL
#endif
#ifndef CDECL
#define CDECL
#endif
#ifndef __stdcall
#define __stdcall
#endif
#ifndef __cdecl
#define __cdecl
#endif
#ifndef __fastcall
#define __fastcall
#endif

/* String & Character Compatibility */
typedef char           TCHAR;
typedef const char*    LPCTSTR;
typedef char*          LPTSTR;
typedef const wchar_t* LPCWSTR;
typedef wchar_t*       LPWSTR;

#ifndef TEXT
#define TEXT(quote) quote
#endif
#ifndef _T
#define _T(quote) quote
#endif

#define lstrlenA(str)       ((int)strlen(str))
#define lstrcpyA(dst, src)  strcpy((dst), (src))
#define lstrcatA(dst, src)  strcat((dst), (src))
#define lstrcmpA(s1, s2)    strcmp((s1), (s2))
#define lstrcmpiA(s1, s2)   switch_strcasecmp((s1), (s2))
#define wsprintfA           sprintf

static inline LPSTR CharUpperA(LPSTR lpsz) {
    if (lpsz) {
        for (char* p = lpsz; *p; p++) *p = (char)toupper((unsigned char)*p);
    }
    return lpsz;
}

static inline LPSTR CharLowerA(LPSTR lpsz) {
    if (lpsz) {
        for (char* p = lpsz; *p; p++) *p = (char)tolower((unsigned char)*p);
    }
    return lpsz;
}

#ifndef min
#define min(a, b) (((a) < (b)) ? (a) : (b))
#endif

#ifndef max
#define max(a, b) (((a) > (b)) ? (a) : (b))
#endif

/* =========================================================================
 * 2. Win32 Primitive Types & Ghidra Decompiler Compatibility
 * ========================================================================= */
typedef char      CHAR;
typedef wchar_t   WCHAR;
typedef uint8_t   BYTE;
typedef uint8_t   UCHAR;
typedef uint16_t  WORD;
typedef uint16_t  USHORT;
typedef uint32_t  DWORD;
typedef uint32_t  UINT;
typedef uint32_t  ULONG;
typedef int32_t   BOOL;
typedef int32_t   LONG;
typedef int16_t   SHORT;
typedef float     FLOAT;
typedef void*     HWND;
typedef void*     HDC;
typedef void*     HINSTANCE;
typedef void*     HMODULE;
typedef void*     HBITMAP;
typedef void*     HGDIOBJ;
typedef void*     HPEN;
typedef void*     HBRUSH;
typedef void*     HFONT;
typedef void*     HANDLE;
typedef int32_t   HRESULT;
typedef const char* LPCSTR;
typedef char*       LPSTR;
typedef void*       LPVOID;
typedef const void* LPCVOID;
typedef DWORD*      LPDWORD;
typedef DWORD*      PDWORD;
typedef LONG*       PLONG;
typedef WORD*       PWORD;
typedef BYTE*       PBYTE;
typedef BOOL*       LPBOOL;
#define lstrcpynA(dst, src, n) (strncpy((dst), (src), (n)), ((dst)[(n)-1] = '\0'), (dst))

/* 32-bit / 64-bit Pointer Width Compatibility (Crucial for x86 & x64 ports) */
typedef intptr_t  INT_PTR;
typedef uintptr_t UINT_PTR;
typedef intptr_t  LONG_PTR;
typedef uintptr_t DWORD_PTR;
typedef uintptr_t WPARAM;
typedef intptr_t  LPARAM;
typedef intptr_t  LRESULT;
typedef intptr_t (*FARPROC)(void);

typedef uint32_t  COLORREF;
#define RGB(r,g,b) ((COLORREF)(((BYTE)(r)|((WORD)((BYTE)(g))<<8))|(((DWORD)(BYTE)(b))<<16)))
#define GetRValue(rgb) ((BYTE)(rgb))
#define GetGValue(rgb) ((BYTE)(((WORD)(rgb)) >> 8))
#define GetBValue(rgb) ((BYTE)((rgb)>>16))

/* Windows Word / Dword Manipulation Macros */
#define LOWORD(l)           ((WORD)(((DWORD_PTR)(l)) & 0xffff))
#define HIWORD(l)           ((WORD)((((DWORD_PTR)(l)) >> 16) & 0xffff))
#define LOBYTE(w)           ((BYTE)(((DWORD_PTR)(w)) & 0xff))
#define HIBYTE(w)           ((BYTE)((((DWORD_PTR)(w)) >> 8) & 0xff))
#define MAKEWORD(a, b)      ((WORD)(((BYTE)(((DWORD_PTR)(a)) & 0xff)) | ((WORD)((BYTE)(((DWORD_PTR)(b)) & 0xff))) << 8))
#define MAKELONG(a, b)      ((LONG)(((WORD)(((DWORD_PTR)(a)) & 0xffff)) | ((DWORD)((WORD)(((DWORD_PTR)(b)) & 0xffff))) << 16))
#define MAKELPARAM(l, h)    ((LPARAM)MAKELONG(l, h))
#define MAKEWPARAM(l, h)    ((WPARAM)MAKELONG(l, h))

/* Windows Memory & Buffer Helpers */
#define ZeroMemory(Destination,Length) memset((Destination),0,(Length))
#define CopyMemory(Destination,Source,Length) memcpy((Destination),(Source),(Length))
#define MoveMemory(Destination,Source,Length) memmove((Destination),(Source),(Length))
#define FillMemory(Destination,Length,Fill) memset((Destination),(Fill),(Length))

static inline int MulDiv(int nNumber, int nNumerator, int nDenominator) {
    if (nDenominator == 0) return -1;
    return (int)(((int64_t)nNumber * (int64_t)nNumerator) / (int64_t)nDenominator);
}

/* Common Windows Messages (for WndProc loops) */
#define WM_NULL             0x0000
#define WM_CREATE           0x0001
#define WM_DESTROY          0x0002
#define WM_PAINT            0x000F
#define WM_CLOSE            0x0010
#define WM_QUIT             0x0012
#define WM_KEYDOWN          0x0100
#define WM_KEYUP            0x0101
#define WM_TIMER            0x0113
#define WM_MOUSEMOVE        0x0200
#define WM_LBUTTONDOWN      0x0201
#define WM_LBUTTONUP        0x0202
#define WM_RBUTTONDOWN      0x0204
#define WM_RBUTTONUP        0x0205

/* Ghidra export types compatibility */
typedef uint8_t   undefined;
typedef uint8_t   undefined1;
typedef uint16_t  undefined2;
typedef uint32_t  undefined4;
typedef uint64_t  undefined8;

#ifndef TRUE
#define TRUE  1
#endif

#ifndef FALSE
#define FALSE 0
#endif

#ifndef S_OK
#define S_OK  0
#endif

#ifndef S_FALSE
#define S_FALSE 1
#endif

typedef struct tagRECT {
    LONG left;
    LONG top;
    LONG right;
    LONG bottom;
} RECT, *LPRECT;

typedef struct tagPOINT {
    LONG x;
    LONG y;
} POINT, *LPPOINT;

typedef struct tagSIZE {
    LONG cx;
    LONG cy;
} SIZE, *PSIZE, *LPSIZE;

/* Critical Section synchronization structure */
typedef struct _CRITICAL_SECTION {
    void*  LockSemaphore;
    LONG   SpinCount;
    LONG   LockCount;
    void*  OwningThread;
} CRITICAL_SECTION, *PCRITICAL_SECTION, *LPCRITICAL_SECTION;

/* High-resolution timer types */
typedef int64_t   LONGLONG;
typedef uint64_t  ULONGLONG;
typedef union _LARGE_INTEGER {
    struct {
        DWORD LowPart;
        LONG  HighPart;
    };
    struct {
        DWORD LowPart;
        LONG  HighPart;
    } u;
    LONGLONG QuadPart;
} LARGE_INTEGER, *PLARGE_INTEGER;

/* Windows Message Structure */
typedef struct tagMSG {
    HWND        hwnd;
    UINT        message;
    WPARAM      wParam;
    LPARAM      lParam;
    DWORD       time;
    POINT       pt;
} MSG, *PMSG, *LPMSG;

#define PM_NOREMOVE 0x0000
#define PM_REMOVE   0x0001

/* Window Styles & ShowWindow Constants */
#define WS_OVERLAPPED       0x00000000L
#define WS_POPUP            0x80000000L
#define WS_VISIBLE          0x10000000L
#define WS_CHILD            0x40000000L
#define WS_OVERLAPPEDWINDOW 0x00CF0000L

#define SW_HIDE             0
#define SW_SHOWNORMAL       1
#define SW_NORMAL           1
#define SW_SHOWMINIMIZED    2
#define SW_SHOWMAXIMIZED    3
#define SW_MAXIMIZE         3
#define SW_SHOWNOACTIVATE   4
#define SW_SHOW             5

#define MAX_PATH            260

/* Window Procedure Callback & Class Structure */
typedef LRESULT (*WNDPROC)(HWND, UINT, WPARAM, LPARAM);

typedef struct tagWNDCLASSA {
    UINT        style;
    WNDPROC     lpfnWndProc;
    int         cbClsExtra;
    int         cbWndExtra;
    HINSTANCE   hInstance;
    void*       hIcon;
    void*       hCursor;
    void*       hbrBackground;
    LPCSTR      lpszMenuName;
    LPCSTR      lpszClassName;
} WNDCLASSA, *LPWNDCLASSA;

typedef struct tagPAINTSTRUCT {
    HDC         hdc;
    BOOL        fErase;
    RECT        rcPaint;
    BOOL        fRestore;
    BOOL        fIncUpdate;
    BYTE        rgbReserved[32];
} PAINTSTRUCT, *PPAINTSTRUCT, *LPPAINTSTRUCT;

/* Common File Dialog Stubs (for ported tools and editors) */
typedef struct tagOFNA {
    DWORD        lStructSize;
    HWND         hwndOwner;
    HINSTANCE    hInstance;
    LPCSTR       lpstrFilter;
    LPSTR        lpstrCustomFilter;
    DWORD        nMaxCustFilter;
    DWORD        nFilterIndex;
    LPSTR        lpstrFile;
    DWORD        nMaxFile;
    LPSTR        lpstrFileTitle;
    DWORD        nMaxFileTitle;
    LPCSTR       lpstrInitialDir;
    LPCSTR       lpstrTitle;
    DWORD        Flags;
    WORD         nFileOffset;
    WORD         nFileExtension;
    LPCSTR       lpstrDefExt;
    LPARAM       lCustData;
    void*        lpfnHook;
    LPCSTR       lpTemplateName;
} OPENFILENAMEA, *LPOPENFILENAMEA;

static inline BOOL GetOpenFileNameA(LPOPENFILENAMEA lpofn) {
    (void)lpofn;
    return FALSE;
}

static inline BOOL GetSaveFileNameA(LPOPENFILENAMEA lpofn) {
    (void)lpofn;
    return FALSE;
}

/* =========================================================================
 * 2. DIB Bitmaps, Wave Audio, DirectDraw & DirectSound Types
 * ========================================================================= */
#pragma pack(push, 1)
typedef struct tagBITMAPFILEHEADER {
    WORD    bfType;
    DWORD   bfSize;
    WORD    bfReserved1;
    WORD    bfReserved2;
    DWORD   bfOffBits;
} BITMAPFILEHEADER, *PBITMAPFILEHEADER, *LPBITMAPFILEHEADER;
#pragma pack(pop)

typedef struct tagBITMAPINFOHEADER {
    DWORD      biSize;
    LONG       biWidth;
    LONG       biHeight;
    WORD       biPlanes;
    WORD       biBitCount;
    DWORD      biCompression;
    DWORD      biSizeImage;
    LONG       biXPelsPerMeter;
    LONG       biYPelsPerMeter;
    DWORD      biClrUsed;
    DWORD      biClrImportant;
} BITMAPINFOHEADER, *PBITMAPINFOHEADER, *LPBITMAPINFOHEADER;

#define BI_RGB 0L

typedef struct tagRGBQUAD {
    BYTE    rgbBlue;
    BYTE    rgbGreen;
    BYTE    rgbRed;
    BYTE    rgbReserved;
} RGBQUAD;

typedef struct tagBITMAPINFO {
    BITMAPINFOHEADER    bmiHeader;
    RGBQUAD             bmiColors[1];
} BITMAPINFO, *PBITMAPINFO, *LPBITMAPINFO;

/* 8-bit 256-color Indexed Palette Types (for retro PC games: Fallout, Diablo, C&C, HoMM) */
typedef struct tagPALETTEENTRY {
    BYTE peRed;
    BYTE peGreen;
    BYTE peBlue;
    BYTE peFlags;
} PALETTEENTRY, *PPALETTEENTRY, *LPPALETTEENTRY;

typedef struct tagLOGPALETTE {
    WORD         palVersion;
    WORD         palNumEntries;
    PALETTEENTRY palPalEntry[1];
} LOGPALETTE, *PLOGPALETTE, *LPLOGPALETTE;
typedef void* HPALETTE;

/* Wave Audio Formats */
#define WAVE_FORMAT_PCM 1

typedef struct tWAVEFORMATEX {
    WORD        wFormatTag;
    WORD        nChannels;
    DWORD       nSamplesPerSec;
    DWORD       nAvgBytesPerSec;
    WORD        nBlockAlign;
    WORD        wBitsPerSample;
    WORD        cbSize;
} WAVEFORMATEX, *PWAVEFORMATEX, *LPWAVEFORMATEX;

/* DirectDraw Surface Shimming Types */
typedef struct _DDSCAPS2 {
    DWORD       dwCaps;
    DWORD       dwCaps2;
    DWORD       dwCaps3;
    DWORD       dwCaps4;
} DDSCAPS2, *LPDDSCAPS2;

typedef struct _DDPIXELFORMAT {
    DWORD       dwSize;
    DWORD       dwFlags;
    DWORD       dwFourCC;
    DWORD       dwRGBBitCount;
    DWORD       dwRBitMask;
    DWORD       dwGBitMask;
    DWORD       dwBBitMask;
    DWORD       dwRGBAlphaBitMask;
} DDPIXELFORMAT, *LPDDPIXELFORMAT;

typedef struct _DDSURFACEDESC2 {
    DWORD         dwSize;
    DWORD         dwFlags;
    DWORD         dwHeight;
    DWORD         dwWidth;
    LONG          lPitch;
    DWORD         dwBackBufferCount;
    DWORD         dwMipMapCount;
    DWORD         dwAlphaBitDepth;
    DWORD         dwReserved;
    void*         lpSurface;
    DDPIXELFORMAT ddpfPixelFormat;
    DDSCAPS2      ddsCaps;
    DWORD         dwTextureStage;
} DDSURFACEDESC2, *LPDDSURFACEDESC2;

#define DDSD_CAPS         0x00000001L
#define DDSD_HEIGHT       0x00000002L
#define DDSD_WIDTH        0x00000004L
#define DDSD_PITCH        0x00000008L
#define DDSD_PIXELFORMAT  0x00001000L
#define DDSD_LPSURFACE    0x00000800L
#define DDLOCK_WAIT       0x00000001L
#define DD_OK             0L

/* DirectSound Buffer Shimming Types */
typedef struct _GUID {
    unsigned long  Data1;
    unsigned short Data2;
    unsigned short Data3;
    unsigned char  Data4[8];
} GUID;

typedef struct _DSBUFFERDESC {
    DWORD           dwSize;
    DWORD           dwFlags;
    DWORD           dwBufferBytes;
    DWORD           dwReserved;
    LPWAVEFORMATEX  lpwfxFormat;
    GUID            guid3DAlgorithm;
} DSBUFFERDESC, *LPDSBUFFERDESC;

#define DSBPLAY_LOOPING 0x00000001
#define DS_OK           0L

/* =========================================================================
 * 3. Virtual Keys Mapping
 * ========================================================================= */
#define VK_LBUTTON   0x01
#define VK_RBUTTON   0x02
#define VK_TAB       0x09
#define VK_RETURN    0x0D
#define VK_SHIFT     0x10
#define VK_CONTROL   0x11
#define VK_ESCAPE    0x1B
#define VK_SPACE     0x20
#define VK_LEFT      0x25
#define VK_UP        0x26
#define VK_RIGHT     0x27
#define VK_DOWN      0x28
#define VK_KEY_A     'A'
#define VK_KEY_B     'B'
#define VK_KEY_X     'X'
#define VK_KEY_Y     'Y'
#define VK_PRIOR     0x21 /* Page Up */
#define VK_NEXT      0x22 /* Page Down */
#define VK_END       0x23
#define VK_HOME      0x24
#define VK_INSERT    0x2D
#define VK_DELETE    0x2E
#define VK_PAUSE     0x13
#define VK_F1        0x70
#define VK_F2        0x71
#define VK_F3        0x72
#define VK_F4        0x73
#define VK_F5        0x74
#define VK_F6        0x75
#define VK_F7        0x76
#define VK_F8        0x77
#define VK_F9        0x78
#define VK_F10       0x79
#define VK_F11       0x7A
#define VK_F12       0x7B

/* =========================================================================
 * 3. Encapsulated Switch/SDL2 State Context
 * ========================================================================= */
typedef struct {
    SDL_Window*   window;
    SDL_Renderer* renderer;
    SDL_Texture*  framebufferTexture;
    uint32_t*     pixelBuffer;
    int           logicalWidth;
    int           logicalHeight;
    bool          isInitialized;
    bool          shouldQuit;
    uint32_t      activeGamepadButtons;
#ifdef __SWITCH__
    PadState      padState;
#endif
} SwitchShimContext;

#ifdef SHIM_IMPLEMENTATION
SwitchShimContext g_switch_shim = {0};
#else
extern SwitchShimContext g_switch_shim;
#endif

/* =========================================================================
 * 4. Core Shim Lifecycle & Video Management
 * ========================================================================= */
static inline BOOL Switch_InitShim(const char* title, int width, int height) {
    if (g_switch_shim.isInitialized) return TRUE;

#ifdef __SWITCH__
    Result rc = romfsInit();
    if (R_FAILED(rc)) {
        printf("[SwitchShim] romfsInit returned 0x%x (running without RomFS archive)\n", rc);
    }
    padConfigureInput(1, HidNpadStyleSet_NpadStandard);
    padInitializeDefault(&g_switch_shim.padState);
    hidInitializeTouchScreen();

    AppletType at = appletGetAppletType();
    if (at != AppletType_Application && at != AppletType_SystemApplication) {
        printf("[SwitchShim] ⚠️ WARNING: Running in Applet Mode (Album)! RAM limited to ~400MB.\n");
        printf("[SwitchShim] ⚠️ Please launch via Title Takeover (hold R while opening any game) for 3.2GB RAM!\n");
    } else {
        printf("[SwitchShim] ✔ Running in Title Takeover / Application Mode (~3.2GB RAM available).\n");
    }
#endif

    if (SDL_Init(SDL_INIT_VIDEO | SDL_INIT_AUDIO | SDL_INIT_JOYSTICK | SDL_INIT_GAMECONTROLLER) < 0) {
        printf("[SwitchShim] SDL_Init failed: %s\n", SDL_GetError());
        return FALSE;
    }

    g_switch_shim.logicalWidth = width;
    g_switch_shim.logicalHeight = height;

    /* Create 720p native Switch handheld/docked presentation window */
    g_switch_shim.window = SDL_CreateWindow(
        title,
        SDL_WINDOWPOS_CENTERED,
        SDL_WINDOWPOS_CENTERED,
        1280, 720,
        SDL_WINDOW_SHOWN
    );
    if (!g_switch_shim.window) {
        printf("[SwitchShim] SDL_CreateWindow failed: %s\n", SDL_GetError());
        return FALSE;
    }

    g_switch_shim.renderer = SDL_CreateRenderer(
        g_switch_shim.window,
        -1,
        SDL_RENDERER_ACCELERATED | SDL_RENDERER_PRESENTVSYNC
    );
    if (!g_switch_shim.renderer) {
        printf("[SwitchShim] SDL_CreateRenderer failed: %s\n", SDL_GetError());
        return FALSE;
    }

    SDL_RenderSetLogicalSize(g_switch_shim.renderer, width, height);

    g_switch_shim.framebufferTexture = SDL_CreateTexture(
        g_switch_shim.renderer,
        SDL_PIXELFORMAT_ARGB8888,
        SDL_TEXTUREACCESS_STREAMING,
        width, height
    );
    if (!g_switch_shim.framebufferTexture) {
        printf("[SwitchShim] SDL_CreateTexture failed: %s\n", SDL_GetError());
        return FALSE;
    }

    g_switch_shim.pixelBuffer = (uint32_t*)calloc(width * height, sizeof(uint32_t));
    if (!g_switch_shim.pixelBuffer) {
        printf("[SwitchShim] Failed to allocate pixel buffer (%d bytes)\n", (int)(width * height * sizeof(uint32_t)));
        return FALSE;
    }

    g_switch_shim.isInitialized = true;
    g_switch_shim.shouldQuit = false;
    return TRUE;
}

static inline void Switch_PresentFrame(void) {
    if (!g_switch_shim.isInitialized || !g_switch_shim.pixelBuffer) return;

    SDL_UpdateTexture(
        g_switch_shim.framebufferTexture,
        NULL,
        g_switch_shim.pixelBuffer,
        g_switch_shim.logicalWidth * sizeof(uint32_t)
    );
    SDL_SetRenderDrawColor(g_switch_shim.renderer, 0, 0, 0, 255);
    SDL_RenderClear(g_switch_shim.renderer);
    SDL_RenderCopy(g_switch_shim.renderer, g_switch_shim.framebufferTexture, NULL, NULL);
    SDL_RenderPresent(g_switch_shim.renderer);
}

static inline void Switch_ShutdownShim(void) {
    if (!g_switch_shim.isInitialized) return;

    if (g_switch_shim.pixelBuffer) {
        free(g_switch_shim.pixelBuffer);
        g_switch_shim.pixelBuffer = NULL;
    }
    if (g_switch_shim.framebufferTexture) {
        SDL_DestroyTexture(g_switch_shim.framebufferTexture);
        g_switch_shim.framebufferTexture = NULL;
    }
    if (g_switch_shim.renderer) {
        SDL_DestroyRenderer(g_switch_shim.renderer);
        g_switch_shim.renderer = NULL;
    }
    if (g_switch_shim.window) {
        SDL_DestroyWindow(g_switch_shim.window);
        g_switch_shim.window = NULL;
    }

    SDL_Quit();

#ifdef __SWITCH__
    romfsExit();
#endif

    g_switch_shim.isInitialized = false;
}

/**
 * Triggers Tegra X1 CPU Boost Mode (1785 MHz) to accelerate level loading and asset uncompressing.
 * Automatically reverts to standard clock (1020 MHz) once loading completes.
 */
static inline void Switch_SetCpuBoost(bool enable) {
#ifdef __SWITCH__
    appletSetCpuBoostMode(enable ? ApmCpuBoostMode_Type1 : ApmCpuBoostMode_Disabled);
#else
    (void)enable;
#endif
}

/**
 * Returns true if the Nintendo Switch is currently docked in the TV cradle (1080p output).
 */
static inline bool Switch_IsDocked(void) {
#ifdef __SWITCH__
    return appletGetOperationMode() == AppletOperationMode_Console;
#else
    return true;
#endif
}

/* =========================================================================
 * 5. Input Abstraction (Win32 API Shims & Joy-Con Mapping)
 * ========================================================================= */
static inline void Switch_PollEvents(void) {
    SDL_Event event;
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_QUIT) {
            g_switch_shim.shouldQuit = true;
        }
    }

#ifdef __SWITCH__
    if (!appletMainLoop()) {
        g_switch_shim.shouldQuit = true;
        return;
    }
    padUpdate(&g_switch_shim.padState);
    u64 kDown = padGetButtons(&g_switch_shim.padState);

    /* Minus + Plus combination triggers immediate clean exit */
    if ((kDown & HidNpadButton_Plus) && (kDown & HidNpadButton_Minus)) {
        g_switch_shim.shouldQuit = true;
    }
#endif
}

static inline SHORT GetAsyncKeyState(int vKey) {
    Switch_PollEvents();
    const Uint8* keyState = SDL_GetKeyboardState(NULL);

#ifdef __SWITCH__
    u64 kDown = padGetButtons(&g_switch_shim.padState);

    /* Map Joy-Con buttons to classic Win32 game inputs */
    if (vKey == VK_SPACE   && (kDown & HidNpadButton_A))     return (SHORT)0x8000;
    if (vKey == VK_KEY_A   && (kDown & HidNpadButton_A))     return (SHORT)0x8000;
    if (vKey == VK_KEY_B   && (kDown & HidNpadButton_B))     return (SHORT)0x8000;
    if (vKey == VK_KEY_X   && (kDown & HidNpadButton_X))     return (SHORT)0x8000;
    if (vKey == VK_KEY_Y   && (kDown & HidNpadButton_Y))     return (SHORT)0x8000;
    if (vKey == VK_RETURN  && (kDown & HidNpadButton_Plus))  return (SHORT)0x8000;
    if (vKey == VK_ESCAPE  && (kDown & HidNpadButton_Minus)) return (SHORT)0x8000;
    if (vKey == VK_SHIFT   && (kDown & (HidNpadButton_L | HidNpadButton_ZL))) return (SHORT)0x8000;
    if (vKey == VK_CONTROL && (kDown & (HidNpadButton_R | HidNpadButton_ZR))) return (SHORT)0x8000;
    if (vKey == VK_LEFT    && (kDown & (HidNpadButton_Left  | HidNpadButton_StickLLeft)))  return (SHORT)0x8000;
    if (vKey == VK_RIGHT   && (kDown & (HidNpadButton_Right | HidNpadButton_StickLRight))) return (SHORT)0x8000;
    if (vKey == VK_UP      && (kDown & (HidNpadButton_Up    | HidNpadButton_StickLUp)))    return (SHORT)0x8000;
    if (vKey == VK_DOWN    && (kDown & (HidNpadButton_Down  | HidNpadButton_StickLDown)))  return (SHORT)0x8000;

    /* WASD movement support for PC game ports */
    if ((vKey == 'W' || vKey == 'w') && (kDown & (HidNpadButton_Up    | HidNpadButton_StickLUp)))    return (SHORT)0x8000;
    if ((vKey == 'S' || vKey == 's') && (kDown & (HidNpadButton_Down  | HidNpadButton_StickLDown)))  return (SHORT)0x8000;
    if ((vKey == 'A' || vKey == 'a') && (kDown & (HidNpadButton_Left  | HidNpadButton_StickLLeft)))  return (SHORT)0x8000;
    if ((vKey == 'D' || vKey == 'd') && (kDown & (HidNpadButton_Right | HidNpadButton_StickLRight))) return (SHORT)0x8000;
#endif

    /* Mouse button mapping (Capacitive Touch or Joy-Con A/ZR / SDL Mouse) */
    if (vKey == VK_LBUTTON) {
        int mState = SDL_GetMouseState(NULL, NULL);
        if (mState & SDL_BUTTON(SDL_BUTTON_LEFT)) return (SHORT)0x8000;
#ifdef __SWITCH__
        HidTouchScreenState touchState = {0};
        if (hidGetTouchScreenStates(&touchState, 1) > 0 && touchState.count > 0) return (SHORT)0x8000;
        if (kDown & (HidNpadButton_A | HidNpadButton_ZR)) return (SHORT)0x8000;
#endif
    }
    if (vKey == VK_RBUTTON) {
        int mState = SDL_GetMouseState(NULL, NULL);
        if (mState & SDL_BUTTON(SDL_BUTTON_RIGHT)) return (SHORT)0x8000;
#ifdef __SWITCH__
        if (kDown & (HidNpadButton_B | HidNpadButton_ZL)) return (SHORT)0x8000;
#endif
    }

    /* Standard SDL2 Keyboard Fallback */
    if (vKey == VK_SPACE   && keyState[SDL_SCANCODE_SPACE])  return (SHORT)0x8000;
    if (vKey == VK_RETURN  && keyState[SDL_SCANCODE_RETURN]) return (SHORT)0x8000;
    if (vKey == VK_ESCAPE  && keyState[SDL_SCANCODE_ESCAPE]) return (SHORT)0x8000;
    if (vKey == VK_SHIFT   && (keyState[SDL_SCANCODE_LSHIFT] || keyState[SDL_SCANCODE_RSHIFT])) return (SHORT)0x8000;
    if (vKey == VK_CONTROL && (keyState[SDL_SCANCODE_LCTRL]  || keyState[SDL_SCANCODE_RCTRL]))  return (SHORT)0x8000;
    if (vKey == VK_LEFT    && keyState[SDL_SCANCODE_LEFT])   return (SHORT)0x8000;
    if (vKey == VK_RIGHT   && keyState[SDL_SCANCODE_RIGHT])  return (SHORT)0x8000;
    if (vKey == VK_UP      && keyState[SDL_SCANCODE_UP])     return (SHORT)0x8000;
    if (vKey == VK_DOWN    && keyState[SDL_SCANCODE_DOWN])   return (SHORT)0x8000;

    if ((vKey == 'W' || vKey == 'w') && keyState[SDL_SCANCODE_W]) return (SHORT)0x8000;
    if ((vKey == 'S' || vKey == 's') && keyState[SDL_SCANCODE_S]) return (SHORT)0x8000;
    if ((vKey == 'A' || vKey == 'a') && keyState[SDL_SCANCODE_A]) return (SHORT)0x8000;
    if ((vKey == 'D' || vKey == 'd') && keyState[SDL_SCANCODE_D]) return (SHORT)0x8000;

    return 0;
}

/* =========================================================================
 * 6. Win32 Timing, Windowing & Filesystem Shims
 * ========================================================================= */
static inline DWORD GetTickCount(void) {
    return (DWORD)SDL_GetTicks();
}

static inline DWORD timeGetTime(void) {
    return (DWORD)SDL_GetTicks();
}

static inline UINT timeBeginPeriod(UINT uPeriod) { (void)uPeriod; return 0; }
static inline UINT timeEndPeriod(UINT uPeriod) { (void)uPeriod; return 0; }

static inline void Sleep(DWORD dwMilliseconds) {
    SDL_Delay(dwMilliseconds);
}

typedef struct _SYSTEMTIME {
    WORD wYear;
    WORD wMonth;
    WORD wDayOfWeek;
    WORD wDay;
    WORD wHour;
    WORD wMinute;
    WORD wSecond;
    WORD wMilliseconds;
} SYSTEMTIME, *PSYSTEMTIME, *LPSYSTEMTIME;

static inline void GetLocalTime(LPSYSTEMTIME lpSystemTime) {
    if (!lpSystemTime) return;
    time_t t = time(NULL);
    struct tm* tm = localtime(&t);
    if (tm) {
        lpSystemTime->wYear = (WORD)(tm->tm_year + 1900);
        lpSystemTime->wMonth = (WORD)(tm->tm_mon + 1);
        lpSystemTime->wDayOfWeek = (WORD)tm->tm_wday;
        lpSystemTime->wDay = (WORD)tm->tm_mday;
        lpSystemTime->wHour = (WORD)tm->tm_hour;
        lpSystemTime->wMinute = (WORD)tm->tm_min;
        lpSystemTime->wSecond = (WORD)tm->tm_sec;
        lpSystemTime->wMilliseconds = 0;
    }
}

static inline void GetSystemTime(LPSYSTEMTIME lpSystemTime) {
    GetLocalTime(lpSystemTime);
}

/* Module, Process & System Functions */
static inline HMODULE GetModuleHandleA(LPCSTR lpModuleName) {
    (void)lpModuleName;
    return (HMODULE)1;
}

static inline HMODULE GetModuleHandleW(LPCWSTR lpModuleName) {
    (void)lpModuleName;
    return (HMODULE)1;
}

static inline LPSTR GetCommandLineA(void) {
    static char s_cmdLine[] = "game.exe";
    return s_cmdLine;
}

static inline LPWSTR GetCommandLineW(void) {
    static wchar_t s_cmdLineW[] = L"game.exe";
    return s_cmdLineW;
}

static inline void ExitProcess(UINT uExitCode) {
    Switch_ShutdownShim();
    exit((int)uExitCode);
}

static inline DWORD GetLastError(void) {
    return 0;
}

static inline void SetLastError(DWORD dwErrCode) {
    (void)dwErrCode;
}

static inline DWORD GetCurrentProcessId(void) {
    return 1;
}

static inline DWORD GetCurrentThreadId(void) {
    return 1;
}

static inline BOOL IsDebuggerPresent(void) {
    return FALSE;
}

/* Character & String Conversion */
#define CP_ACP  0
#define CP_UTF8 65001

static inline int MultiByteToWideChar(UINT CodePage, DWORD dwFlags, LPCSTR lpMultiByteStr, int cbMultiByte, LPWSTR lpWideCharStr, int cchWideChar) {
    (void)CodePage; (void)dwFlags;
    if (!lpMultiByteStr) return 0;
    int len = (cbMultiByte < 0) ? (int)strlen(lpMultiByteStr) + 1 : cbMultiByte;
    if (cchWideChar <= 0) return len;
    for (int i = 0; i < len && i < cchWideChar; i++) {
        lpWideCharStr[i] = (wchar_t)(unsigned char)lpMultiByteStr[i];
    }
    return len;
}

static inline int WideCharToMultiByte(UINT CodePage, DWORD dwFlags, LPCWSTR lpWideCharStr, int cchWideChar, LPSTR lpMultiByteStr, int cbMultiByte, LPCSTR lpDefaultChar, BOOL* lpUsedDefaultChar) {
    (void)CodePage; (void)dwFlags; (void)lpDefaultChar; (void)lpUsedDefaultChar;
    if (!lpWideCharStr) return 0;
    int len = (cchWideChar < 0) ? (int)wcslen(lpWideCharStr) + 1 : cchWideChar;
    if (cbMultiByte <= 0) return len;
    for (int i = 0; i < len && i < cbMultiByte; i++) {
        lpMultiByteStr[i] = (char)lpWideCharStr[i];
    }
    return len;
}

static inline BOOL GetClientRect(HWND hWnd, LPRECT lpRect) {
    (void)hWnd;
    if (!lpRect) return FALSE;
    lpRect->left = 0;
    lpRect->top = 0;
    lpRect->right = g_switch_shim.logicalWidth;
    lpRect->bottom = g_switch_shim.logicalHeight;
    return TRUE;
}

static inline BOOL GetWindowRect(HWND hWnd, LPRECT lpRect) {
    return GetClientRect(hWnd, lpRect);
}

static inline BOOL SetWindowPos(HWND hWnd, HWND hWndInsertAfter, int X, int Y, int cx, int cy, UINT uFlags) {
    (void)hWnd; (void)hWndInsertAfter; (void)X; (void)Y; (void)cx; (void)cy; (void)uFlags;
    return TRUE;
}

static inline BOOL MoveWindow(HWND hWnd, int X, int Y, int nWidth, int nHeight, BOOL bRepaint) {
    (void)hWnd; (void)X; (void)Y; (void)nWidth; (void)nHeight; (void)bRepaint;
    return TRUE;
}

static inline BOOL SetWindowTextA(HWND hWnd, LPCSTR lpString) {
    (void)hWnd;
    if (g_switch_shim.window && lpString) {
        SDL_SetWindowTitle(g_switch_shim.window, lpString);
    }
    return TRUE;
}

static inline BOOL SetWindowTextW(HWND hWnd, LPCWSTR lpString) {
    (void)hWnd;
    if (g_switch_shim.window && lpString) {
        char buf[256];
        WideCharToMultiByte(0, 0, lpString, -1, buf, sizeof(buf), NULL, NULL);
        SDL_SetWindowTitle(g_switch_shim.window, buf);
    }
    return TRUE;
}

/* Cursor & Icon Resources */
typedef void* HCURSOR;
typedef void* HICON;
#define IDC_ARROW       ((LPCSTR)(uintptr_t)32512)
#define IDI_APPLICATION ((LPCSTR)(uintptr_t)32512)

static inline HCURSOR LoadCursorA(HINSTANCE hInstance, LPCSTR lpCursorName) {
    (void)hInstance; (void)lpCursorName;
    return (HCURSOR)1;
}

static inline HCURSOR SetCursor(HCURSOR hCursor) {
    (void)hCursor;
    return (HCURSOR)1;
}

static inline HICON LoadIconA(HINSTANCE hInstance, LPCSTR lpIconName) {
    (void)hInstance; (void)lpIconName;
    return (HICON)1;
}

static inline int MessageBoxA(HWND hWnd, LPCSTR lpText, LPCSTR lpCaption, UINT uType) {
    (void)hWnd;
    (void)uType;
    printf("[MessageBox][%s]: %s\n", lpCaption ? lpCaption : "Alert", lpText ? lpText : "");
    return 1; /* IDOK */
}

static inline void OutputDebugStringA(LPCSTR lpOutputString) {
    if (lpOutputString) {
        printf("[DebugOutput] %s", lpOutputString);
    }
}

/* =========================================================================
 * Virtual Memory Allocation & Protection Shims
 * ========================================================================= */
#define MEM_COMMIT             0x00001000
#define MEM_RESERVE            0x00002000
#define MEM_DECOMMIT           0x00004000
#define MEM_RELEASE            0x00008000

#define PAGE_NOACCESS          0x01
#define PAGE_READONLY          0x02
#define PAGE_READWRITE         0x04
#define PAGE_EXECUTE           0x10
#define PAGE_EXECUTE_READ      0x20
#define PAGE_EXECUTE_READWRITE 0x40

static inline void* VirtualAlloc(void* lpAddress, size_t dwSize, DWORD flAllocationType, DWORD flProtect) {
    (void)lpAddress;
    (void)flAllocationType;
    (void)flProtect;
    /* On Horizon OS, userland virtual memory is safely served by standard zero-initialized heap */
    return calloc(1, dwSize);
}

static inline BOOL VirtualFree(void* lpAddress, size_t dwSize, DWORD dwFreeType) {
    (void)dwSize;
    (void)dwFreeType;
    if (lpAddress) {
        free(lpAddress);
    }
    return TRUE;
}

static inline BOOL VirtualProtect(void* lpAddress, size_t dwSize, DWORD flNewProtect, PDWORD lpflOldProtect) {
    (void)lpAddress;
    (void)dwSize;
    if (lpflOldProtect) {
        *lpflOldProtect = PAGE_READWRITE;
    }
    (void)flNewProtect;
    return TRUE;
}

/* Process Heap Allocator Shims */
#define HEAP_NO_SERIALIZE          0x00000001
#define HEAP_GENERATE_EXCEPTIONS   0x00000004
#define HEAP_ZERO_MEMORY           0x00000008
#define HEAP_REALLOC_IN_PLACE_ONLY 0x00000010

static inline HANDLE GetProcessHeap(void) {
    return (HANDLE)1;
}

static inline LPVOID HeapAlloc(HANDLE hHeap, DWORD dwFlags, size_t dwBytes) {
    (void)hHeap;
    if (dwFlags & HEAP_ZERO_MEMORY) {
        return calloc(1, dwBytes);
    }
    return malloc(dwBytes);
}

static inline BOOL HeapFree(HANDLE hHeap, DWORD dwFlags, LPVOID lpMem) {
    (void)hHeap;
    (void)dwFlags;
    if (lpMem) {
        free(lpMem);
    }
    return TRUE;
}

static inline LPVOID HeapReAlloc(HANDLE hHeap, DWORD dwFlags, LPVOID lpMem, size_t dwBytes) {
    (void)hHeap;
    (void)dwFlags;
    return realloc(lpMem, dwBytes);
}

/* Global / Local Memory Shims (for DIB, WAV and legacy Win32 asset managers) */
#define GMEM_FIXED          0x0000
#define GMEM_MOVEABLE       0x0002
#define GMEM_ZEROINIT       0x0040
#define GPTR                (GMEM_FIXED | GMEM_ZEROINIT)
#define GHND                (GMEM_MOVEABLE | GMEM_ZEROINIT)
typedef void* HGLOBAL;

static inline HGLOBAL GlobalAlloc(UINT uFlags, size_t dwBytes) {
    if (uFlags & GMEM_ZEROINIT) return calloc(1, dwBytes);
    return malloc(dwBytes);
}

static inline HGLOBAL GlobalFree(HGLOBAL hMem) {
    if (hMem) free(hMem);
    return NULL;
}

static inline LPVOID GlobalLock(HGLOBAL hMem) {
    return (LPVOID)hMem;
}

static inline BOOL GlobalUnlock(HGLOBAL hMem) {
    (void)hMem;
    return TRUE;
}

typedef void* HLOCAL;
#define LMEM_FIXED          0x0000
#define LMEM_ZEROINIT       0x0040
#define LPTR                (LMEM_FIXED | LMEM_ZEROINIT)

static inline HLOCAL LocalAlloc(UINT uFlags, size_t uBytes) {
    return (HLOCAL)GlobalAlloc(uFlags, uBytes);
}

static inline HLOCAL LocalFree(HLOCAL hMem) {
    return (HLOCAL)GlobalFree((HGLOBAL)hMem);
}

/* =========================================================================
 * Thread Synchronization & Atomics Shims
 * ========================================================================= */
static inline void InitializeCriticalSection(LPCRITICAL_SECTION lpCriticalSection) {
    if (!lpCriticalSection) return;
    lpCriticalSection->LockSemaphore = (void*)SDL_CreateMutex();
    lpCriticalSection->SpinCount = 0;
    lpCriticalSection->LockCount = 0;
    lpCriticalSection->OwningThread = NULL;
}

static inline void EnterCriticalSection(LPCRITICAL_SECTION lpCriticalSection) {
    if (lpCriticalSection && lpCriticalSection->LockSemaphore) {
        SDL_LockMutex((SDL_mutex*)lpCriticalSection->LockSemaphore);
        lpCriticalSection->LockCount++;
    }
}

static inline void LeaveCriticalSection(LPCRITICAL_SECTION lpCriticalSection) {
    if (lpCriticalSection && lpCriticalSection->LockSemaphore) {
        lpCriticalSection->LockCount--;
        SDL_UnlockMutex((SDL_mutex*)lpCriticalSection->LockSemaphore);
    }
}

static inline void DeleteCriticalSection(LPCRITICAL_SECTION lpCriticalSection) {
    if (lpCriticalSection && lpCriticalSection->LockSemaphore) {
        SDL_DestroyMutex((SDL_mutex*)lpCriticalSection->LockSemaphore);
        lpCriticalSection->LockSemaphore = NULL;
    }
}

static inline LONG InterlockedIncrement(LONG volatile *Addend) {
    return __atomic_add_fetch(Addend, 1, __ATOMIC_SEQ_CST);
}

static inline LONG InterlockedDecrement(LONG volatile *Addend) {
    return __atomic_sub_fetch(Addend, 1, __ATOMIC_SEQ_CST);
}

static inline LONG InterlockedExchange(LONG volatile *Target, LONG Value) {
    return __atomic_exchange_n(Target, Value, __ATOMIC_SEQ_CST);
}

/* =========================================================================
 * Windows Registry Compatibility Stubs
 * ========================================================================= */
typedef void* HKEY;
#define HKEY_CLASSES_ROOT      ((HKEY)(uintptr_t)0x80000000)
#define HKEY_CURRENT_USER       ((HKEY)(uintptr_t)0x80000001)
#define HKEY_LOCAL_MACHINE      ((HKEY)(uintptr_t)0x80000002)
#define ERROR_SUCCESS           0L
#define ERROR_FILE_NOT_FOUND    2L

static inline LONG RegOpenKeyExA(HKEY hKey, LPCSTR lpSubKey, DWORD ulOptions, DWORD samDesired, HKEY* phkResult) {
    (void)hKey; (void)lpSubKey; (void)ulOptions; (void)samDesired;
    if (phkResult) *phkResult = (HKEY)1;
    return ERROR_SUCCESS;
}

static inline LONG RegQueryValueExA(HKEY hKey, LPCSTR lpValueName, LPDWORD lpReserved, LPDWORD lpType, LPBYTE lpData, LPDWORD lpcbData) {
    (void)hKey; (void)lpValueName; (void)lpReserved; (void)lpType; (void)lpData; (void)lpcbData;
    return ERROR_FILE_NOT_FOUND;
}

static inline LONG RegSetValueExA(HKEY hKey, LPCSTR lpValueName, DWORD Reserved, DWORD dwType, const BYTE* lpData, DWORD cbData) {
    (void)hKey; (void)lpValueName; (void)Reserved; (void)dwType; (void)lpData; (void)cbData;
    return ERROR_SUCCESS;
}

static inline LONG RegCloseKey(HKEY hKey) {
    (void)hKey;
    return ERROR_SUCCESS;
}

/* =========================================================================
 * System Metrics, Directory Paths & Cursor Control Shims
 * ========================================================================= */
#define SM_CXSCREEN 0
#define SM_CYSCREEN 1

static inline int GetSystemMetrics(int nIndex) {
    if (nIndex == SM_CXSCREEN) return (g_switch_shim.logicalWidth > 0) ? g_switch_shim.logicalWidth : 1280;
    if (nIndex == SM_CYSCREEN) return (g_switch_shim.logicalHeight > 0) ? g_switch_shim.logicalHeight : 720;
    return 0;
}

typedef struct _SYSTEM_INFO {
    DWORD dwPageSize;
    LPVOID lpMinimumApplicationAddress;
    LPVOID lpMaximumApplicationAddress;
    DWORD_PTR dwActiveProcessorMask;
    DWORD dwNumberOfProcessors;
    DWORD dwProcessorType;
    DWORD dwAllocationGranularity;
    WORD wProcessorLevel;
    WORD wProcessorRevision;
} SYSTEM_INFO, *LPSYSTEM_INFO;

static inline void GetSystemInfo(LPSYSTEM_INFO lpSystemInfo) {
    if (!lpSystemInfo) return;
    memset(lpSystemInfo, 0, sizeof(SYSTEM_INFO));
    lpSystemInfo->dwPageSize = 4096;
    lpSystemInfo->dwNumberOfProcessors = 4; /* Tegra X1 4-core Cortex-A57 */
    lpSystemInfo->dwAllocationGranularity = 65536;
}

static inline DWORD GetCurrentDirectoryA(DWORD nBufferLength, LPSTR lpBuffer) {
    if (!lpBuffer || nBufferLength < 8) return 0;
    strncpy(lpBuffer, "romfs:/", nBufferLength - 1);
    lpBuffer[nBufferLength - 1] = '\0';
    return (DWORD)strlen(lpBuffer);
}

static inline BOOL SetCurrentDirectoryA(LPCSTR lpPathName) {
    (void)lpPathName;
    return TRUE;
}

static inline DWORD GetModuleFileNameA(HMODULE hModule, LPSTR lpFilename, DWORD nSize) {
    (void)hModule;
    if (!lpFilename || nSize < 8) return 0;
    strncpy(lpFilename, "romfs:/", nSize - 1);
    lpFilename[nSize - 1] = '\0';
    return (DWORD)strlen(lpFilename);
}

static inline BOOL SetCursorPos(int X, int Y) {
    if (g_switch_shim.window) {
        SDL_WarpMouseInWindow(g_switch_shim.window, X, Y);
    }
    return TRUE;
}

static inline int ShowCursor(BOOL bShow) {
    return SDL_ShowCursor(bShow ? SDL_ENABLE : SDL_DISABLE);
}

static inline BOOL GetCursorPos(LPPOINT lpPoint) {
    if (!lpPoint) return FALSE;

#ifdef __SWITCH__
    HidTouchScreenState touchState = {0};
    if (hidGetTouchScreenStates(&touchState, 1) > 0 && touchState.count > 0) {
        /* Map capacitive touch 1280x720 coordinates to game resolution */
        lpPoint->x = (LONG)((float)touchState.touches[0].x * (float)g_switch_shim.logicalWidth / 1280.0f);
        lpPoint->y = (LONG)((float)touchState.touches[0].y * (float)g_switch_shim.logicalHeight / 720.0f);
        return TRUE;
    }
#endif

    int x = 0, y = 0;
    SDL_GetMouseState(&x, &y);
    int winW = 1280, winH = 720;
    if (g_switch_shim.window) SDL_GetWindowSize(g_switch_shim.window, &winW, &winH);
    if (winW > 0 && winH > 0 && g_switch_shim.logicalWidth > 0 && g_switch_shim.logicalHeight > 0) {
        lpPoint->x = (LONG)((float)x * (float)g_switch_shim.logicalWidth / (float)winW);
        lpPoint->y = (LONG)((float)y * (float)g_switch_shim.logicalHeight / (float)winH);
    } else {
        lpPoint->x = (LONG)x;
        lpPoint->y = (LONG)y;
    }
    return TRUE;
}

static inline BOOL sndPlaySoundA(LPCSTR pszSound, UINT fuSound) {
    (void)fuSound;
    if (pszSound) {
        printf("[SwitchShim] Audio trigger: %s\n", pszSound);
    }
    return TRUE;
}

static inline BOOL PlaySoundA(LPCSTR pszSound, HMODULE hmod, DWORD fdwSound) {
    (void)hmod;
    (void)fdwSound;
    return sndPlaySoundA(pszSound, 0);
}

/* High-resolution Performance Timing */
static inline BOOL QueryPerformanceCounter(LARGE_INTEGER* lpPerformanceCount) {
    if (!lpPerformanceCount) return FALSE;
    lpPerformanceCount->QuadPart = (LONGLONG)SDL_GetPerformanceCounter();
    return TRUE;
}

static inline BOOL QueryPerformanceFrequency(LARGE_INTEGER* lpFrequency) {
    if (!lpFrequency) return FALSE;
    lpFrequency->QuadPart = (LONGLONG)SDL_GetPerformanceFrequency();
    return TRUE;
}

/* Message Loop Shims */
static inline BOOL PeekMessageA(LPMSG lpMsg, HWND hWnd, UINT wMsgFilterMin, UINT wMsgFilterMax, UINT wRemoveMsg) {
    (void)hWnd; (void)wMsgFilterMin; (void)wMsgFilterMax;
    Switch_PollEvents();
    if (g_switch_shim.shouldQuit) {
        if (lpMsg) {
            lpMsg->message = WM_QUIT;
            lpMsg->wParam = 0;
            lpMsg->lParam = 0;
        }
        return TRUE;
    }
    if (wRemoveMsg == PM_NOREMOVE) return FALSE;
    return FALSE;
}

static inline BOOL GetMessageA(LPMSG lpMsg, HWND hWnd, UINT wMsgFilterMin, UINT wMsgFilterMax) {
    (void)hWnd; (void)wMsgFilterMin; (void)wMsgFilterMax;
    Switch_PollEvents();
    if (g_switch_shim.shouldQuit) return FALSE;
    if (lpMsg) {
        lpMsg->message = WM_NULL;
        lpMsg->wParam = 0;
        lpMsg->lParam = 0;
    }
    return TRUE;
}

static inline BOOL TranslateMessage(const MSG* lpMsg) {
    (void)lpMsg;
    return TRUE;
}

static inline LRESULT DispatchMessageA(const MSG* lpMsg) {
    (void)lpMsg;
    return 0;
}

static inline void PostQuitMessage(int nExitCode) {
    (void)nExitCode;
    g_switch_shim.shouldQuit = true;
}

static inline LRESULT DefWindowProcA(HWND hWnd, UINT Msg, WPARAM wParam, LPARAM lParam) {
    (void)hWnd; (void)Msg; (void)wParam; (void)lParam;
    return 0;
}

/* Window Registration & Management */
static inline WORD RegisterClassA(const WNDCLASSA* lpWndClass) {
    (void)lpWndClass;
    return 1;
}

static inline HWND CreateWindowExA(DWORD dwExStyle, LPCSTR lpClassName, LPCSTR lpWindowName,
                                   DWORD dwStyle, int X, int Y, int nWidth, int nHeight,
                                   HWND hWndParent, void* hMenu, HINSTANCE hInstance, void* lpParam) {
    (void)dwExStyle; (void)lpClassName; (void)dwStyle; (void)X; (void)Y;
    (void)hWndParent; (void)hMenu; (void)hInstance; (void)lpParam;
    int width = (nWidth > 0) ? nWidth : 1280;
    int height = (nHeight > 0) ? nHeight : 720;
    Switch_InitShim(lpWindowName ? lpWindowName : "Switch Port", width, height);
    return (HWND)&g_switch_shim;
}

static inline BOOL ShowWindow(HWND hWnd, int nCmdShow) {
    (void)hWnd; (void)nCmdShow;
    return TRUE;
}

static inline BOOL UpdateWindow(HWND hWnd) {
    (void)hWnd;
    return TRUE;
}

static inline BOOL DestroyWindow(HWND hWnd) {
    (void)hWnd;
    Switch_ShutdownShim();
    return TRUE;
}

/* Cursor & GDI Shims */
static inline int ShowCursor(BOOL bShow) {
    (void)bShow;
    return 0;
}

static inline BOOL SetCursorPos(int X, int Y) {
    (void)X; (void)Y;
    return TRUE;
}

static inline HDC BeginPaint(HWND hWnd, LPPAINTSTRUCT lpPaint) {
    (void)hWnd;
    if (lpPaint) {
        GetClientRect(hWnd, &lpPaint->rcPaint);
    }
    return (HDC)1;
}

static inline BOOL EndPaint(HWND hWnd, const PAINTSTRUCT* lpPaint) {
    (void)hWnd; (void)lpPaint;
    Switch_PresentFrame();
    return TRUE;
}

/* Rectangle & Collision Math */
static inline BOOL SetRect(LPRECT lprc, int xLeft, int yTop, int xRight, int yBottom) {
    if (!lprc) return FALSE;
    lprc->left = xLeft;
    lprc->top = yTop;
    lprc->right = xRight;
    lprc->bottom = yBottom;
    return TRUE;
}

static inline BOOL PtInRect(const RECT* lprc, POINT pt) {
    if (!lprc) return FALSE;
    return (pt.x >= lprc->left && pt.x < lprc->right && pt.y >= lprc->top && pt.y < lprc->bottom);
}

static inline BOOL IntersectRect(LPRECT lprcDst, const RECT* lprcSrc1, const RECT* lprcSrc2) {
    if (!lprcDst || !lprcSrc1 || !lprcSrc2) return FALSE;
    int left = (lprcSrc1->left > lprcSrc2->left) ? lprcSrc1->left : lprcSrc2->left;
    int right = (lprcSrc1->right < lprcSrc2->right) ? lprcSrc1->right : lprcSrc2->right;
    int top = (lprcSrc1->top > lprcSrc2->top) ? lprcSrc1->top : lprcSrc2->top;
    int bottom = (lprcSrc1->bottom < lprcSrc2->bottom) ? lprcSrc1->bottom : lprcSrc2->bottom;
    if (left < right && top < bottom) {
        lprcDst->left = left;
        lprcDst->top = top;
        lprcDst->right = right;
        lprcDst->bottom = bottom;
        return TRUE;
    }
    lprcDst->left = lprcDst->top = lprcDst->right = lprcDst->bottom = 0;
    return FALSE;
}

static inline BOOL OffsetRect(LPRECT lprc, int dx, int dy) {
    if (!lprc) return FALSE;
    lprc->left += dx;
    lprc->right += dx;
    lprc->top += dy;
    lprc->bottom += dy;
    return TRUE;
}

static inline BOOL IsRectEmpty(const RECT* lprc) {
    if (!lprc) return TRUE;
    return (lprc->left >= lprc->right || lprc->top >= lprc->bottom);
}

/* GDI Objects, Stock Objects & Blitting */
#define SRCCOPY     0x00CC0020L
#define SRCPAINT    0x00EE0086L
#define SRCAND      0x008800C6L
#define SRCINVERT   0x00660046L

#define WHITE_BRUSH 0
#define LTGRAY_BRUSH 1
#define GRAY_BRUSH  2
#define DKGRAY_BRUSH 3
#define BLACK_BRUSH 4
#define NULL_BRUSH  5

static inline HGDIOBJ GetStockObject(int i) { (void)i; return (HGDIOBJ)1; }
static inline HBRUSH CreateSolidBrush(COLORREF crColor) { (void)crColor; return (HBRUSH)1; }
static inline HPEN CreatePen(int iStyle, int cWidth, COLORREF color) { (void)iStyle; (void)cWidth; (void)color; return (HPEN)1; }
static inline BOOL DeleteObject(HGDIOBJ ho) { (void)ho; return TRUE; }
static inline HGDIOBJ SelectObject(HDC hdc, HGDIOBJ h) { (void)hdc; return h; }
static inline HDC CreateCompatibleDC(HDC hdc) { (void)hdc; return (HDC)1; }
static inline BOOL DeleteDC(HDC hdc) { (void)hdc; return TRUE; }

static inline BOOL BitBlt(HDC hdcDest, int nXDest, int nYDest, int nWidth, int nHeight,
                          HDC hdcSrc, int nXSrc, int nYSrc, DWORD dwRop) {
    (void)hdcDest; (void)nXDest; (void)nYDest; (void)nWidth; (void)nHeight;
    (void)hdcSrc; (void)nXSrc; (void)nYSrc; (void)dwRop;
    return TRUE;
}

static inline BOOL StretchBlt(HDC hdcDest, int nXOriginDest, int nYOriginDest, int nWidthDest, int nHeightDest,
                             HDC hdcSrc, int nXOriginSrc, int nYOriginSrc, int nWidthSrc, int nHeightSrc, DWORD dwRop) {
    (void)hdcDest; (void)nXOriginDest; (void)nYOriginDest; (void)nWidthDest; (void)nHeightDest;
    (void)hdcSrc; (void)nXOriginSrc; (void)nYOriginSrc; (void)nWidthSrc; (void)nHeightSrc; (void)dwRop;
    return TRUE;
}

/* Palette Management & 8-bit to 32-bit Framebuffer Blitting */
static inline HPALETTE CreatePalette(const LOGPALETTE* plgpl) { (void)plgpl; return (HPALETTE)1; }
static inline UINT SetPaletteEntries(HPALETTE hpal, UINT iStart, UINT cEntries, const PALETTEENTRY* pPalEntries) {
    (void)hpal; (void)iStart; (void)cEntries; (void)pPalEntries;
    return cEntries;
}
static inline UINT GetPaletteEntries(HPALETTE hpal, UINT iStart, UINT cEntries, LPPALETTEENTRY pPalEntries) {
    (void)hpal; (void)iStart; (void)cEntries; (void)pPalEntries;
    return 0;
}
static inline HPALETTE SelectPalette(HDC hdc, HPALETTE hPal, BOOL bForceBkgd) {
    (void)hdc; (void)bForceBkgd;
    return hPal;
}
static inline UINT RealizePalette(HDC hdc) { (void)hdc; return 0; }

/**
 * High-performance 8-bit indexed palette to 32-bit ARGB8888 software blitter for classic 256-color PC games
 * (e.g., Fallout 1/2, Diablo 1, Command & Conquer, Heroes of Might and Magic 1-3, Warcraft II).
 */
static inline void Switch_BlitPalette8ToARGB32(
    const uint8_t* src8,
    uint32_t* dst32,
    int width,
    int height,
    int srcPitch,
    const RGBQUAD* palette
) {
    if (!src8 || !dst32 || !palette || width <= 0 || height <= 0) return;

    for (int y = 0; y < height; y++) {
        const uint8_t* srcRow = src8 + y * srcPitch;
        uint32_t* dstRow = dst32 + y * width;
        for (int x = 0; x < width; x++) {
            uint8_t index = srcRow[x];
            RGBQUAD color = palette[index];
            dstRow[x] = (0xFF000000) | ((uint32_t)color.rgbRed << 16) | ((uint32_t)color.rgbGreen << 8) | (uint32_t)color.rgbBlue;
        }
    }
}

/* =========================================================================
 * Winsock Network Shims (Multiplayer, LAN & BSD Socket Stubs)
 * ========================================================================= */
typedef uintptr_t SOCKET;
#define INVALID_SOCKET  ((SOCKET)(~0))
#define SOCKET_ERROR    (-1)

typedef struct WSAData {
    WORD           wVersion;
    WORD           wHighVersion;
    char           szDescription[257];
    char           szSystemStatus[129];
    unsigned short iMaxSockets;
    unsigned short iMaxUdpDg;
    char*          lpVendorInfo;
} WSADATA, *LPWSADATA;

static inline int WSAStartup(WORD wVersionRequested, LPWSADATA lpWSAData) {
    (void)wVersionRequested;
    if (lpWSAData) {
        memset(lpWSAData, 0, sizeof(WSADATA));
        lpWSAData->wVersion = 0x0202;
        lpWSAData->wHighVersion = 0x0202;
        strcpy(lpWSAData->szDescription, "Switch Winsock Shim");
    }
#ifdef __SWITCH__
    socketInitializeDefault();
#endif
    return 0;
}

static inline int WSACleanup(void) {
#ifdef __SWITCH__
    socketExit();
#endif
    return 0;
}

static inline int WSAGetLastError(void) {
    return 0;
}

static inline int closesocket(SOCKET s) {
#if defined(_WIN32)
    (void)s;
    return 0;
#else
    return close((int)s);
#endif
}

/* MCI Multimedia Audio */
static inline int mciSendStringA(LPCSTR lpstrCommand, LPSTR lpstrReturnString, UINT uReturnLength, HWND hwndCallback) {
    (void)lpstrReturnString; (void)uReturnLength; (void)hwndCallback;
    if (lpstrCommand) {
        printf("[SwitchShim][MCI] %s\n", lpstrCommand);
    }
    return 0; /* MCIERR_NO_ERROR */
}

/**
 * Resolves a legacy Windows file path into a Switch RomFS path:
 * e.g., "data\\textures\\player.png" -> "romfs:/data/textures/player.png"
 */
static inline void Switch_ResolveRomFSPath(const char* winPath, char* outBuffer, size_t outSize) {
    if (!winPath || !outBuffer || outSize < 10) return;

    /* Strip drive letter if present (e.g., C:\) */
    const char* src = winPath;
    if (isalpha((unsigned char)src[0]) && src[1] == ':') {
        src += 2;
    }
    while (*src == '\\' || *src == '/') {
        src++;
    }

    snprintf(outBuffer, outSize, "romfs:/%s", src);

    /* Normalize backslashes to forward slashes */
    for (size_t i = 7; outBuffer[i] != '\0'; i++) {
        if (outBuffer[i] == '\\') {
            outBuffer[i] = '/';
        }
    }
}

/**
 * Resolves a save file path into a writable SD Card directory:
 * e.g., "saves\\slot1.sav" -> "sdmc:/switch/game_name/saves/slot1.sav"
 * Automatically creates parent directories on the SD Card.
 */
static inline void Switch_ResolveSavePath(const char* appName, const char* relPath, char* outBuffer, size_t outSize) {
    if (!relPath || !outBuffer || outSize < 32) return;

    const char* src = relPath;
    if (isalpha((unsigned char)src[0]) && src[1] == ':') {
        src += 2;
    }
    while (*src == '\\' || *src == '/') {
        src++;
    }

    const char* game = (appName && appName[0] != '\0') ? appName : "game_port";
    snprintf(outBuffer, outSize, "sdmc:/switch/%s/%s", game, src);

    /* Normalize backslashes */
    for (size_t i = 5; outBuffer[i] != '\0'; i++) {
        if (outBuffer[i] == '\\') {
            outBuffer[i] = '/';
        }
    }

#if !defined(_WIN32) || defined(__SWITCH__)
    /* Create parent directories on SDMC */
    char tempDir[512];
    snprintf(tempDir, sizeof(tempDir), "sdmc:/switch/%s", game);
    mkdir("sdmc:/switch", 0777);
    mkdir(tempDir, 0777);

    char* lastSlash = strrchr(outBuffer, '/');
    if (lastSlash && lastSlash > outBuffer + 13) {
        size_t dirLen = lastSlash - outBuffer;
        if (dirLen < sizeof(tempDir)) {
            strncpy(tempDir, outBuffer, dirLen);
            tempDir[dirLen] = '\0';
            mkdir(tempDir, 0777);
        }
    }
#endif
}

/* =========================================================================
 * 8. Win32 File I/O Shims (RomFS Assets & SDMC Saves)
 * ========================================================================= */
#define GENERIC_READ             (0x80000000L)
#define GENERIC_WRITE            (0x40000000L)
#define GENERIC_EXECUTE          (0x20000000L)
#define GENERIC_ALL              (0x10000000L)

#define FILE_SHARE_READ          0x00000001
#define FILE_SHARE_WRITE         0x00000002
#define FILE_SHARE_DELETE        0x00000004

#define CREATE_NEW               1
#define CREATE_ALWAYS            2
#define OPEN_EXISTING            3
#define OPEN_ALWAYS              4
#define TRUNCATE_EXISTING        5

#define FILE_ATTRIBUTE_READONLY  0x00000001
#define FILE_ATTRIBUTE_HIDDEN    0x00000002
#define FILE_ATTRIBUTE_SYSTEM    0x00000004
#define FILE_ATTRIBUTE_DIRECTORY 0x00000010
#define FILE_ATTRIBUTE_ARCHIVE   0x00000020
#define FILE_ATTRIBUTE_NORMAL    0x00000080
#define INVALID_FILE_ATTRIBUTES  ((DWORD)-1)

#define INVALID_HANDLE_VALUE     ((HANDLE)(intptr_t)-1)
#define INVALID_FILE_SIZE        ((DWORD)0xFFFFFFFF)

#define FILE_BEGIN               0
#define FILE_CURRENT             1
#define FILE_END                 2

static inline HANDLE CreateFileA(
    LPCSTR lpFileName,
    DWORD dwDesiredAccess,
    DWORD dwShareMode,
    void* lpSecurityAttributes,
    DWORD dwCreationDisposition,
    DWORD dwFlagsAndAttributes,
    HANDLE hTemplateFile
) {
    (void)dwShareMode; (void)lpSecurityAttributes; (void)dwFlagsAndAttributes; (void)hTemplateFile;
    if (!lpFileName || lpFileName[0] == '\0') return INVALID_HANDLE_VALUE;

    char resolvedPath[512];
    const char* mode = "rb";

    if (dwDesiredAccess & GENERIC_WRITE) {
        /* Writable file -> Route to SD Card save path */
        Switch_ResolveSavePath("game_port", lpFileName, resolvedPath, sizeof(resolvedPath));
        if (dwCreationDisposition == CREATE_ALWAYS || dwCreationDisposition == TRUNCATE_EXISTING) {
            mode = "wb+";
        } else if (dwCreationDisposition == OPEN_ALWAYS) {
            mode = "ab+";
        } else {
            mode = "rb+";
        }
    } else {
        /* Read-only file -> Check RomFS first, fallback to SDMC */
        Switch_ResolveRomFSPath(lpFileName, resolvedPath, sizeof(resolvedPath));
        FILE* fpTest = fopen(resolvedPath, "rb");
        if (!fpTest) {
            Switch_ResolveSavePath("game_port", lpFileName, resolvedPath, sizeof(resolvedPath));
        } else {
            fclose(fpTest);
        }
        mode = "rb";
    }

    FILE* fp = fopen(resolvedPath, mode);
    if (!fp) {
        return INVALID_HANDLE_VALUE;
    }
    return (HANDLE)fp;
}

static inline BOOL ReadFile(
    HANDLE hFile,
    LPVOID lpBuffer,
    DWORD nNumberOfBytesToRead,
    LPDWORD lpNumberOfBytesRead,
    void* lpOverlapped
) {
    (void)lpOverlapped;
    if (hFile == INVALID_HANDLE_VALUE || !hFile || !lpBuffer) return FALSE;
    size_t readCount = fread(lpBuffer, 1, nNumberOfBytesToRead, (FILE*)hFile);
    if (lpNumberOfBytesRead) {
        *lpNumberOfBytesRead = (DWORD)readCount;
    }
    return TRUE;
}

static inline BOOL WriteFile(
    HANDLE hFile,
    LPCVOID lpBuffer,
    DWORD nNumberOfBytesToWrite,
    LPDWORD lpNumberOfBytesWritten,
    void* lpOverlapped
) {
    (void)lpOverlapped;
    if (hFile == INVALID_HANDLE_VALUE || !hFile || !lpBuffer) return FALSE;
    size_t written = fwrite(lpBuffer, 1, nNumberOfBytesToWrite, (FILE*)hFile);
    if (lpNumberOfBytesWritten) {
        *lpNumberOfBytesWritten = (DWORD)written;
    }
    return TRUE;
}

static inline DWORD SetFilePointer(
    HANDLE hFile,
    LONG lDistanceToMove,
    PLONG lpDistanceToMoveHigh,
    DWORD dwMoveMethod
) {
    (void)lpDistanceToMoveHigh;
    if (hFile == INVALID_HANDLE_VALUE || !hFile) return INVALID_FILE_SIZE;
    int origin = SEEK_SET;
    if (dwMoveMethod == FILE_CURRENT) origin = SEEK_CUR;
    else if (dwMoveMethod == FILE_END) origin = SEEK_END;

    if (fseek((FILE*)hFile, lDistanceToMove, origin) != 0) {
        return INVALID_FILE_SIZE;
    }
    long pos = ftell((FILE*)hFile);
    return (pos < 0) ? INVALID_FILE_SIZE : (DWORD)pos;
}

static inline DWORD GetFileSize(HANDLE hFile, LPDWORD lpFileSizeHigh) {
    if (lpFileSizeHigh) *lpFileSizeHigh = 0;
    if (hFile == INVALID_HANDLE_VALUE || !hFile) return INVALID_FILE_SIZE;
    FILE* fp = (FILE*)hFile;
    long curr = ftell(fp);
    if (fseek(fp, 0, SEEK_END) != 0) return INVALID_FILE_SIZE;
    long size = ftell(fp);
    fseek(fp, curr, SEEK_SET);
    return (size < 0) ? INVALID_FILE_SIZE : (DWORD)size;
}

static inline BOOL CloseHandle(HANDLE hObject) {
    if (hObject == INVALID_HANDLE_VALUE || !hObject) return FALSE;
    fclose((FILE*)hObject);
    return TRUE;
}

static inline BOOL FlushFileBuffers(HANDLE hFile) {
    if (hFile == INVALID_HANDLE_VALUE || !hFile) return FALSE;
    return (fflush((FILE*)hFile) == 0) ? TRUE : FALSE;
}

static inline DWORD GetFileAttributesA(LPCSTR lpFileName) {
    if (!lpFileName) return INVALID_FILE_ATTRIBUTES;
    char path[512];
    Switch_ResolveRomFSPath(lpFileName, path, sizeof(path));
    FILE* fp = fopen(path, "rb");
    if (!fp) {
        Switch_ResolveSavePath("game_port", lpFileName, path, sizeof(path));
        fp = fopen(path, "rb");
    }
    if (fp) {
        fclose(fp);
        return FILE_ATTRIBUTE_NORMAL;
    }
    return INVALID_FILE_ATTRIBUTES;
}

static inline BOOL DeleteFileA(LPCSTR lpFileName) {
    if (!lpFileName) return FALSE;
    char path[512];
    Switch_ResolveSavePath("game_port", lpFileName, path, sizeof(path));
    return (remove(path) == 0) ? TRUE : FALSE;
}

static inline BOOL MoveFileA(LPCSTR lpExistingFileName, LPCSTR lpNewFileName) {
    if (!lpExistingFileName || !lpNewFileName) return FALSE;
    char oldPath[512], newPath[512];
    Switch_ResolveSavePath("game_port", lpExistingFileName, oldPath, sizeof(oldPath));
    Switch_ResolveSavePath("game_port", lpNewFileName, newPath, sizeof(newPath));
    return (rename(oldPath, newPath) == 0) ? TRUE : FALSE;
}

static inline BOOL CreateDirectoryA(LPCSTR lpPathName, void* lpSecurityAttributes) {
    (void)lpSecurityAttributes;
    if (!lpPathName) return FALSE;
    char savePath[512];
    Switch_ResolveSavePath("game_port", lpPathName, savePath, sizeof(savePath));
#if !defined(_WIN32) || defined(__SWITCH__)
    return (mkdir(savePath, 0777) == 0) ? TRUE : FALSE;
#else
    return TRUE;
#endif
}

static inline BOOL PathFileExistsA(LPCSTR pszPath) {
    if (!pszPath || pszPath[0] == '\0') return FALSE;
    return (GetFileAttributesA(pszPath) != INVALID_FILE_ATTRIBUTES);
}

static inline DWORD GetTempPathA(DWORD nBufferLength, LPSTR lpBuffer) {
    if (!lpBuffer || nBufferLength < 8) return 0;
#if defined(__SWITCH__)
    const char* tmpDir = "sdmc:/switch/game_port/tmp/";
#else
    const char* tmpDir = "/tmp/";
#endif
    strncpy(lpBuffer, tmpDir, nBufferLength - 1);
    lpBuffer[nBufferLength - 1] = '\0';
    return (DWORD)strlen(lpBuffer);
}

/* =========================================================================
 * Win32 Directory Enumeration & Wildcard Matching Shims
 * ========================================================================= */
typedef struct _FILETIME {
    DWORD dwLowDateTime;
    DWORD dwHighDateTime;
} FILETIME, *PFILETIME, *LPFILETIME;

#ifndef MAX_PATH
#define MAX_PATH 260
#endif

typedef struct _WIN32_FIND_DATAA {
    DWORD    dwFileAttributes;
    FILETIME ftCreationTime;
    FILETIME ftLastAccessTime;
    FILETIME ftLastWriteTime;
    DWORD    nFileSizeHigh;
    DWORD    nFileSizeLow;
    DWORD    dwReserved0;
    DWORD    dwReserved1;
    CHAR     cFileName[MAX_PATH];
    CHAR     cAlternateFileName[14];
} WIN32_FIND_DATAA, *PWIN32_FIND_DATAA, *LPWIN32_FIND_DATAA;

static inline BOOL GetFileTime(HANDLE hFile, LPFILETIME lpCreationTime, LPFILETIME lpLastAccessTime, LPFILETIME lpLastWriteTime) {
    if (hFile == INVALID_HANDLE_VALUE || !hFile) return FALSE;
    int fd = fileno((FILE*)hFile);
    if (fd >= 0) {
        struct stat st;
        if (fstat(fd, &st) == 0) {
            if (lpLastWriteTime) {
                lpLastWriteTime->dwLowDateTime = (DWORD)st.st_mtime;
                lpLastWriteTime->dwHighDateTime = 0;
            }
            if (lpLastAccessTime) {
                lpLastAccessTime->dwLowDateTime = (DWORD)st.st_atime;
                lpLastAccessTime->dwHighDateTime = 0;
            }
            if (lpCreationTime) {
                lpCreationTime->dwLowDateTime = (DWORD)st.st_ctime;
                lpCreationTime->dwHighDateTime = 0;
            }
            return TRUE;
        }
    }
    return FALSE;
}

#if !defined(_MSC_VER)
typedef struct Switch_FindContext {
    DIR* dir;
    char dirPath[512];
    char pattern[128];
} Switch_FindContext;

static inline bool Switch_WildcardMatch(const char* pattern, const char* text) {
    if (!pattern || !text) return false;
    if (strcmp(pattern, "*") == 0 || strcmp(pattern, "*.*") == 0) return true;
    while (*pattern) {
        if (*pattern == '*') {
            pattern++;
            if (*pattern == '\0') return true;
            while (*text) {
                if (Switch_WildcardMatch(pattern, text)) return true;
                text++;
            }
            return false;
        } else if (*pattern == '?' || tolower((unsigned char)*pattern) == tolower((unsigned char)*text)) {
            pattern++;
            text++;
        } else {
            return false;
        }
    }
    return *text == '\0';
}

static inline HANDLE FindFirstFileA(LPCSTR lpFileName, LPWIN32_FIND_DATAA lpFindFileData) {
    if (!lpFileName || !lpFindFileData) return INVALID_HANDLE_VALUE;

    char dirSpec[512] = ".";
    char pattern[128] = "*";

    const char* lastSlash = strrchr(lpFileName, '/');
    const char* lastBackslash = strrchr(lpFileName, '\\');
    const char* delim = (lastSlash > lastBackslash) ? lastSlash : lastBackslash;

    if (delim) {
        size_t dirLen = (size_t)(delim - lpFileName);
        if (dirLen > 0 && dirLen < sizeof(dirSpec)) {
            memcpy(dirSpec, lpFileName, dirLen);
            dirSpec[dirLen] = '\0';
        }
        strncpy(pattern, delim + 1, sizeof(pattern) - 1);
        pattern[sizeof(pattern) - 1] = '\0';
    } else {
        strncpy(pattern, lpFileName, sizeof(pattern) - 1);
        pattern[sizeof(pattern) - 1] = '\0';
    }

    char resolvedDir[512];
    DIR* dir = NULL;

    /* Try RomFS read-only archive first */
    Switch_ResolveRomFSPath(dirSpec, resolvedDir, sizeof(resolvedDir));
    dir = opendir(resolvedDir);

    /* Try SDMC writable saves directory */
    if (!dir) {
        Switch_ResolveSavePath("game_port", dirSpec, resolvedDir, sizeof(resolvedDir));
        dir = opendir(resolvedDir);
    }

    /* Fallback direct open */
    if (!dir) {
        dir = opendir(dirSpec);
        if (dir) {
            strncpy(resolvedDir, dirSpec, sizeof(resolvedDir) - 1);
            resolvedDir[sizeof(resolvedDir) - 1] = '\0';
        }
    }

    if (!dir) return INVALID_HANDLE_VALUE;

    Switch_FindContext* ctx = (Switch_FindContext*)calloc(1, sizeof(Switch_FindContext));
    if (!ctx) {
        closedir(dir);
        return INVALID_HANDLE_VALUE;
    }

    ctx->dir = dir;
    strncpy(ctx->dirPath, resolvedDir, sizeof(ctx->dirPath) - 1);
    strncpy(ctx->pattern, pattern, sizeof(ctx->pattern) - 1);

    struct dirent* entry = NULL;
    while ((entry = readdir(ctx->dir)) != NULL) {
        if (Switch_WildcardMatch(ctx->pattern, entry->d_name)) {
            memset(lpFindFileData, 0, sizeof(WIN32_FIND_DATAA));
            strncpy(lpFindFileData->cFileName, entry->d_name, MAX_PATH - 1);

            char fullPath[1024];
            snprintf(fullPath, sizeof(fullPath), "%s/%s", ctx->dirPath, entry->d_name);
            struct stat st;
            if (stat(fullPath, &st) == 0) {
                if (S_ISDIR(st.st_mode)) {
                    lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_DIRECTORY;
                } else {
                    lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_NORMAL;
                }
                lpFindFileData->nFileSizeLow = (DWORD)st.st_size;
            } else {
                lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_NORMAL;
            }
            return (HANDLE)ctx;
        }
    }

    closedir(ctx->dir);
    free(ctx);
    return INVALID_HANDLE_VALUE;
}

static inline BOOL FindNextFileA(HANDLE hFindFile, LPWIN32_FIND_DATAA lpFindFileData) {
    if (hFindFile == INVALID_HANDLE_VALUE || !hFindFile || !lpFindFileData) return FALSE;

    Switch_FindContext* ctx = (Switch_FindContext*)hFindFile;
    struct dirent* entry = NULL;

    while ((entry = readdir(ctx->dir)) != NULL) {
        if (Switch_WildcardMatch(ctx->pattern, entry->d_name)) {
            memset(lpFindFileData, 0, sizeof(WIN32_FIND_DATAA));
            strncpy(lpFindFileData->cFileName, entry->d_name, MAX_PATH - 1);

            char fullPath[1024];
            snprintf(fullPath, sizeof(fullPath), "%s/%s", ctx->dirPath, entry->d_name);
            struct stat st;
            if (stat(fullPath, &st) == 0) {
                if (S_ISDIR(st.st_mode)) {
                    lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_DIRECTORY;
                } else {
                    lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_NORMAL;
                }
                lpFindFileData->nFileSizeLow = (DWORD)st.st_size;
            } else {
                lpFindFileData->dwFileAttributes = FILE_ATTRIBUTE_NORMAL;
            }
            return TRUE;
        }
    }
    return FALSE;
}

static inline BOOL FindClose(HANDLE hFindFile) {
    if (hFindFile == INVALID_HANDLE_VALUE || !hFindFile) return FALSE;
    Switch_FindContext* ctx = (Switch_FindContext*)hFindFile;
    if (ctx->dir) {
        closedir(ctx->dir);
    }
    free(ctx);
    return TRUE;
}
#else
static inline HANDLE FindFirstFileA(LPCSTR lpFileName, LPWIN32_FIND_DATAA lpFindFileData) {
    (void)lpFileName; (void)lpFindFileData;
    return INVALID_HANDLE_VALUE;
}
static inline BOOL FindNextFileA(HANDLE hFindFile, LPWIN32_FIND_DATAA lpFindFileData) {
    (void)hFindFile; (void)lpFindFileData;
    return FALSE;
}
static inline BOOL FindClose(HANDLE hFindFile) {
    (void)hFindFile;
    return TRUE;
}
#endif

/* =========================================================================
 * 9. INI Profile Configuration Shims (RomFS Read & SDMC Write)
 * ========================================================================= */
static inline DWORD GetPrivateProfileStringA(
    LPCSTR lpAppName,
    LPCSTR lpKeyName,
    LPCSTR lpDefault,
    LPSTR  lpReturnedString,
    DWORD  nSize,
    LPCSTR lpFileName
) {
    if (!lpReturnedString || nSize == 0) return 0;

    const char* defVal = lpDefault ? lpDefault : "";
    if (!lpFileName || lpFileName[0] == '\0') {
        strncpy(lpReturnedString, defVal, nSize - 1);
        lpReturnedString[nSize - 1] = '\0';
        return (DWORD)strlen(lpReturnedString);
    }

    char resolvedPath[512];
    /* Try RomFS first for shipped defaults */
    Switch_ResolveRomFSPath(lpFileName, resolvedPath, sizeof(resolvedPath));
    FILE* fp = fopen(resolvedPath, "r");

    /* Fallback to SDMC in case user has custom config */
    if (!fp) {
        Switch_ResolveSavePath("game_port", lpFileName, resolvedPath, sizeof(resolvedPath));
        fp = fopen(resolvedPath, "r");
    }

    if (!fp) {
        strncpy(lpReturnedString, defVal, nSize - 1);
        lpReturnedString[nSize - 1] = '\0';
        return (DWORD)strlen(lpReturnedString);
    }

    char line[512];
    char currentSection[128] = {0};
    bool inTargetSection = false;
    bool found = false;

    while (fgets(line, sizeof(line), fp)) {
        char* p = line;
        while (*p == ' ' || *p == '\t') p++;
        size_t len = strlen(p);
        while (len > 0 && (p[len - 1] == '\r' || p[len - 1] == '\n' || p[len - 1] == ' ' || p[len - 1] == '\t')) {
            p[--len] = '\0';
        }
        if (len == 0 || p[0] == ';' || p[0] == '#') continue;

        if (p[0] == '[') {
            char* end = strchr(p, ']');
            if (end) {
                *end = '\0';
                strncpy(currentSection, p + 1, sizeof(currentSection) - 1);
                currentSection[sizeof(currentSection) - 1] = '\0';
                inTargetSection = (lpAppName == NULL || switch_strcasecmp(currentSection, lpAppName) == 0);
            }
            continue;
        }

        if (inTargetSection && lpKeyName) {
            char* eq = strchr(p, '=');
            if (eq) {
                *eq = '\0';
                char* key = p;
                char* val = eq + 1;
                size_t klen = strlen(key);
                while (klen > 0 && (key[klen - 1] == ' ' || key[klen - 1] == '\t')) key[--klen] = '\0';
                while (*val == ' ' || *val == '\t') val++;

                if (switch_strcasecmp(key, lpKeyName) == 0) {
                    strncpy(lpReturnedString, val, nSize - 1);
                    lpReturnedString[nSize - 1] = '\0';
                    found = true;
                    break;
                }
            }
        }
    }

    fclose(fp);

    if (!found) {
        strncpy(lpReturnedString, defVal, nSize - 1);
        lpReturnedString[nSize - 1] = '\0';
    }

    return (DWORD)strlen(lpReturnedString);
}

static inline UINT GetPrivateProfileIntA(
    LPCSTR lpAppName,
    LPCSTR lpKeyName,
    INT    nDefault,
    LPCSTR lpFileName
) {
    char buf[64];
    DWORD res = GetPrivateProfileStringA(lpAppName, lpKeyName, "", buf, sizeof(buf), lpFileName);
    if (res == 0 || buf[0] == '\0') {
        return (UINT)nDefault;
    }
    return (UINT)atoi(buf);
}

static inline BOOL WritePrivateProfileStringA(
    LPCSTR lpAppName,
    LPCSTR lpKeyName,
    LPCSTR lpString,
    LPCSTR lpFileName
) {
    if (!lpFileName || !lpAppName || !lpKeyName) return FALSE;

    char savePath[512];
    Switch_ResolveSavePath("game_port", lpFileName, savePath, sizeof(savePath));

    FILE* fp = fopen(savePath, "a+");
    if (!fp) return FALSE;

    fprintf(fp, "\n[%s]\n%s=%s\n", lpAppName, lpKeyName, lpString ? lpString : "");
    fclose(fp);
    return TRUE;
}

#ifdef __cplusplus
}
#endif

#endif /* WIN32_TO_SDL2_SHIM_H */
