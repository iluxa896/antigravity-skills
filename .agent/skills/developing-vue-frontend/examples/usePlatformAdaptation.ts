import { ref, computed, onMounted, onUnmounted, watch, type Ref } from 'vue';

export type OperatingSystem = 'ios' | 'android' | 'macos' | 'windows' | 'linux' | 'unknown';

export interface ViewportMetrics {
  width: number;
  height: number;
  visualHeight: number;
  isKeyboardOpen: boolean;
  dvhSupported: boolean;
}

export interface PlatformState {
  os: OperatingSystem;
  isIOS: boolean;
  isAndroid: boolean;
  isMacOS: boolean;
  isWindows: boolean;
  isTouchDevice: boolean;
  hasFinePointer: boolean;
  prefersReducedMotion: boolean;
  prefersDarkMode: boolean;
}

/**
 * Enterprise Cross-Platform Adaptation Composable for Vue 3
 *
 * Provides SSR-safe OS detection, visual viewport keyboard compensation (iOS/Android),
 * platform-specific keyboard shortcut formatting (Mac ⌘ vs Win/Android Ctrl),
 * and Android hardware/gesture back-button synchronization for modals and drawers.
 */
export function usePlatformAdaptation() {
  const isClient = typeof window !== 'undefined';

  // 1. Detect Operating System & Pointer Capabilities (SSR-Safe)
  const platform = computed<PlatformState>(() => {
    if (!isClient) {
      return {
        os: 'unknown',
        isIOS: false,
        isAndroid: false,
        isMacOS: false,
        isWindows: false,
        isTouchDevice: false,
        hasFinePointer: true,
        prefersReducedMotion: false,
        prefersDarkMode: false,
      };
    }

    const ua = navigator.userAgent || '';
    const platformStr = (navigator as any).userAgentData?.platform || navigator.platform || '';

    const isIOS = /iPad|iPhone|iPod/.test(ua) || (platformStr === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(ua);
    const isMacOS = /Macintosh|MacIntel|MacPPC|Mac68K/.test(platformStr) && !isIOS;
    const isWindows = /Win32|Win64|Windows|WinCE/.test(platformStr);
    const isLinux = /Linux/.test(platformStr) && !isAndroid;

    let os: OperatingSystem = 'unknown';
    if (isIOS) os = 'ios';
    else if (isAndroid) os = 'android';
    else if (isMacOS) os = 'macos';
    else if (isWindows) os = 'windows';
    else if (isLinux) os = 'linux';

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const hasFinePointer = window.matchMedia?.('(pointer: fine)').matches ?? !isTouchDevice;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const prefersDarkMode = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;

    return {
      os,
      isIOS,
      isAndroid,
      isMacOS,
      isWindows,
      isTouchDevice,
      hasFinePointer,
      prefersReducedMotion,
      prefersDarkMode,
    };
  });

  // 2. Visual Viewport & Virtual Keyboard Tracking (iOS & Android)
  const viewport = ref<ViewportMetrics>({
    width: isClient ? window.innerWidth : 1024,
    height: isClient ? window.innerHeight : 768,
    visualHeight: isClient && window.visualViewport ? window.visualViewport.height : 768,
    isKeyboardOpen: false,
    dvhSupported: isClient && CSS.supports ? CSS.supports('height', '100dvh') : false,
  });

  const updateViewport = () => {
    if (!isClient) return;

    const winHeight = window.innerHeight;
    const visualHeight = window.visualViewport ? window.visualViewport.height : winHeight;
    const keyboardOpen = (winHeight - visualHeight) > 120; // 120px+ threshold implies software keyboard

    viewport.value = {
      width: window.innerWidth,
      height: winHeight,
      visualHeight,
      isKeyboardOpen: keyboardOpen,
      dvhSupported: CSS.supports ? CSS.supports('height', '100dvh') : false,
    };
  };

  onMounted(() => {
    if (!isClient) return;
    updateViewport();

    window.addEventListener('resize', updateViewport, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateViewport, { passive: true });
      window.visualViewport.addEventListener('scroll', updateViewport, { passive: true });
    }
  });

  onUnmounted(() => {
    if (!isClient) return;
    window.removeEventListener('resize', updateViewport);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', updateViewport);
      window.visualViewport.removeEventListener('scroll', updateViewport);
    }
  });

  // 3. Format Keyboard Shortcuts cleanly per platform (Mac ⌘ vs Win/Android Ctrl)
  function formatShortcut(key: string, options: { alt?: boolean; shift?: boolean } = {}): string {
    const isMac = platform.value.isMacOS;
    const parts: string[] = [];

    if (options.alt)   parts.push(isMac ? '⌥' : 'Alt+');
    if (options.shift) parts.push(isMac ? '⇧' : 'Shift+');
    parts.push(isMac ? '⌘' : 'Ctrl+');
    parts.push(key.toUpperCase());

    return parts.join('');
  }

  // 4. Check if shortcut event matches platform modifier
  function isShortcutPressed(event: KeyboardEvent, key: string): boolean {
    const matchesModifier = platform.value.isMacOS ? event.metaKey : event.ctrlKey;
    return matchesModifier && event.key.toLowerCase() === key.toLowerCase();
  }

  return {
    platform,
    viewport,
    formatShortcut,
    isShortcutPressed,
  };
}

/**
 * Android Gesture & Hardware Back-Button Synchronization
 *
 * Ensures pressing the Android back button (or browser back swipe) closes an open
 * modal or drawer instead of navigating away from the current page.
 *
 * Automatically watches isOpen — no manual syncHistoryOnOpen call needed.
 */
export function useAndroidBackModalSync(isOpen: Ref<boolean>, onClose: () => void) {
  if (typeof window === 'undefined') return;

  let statePushed = false;

  const handlePopState = () => {
    if (isOpen.value) {
      statePushed = false;
      onClose();
    }
  };

  // Automatically push history entry when modal opens so Android back = close, not navigate
  watch(isOpen, (open) => {
    if (open && !statePushed) {
      statePushed = true;
      history.pushState({ modalOpen: true }, '', window.location.href);
    }
  });

  onMounted(() => {
    window.addEventListener('popstate', handlePopState);
    // Sync immediately if modal is already open when composable mounts
    if (isOpen.value && !statePushed) {
      statePushed = true;
      history.pushState({ modalOpen: true }, '', window.location.href);
    }
  });

  onUnmounted(() => {
    window.removeEventListener('popstate', handlePopState);
    if (statePushed && history.state?.modalOpen) {
      history.back();
    }
  });
}
