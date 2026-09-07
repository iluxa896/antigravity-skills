/**
 * switch-game-main.c
 *
 * Enterprise-grade reference implementation for a ported Win32 game running natively
 * on Nintendo Switch via win32_to_sdl2_shim.h and SDL2.
 *
 * Demonstrates:
 * - Direct software pixel buffer manipulation (32-bit ARGB8888)
 * - Joy-Con and keyboard input processing via GetAsyncKeyState()
 * - Capacitive touch screen mouse cursor emulation via GetCursorPos()
 * - RomFS asset path resolution & SD Card save path resolution
 * - Win32 File I/O subsystem (CreateFileA, WriteFile, CloseHandle)
 * - INI configuration parsing via GetPrivateProfileStringA / GetPrivateProfileIntA
 * - Virtual memory management via VirtualAlloc / VirtualFree
 * - Thread-safe synchronization via CRITICAL_SECTION
 * - 60 FPS fixed timestep game loop with frame-rate independent physics
 * - Clean shutdown handling (Minus + Plus combo or window close)
 */

#define SHIM_IMPLEMENTATION
#include "win32_to_sdl2_shim.h"

#define GAME_WIDTH  640
#define GAME_HEIGHT 360
#define TARGET_FPS  60
#define FRAME_DELAY (1000 / TARGET_FPS)

typedef struct {
    float x;
    float y;
    float vx;
    float vy;
    int   size;
    uint32_t color;
} PlayerEntity;

static void ClearScreen(uint32_t argbColor) {
    uint32_t* buffer = g_switch_shim.pixelBuffer;
    int totalPixels = GAME_WIDTH * GAME_HEIGHT;
    for (int i = 0; i < totalPixels; i++) {
        buffer[i] = argbColor;
    }
}

static void DrawRect(int x, int y, int width, int height, uint32_t argbColor) {
    uint32_t* buffer = g_switch_shim.pixelBuffer;

    int x0 = (x < 0) ? 0 : x;
    int y0 = (y < 0) ? 0 : y;
    int x1 = (x + width > GAME_WIDTH) ? GAME_WIDTH : (x + width);
    int y1 = (y + height > GAME_HEIGHT) ? GAME_HEIGHT : (y + height);

    for (int cy = y0; cy < y1; cy++) {
        int rowOffset = cy * GAME_WIDTH;
        for (int cx = x0; cx < x1; cx++) {
            buffer[rowOffset + cx] = argbColor;
        }
    }
}

