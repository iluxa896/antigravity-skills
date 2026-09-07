#!/usr/bin/env bash
# build_nro.sh - Production-grade Switch NRO compilation script using devkitA64 and SDL2
# Supports optional RomFS packaging, NACP metadata generation, and error checking.

set -euo pipefail

if [ -z "${DEVKITPRO:-}" ]; then
    echo "ERROR: DEVKITPRO environment variable is not set."
    echo "Please install devkitPro and export DEVKITPRO=/opt/devkitpro (or C:/devkitPro on Windows)."
    exit 1
fi

export PATH="$DEVKITPRO/devkitA64/bin:$DEVKITPRO/tools/bin:$PATH"

# Configuration variables
TARGET="${TARGET:-switch_game}"
APP_TITLE="${APP_TITLE:-Ported Switch Game}"
APP_AUTHOR="${APP_AUTHOR:-Homebrew Developer}"
APP_VERSION="${APP_VERSION:-1.0.0}"
SOURCE_FILES="${SOURCE_FILES:-main.c}"
OUTPUT_DIR="${OUTPUT_DIR:-out}"
ROMFS_DIR="${ROMFS_DIR:-romfs}"

mkdir -p "$OUTPUT_DIR"

echo "=================================================="
echo " Building Nintendo Switch NRO Package: $TARGET"
echo "=================================================="

# 1. Compile native AArch64 binary
echo "[1/3] Compiling native AArch64 ELF binary..."
aarch64-none-elf-gcc -O2 -Wall -Wextra \
    -march=armv8-a+crc+crypto -mtune=cortex-a57 -mtp=soft \
    -ffunction-sections -fdata-sections \
    -specs="$DEVKITPRO/libnx/switch.specs" \
    -D__SWITCH__=1 \
    -I"$DEVKITPRO/libnx/include" \
    -I"$DEVKITPRO/portlibs/switch/include" \
    -I. \
    -L"$DEVKITPRO/libnx/lib" \
    -L"$DEVKITPRO/portlibs/switch/lib" \
    $SOURCE_FILES \
    -Wl,--gc-sections \
    -lSDL2 -lSDL2_image -lSDL2_mixer -lnx -lm \
    -o "$OUTPUT_DIR/$TARGET.elf"

# 2. Generate NACP metadata if nacptool is available
NACP_ARG=""
if command -v nacptool >/dev/null 2>&1; then
    echo "[2/3] Generating NACP application metadata..."
    nacptool --create "$APP_TITLE" "$APP_AUTHOR" "$APP_VERSION" "$OUTPUT_DIR/$TARGET.nacp"
    NACP_ARG="--nacp=$OUTPUT_DIR/$TARGET.nacp"
else
    echo "[2/3] nacptool not found; using inline elf2nro arguments..."
fi

# 3. Package into .nro with optional RomFS and Icon
echo "[3/3] Packaging into homebrew NRO binary..."
ROMFS_ARG=""
if [ -d "$ROMFS_DIR" ]; then
    echo "  -> Embedding RomFS directory: $ROMFS_DIR"
    ROMFS_ARG="--romfsdir=$ROMFS_DIR"
fi

ICON_ARG=""
if [ -f "icon.jpg" ]; then
    echo "  -> Embedding icon: icon.jpg"
    ICON_ARG="--icon=icon.jpg"
elif [ -f "icon.png" ]; then
    echo "  -> Embedding icon: icon.png"
    ICON_ARG="--icon=icon.png"
elif [ -f "assets/icon.jpg" ]; then
    echo "  -> Embedding icon: assets/icon.jpg"
    ICON_ARG="--icon=assets/icon.jpg"
fi

elf2nro "$OUTPUT_DIR/$TARGET.elf" "$OUTPUT_DIR/$TARGET.nro" \
    $NACP_ARG \
    $ROMFS_ARG \
    $ICON_ARG \
    --name="$APP_TITLE" \
    --author="$APP_AUTHOR" \
    --version="$APP_VERSION"

echo "=================================================="
echo " BUILD SUCCESSFUL!"
echo " Output Binary: $OUTPUT_DIR/$TARGET.nro"
echo "=================================================="