int main(int argc, char* argv[]) {
    (void)argc;
    (void)argv;

    printf("[Game] Initializing Ported Game Subsystems...\n");

    /* Initialize Switch Shim at 640x360, upscaled to 1280x720 by SDL_RenderSetLogicalSize */
    if (!Switch_InitShim("Nintendo Switch Ported Title", GAME_WIDTH, GAME_HEIGHT)) {
        fprintf(stderr, "[Game] Fatal: Failed to initialize Switch Shim.\n");
        return 1;
    }

    /* Demonstrate RomFS asset path resolution (read-only assets) */
    char assetPath[256];
    Switch_ResolveRomFSPath("data\\levels\\stage1.dat", assetPath, sizeof(assetPath));
    printf("[Game] Resolved RomFS Path: %s\n", assetPath);

    /* Demonstrate writable SD Card save path resolution */
    char savePath[256];
    Switch_ResolveSavePath("switch_port_demo", "saves\\progress.sav", savePath, sizeof(savePath));
    printf("[Game] Resolved Save Path:  %s\n", savePath);

    /* Demonstrate INI Profile Configuration (RomFS / SDMC) */
    UINT masterVol = GetPrivateProfileIntA("Audio", "MasterVolume", 85, "options.ini");
    char playerName[64];
    GetPrivateProfileStringA("Player", "Name", "Hero", playerName, sizeof(playerName), "options.ini");
    printf("[Game] Configuration: Player=%s, MasterVolume=%u%%\n", playerName, masterVol);

    /* Demonstrate VirtualAlloc heap allocation for game entities/scratch */
    SYSTEM_INFO sysInfo;
    GetSystemInfo(&sysInfo);
    printf("[Game] System Info: CPUs=%u, PageSize=%u bytes\n", (unsigned)sysInfo.dwNumberOfProcessors, (unsigned)sysInfo.dwPageSize);

    void* scratchArena = VirtualAlloc(NULL, 64 * 1024, MEM_COMMIT, PAGE_READWRITE);
    if (scratchArena) {
        printf("[Game] Allocated 64 KB scratch arena via VirtualAlloc.\n");
    }

    /* Demonstrate Win32 File I/O (CreateFileA, WriteFile, FlushFileBuffers, CloseHandle) */
    HANDLE hFile = CreateFileA("saves\\state.bin", GENERIC_WRITE, 0, NULL, CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, NULL);
    if (hFile != INVALID_HANDLE_VALUE) {
        uint32_t magic = 0x53574954; /* 'SWIT' */
        DWORD bytesWritten = 0;
        WriteFile(hFile, &magic, sizeof(magic), &bytesWritten, NULL);
        FlushFileBuffers(hFile);
        CloseHandle(hFile);
        printf("[Game] Wrote save file via Win32 CreateFileA/WriteFile (%u bytes).\n", (unsigned)bytesWritten);
    }

    /* Demonstrate directory enumeration via FindFirstFileA / FindClose */
    WIN32_FIND_DATAA findData;
    HANDLE hFind = FindFirstFileA("saves\\*.bin", &findData);
    if (hFind != INVALID_HANDLE_VALUE) {
        printf("[Game] Discovered save file: %s (%u bytes)\n", findData.cFileName, (unsigned)findData.nFileSizeLow);
        FindClose(hFind);
    }

    /* Demonstrate thread-safe Critical Section initialization */
    CRITICAL_SECTION audioLock;
    InitializeCriticalSection(&audioLock);

    PlayerEntity player = {
        .x = (float)(GAME_WIDTH / 2 - 16),
        .y = (float)(GAME_HEIGHT / 2 - 16),
        .vx = 0.0f,
        .vy = 0.0f,
        .size = 32,
        .color = 0xFF00FF7F /* Spring Green */
    };

    DWORD lastFrameTime = GetTickCount();
    uint8_t bgHue = 0;

    printf("[Game] Entering Main Game Loop (Hold Minus + Plus to exit)...\n");

    while (!g_switch_shim.shouldQuit) {
        DWORD frameStart = GetTickCount();
        float deltaTime = (frameStart > lastFrameTime) ? (float)(frameStart - lastFrameTime) / 1000.0f : 0.0166f;
        if (deltaTime > 0.05f) deltaTime = 0.05f; /* Clamp to avoid spiral of death on lag */

        /* 1. Process Input via Win32 Shim (Joy-Con / WASD / Keyboard / Touch Screen) */
        const float moveSpeed = 240.0f; /* Pixels per second */
        player.vx = 0.0f;
        player.vy = 0.0f;

        /* Touch Screen / Mouse Point-and-Click Positioning */
        POINT mousePos;
        if (GetCursorPos(&mousePos) && GetAsyncKeyState(VK_LBUTTON)) {
            player.x = (float)(mousePos.x - player.size / 2);
            player.y = (float)(mousePos.y - player.size / 2);
        }

        if (GetAsyncKeyState(VK_LEFT))  player.vx -= moveSpeed;
        if (GetAsyncKeyState(VK_RIGHT)) player.vx += moveSpeed;
        if (GetAsyncKeyState(VK_UP))    player.vy -= moveSpeed;
        if (GetAsyncKeyState(VK_DOWN))  player.vy += moveSpeed;

        /* Action button (A button on Switch or Spacebar on PC) changes color & triggers audio */
        if (GetAsyncKeyState(VK_SPACE)) {
            player.color = 0xFFFF4500; /* Orange Red */
            EnterCriticalSection(&audioLock);
            sndPlaySoundA("romfs:/audio/jump.wav", 0);
            LeaveCriticalSection(&audioLock);
        } else {
            player.color = 0xFF00FF7F; /* Spring Green */
        }

        /* 2. Update Game State (Frame-rate independent movement) */
        player.x += player.vx * deltaTime;
        player.y += player.vy * deltaTime;

        /* Screen boundary clamping */
        if (player.x < 0.0f) player.x = 0.0f;
        if (player.y < 0.0f) player.y = 0.0f;
        if (player.x + player.size > GAME_WIDTH)  player.x = (float)(GAME_WIDTH - player.size);
        if (player.y + player.size > GAME_HEIGHT) player.y = (float)(GAME_HEIGHT - player.size);

        /* 3. Render Scene to Software Framebuffer */
        bgHue++;
        uint32_t bgColor = 0xFF000000 | ((bgHue / 4) << 16) | ((bgHue / 2) << 8) | (bgHue % 64);
        ClearScreen(bgColor);

        /* Draw Player Entity */
        DrawRect((int)player.x, (int)player.y, player.size, player.size, player.color);

        /* 4. Present Frame via Accelerated SDL2 Texture Flip */
        Switch_PresentFrame();

        /* 5. Framerate Throttling to 60 FPS */
        DWORD frameDuration = GetTickCount() - frameStart;
        if (frameDuration < FRAME_DELAY) {
            Sleep(FRAME_DELAY - frameDuration);
        }
        lastFrameTime = frameStart;
    }

    printf("[Game] Graceful shutdown requested. Cleaning up resources...\n");
    DeleteCriticalSection(&audioLock);
    if (scratchArena) {
        VirtualFree(scratchArena, 0, MEM_RELEASE);
    }
    Switch_ShutdownShim();
    printf("[Game] Exit clean.\n");
    return 0;
}
