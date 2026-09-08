<script setup lang="ts">
/**
 * Radix Vue Dialog Example
 *
 * Production-grade modal dialog built on Radix Vue primitives.
 * Provides automatic focus trapping, keyboard navigation (Esc to close),
 * screen reader announcements, and portal rendering.
 *
 * Cross-platform features:
 * - iOS: Safe area insets, 100dvh, WebKit momentum scroll lock
 * - Android: Hardware back-button sync, overscroll containment, touch-action
 * - macOS: Retina font smoothing, Cmd-key awareness
 * - Windows: scrollbar-gutter stability, High Contrast Mode, hover isolation
 *
 * Cross-browser: @supports backdrop-filter fallback for Firefox/Safari compat.
 */
import { toRef, watch } from 'vue';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'radix-vue';
import { X } from 'lucide-vue-next';
import { useBodyScrollLock } from './useBodyScrollLock';
import { useAndroidBackModalSync } from './usePlatformAdaptation';

const props = defineProps<{
  open: boolean;
  title: string;
  description?: string;
}>();

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void;
}>();

// Cross-platform scroll lock: prevents iOS WebKit momentum deadlock & Windows scrollbar shift
const isOpenRef = toRef(props, 'open');
useBodyScrollLock(isOpenRef);

// Android hardware/gesture back button: pressing back closes dialog instead of navigating away
useAndroidBackModalSync(isOpenRef, () => emit('update:open', false));

const handleOpenChange = (value: boolean) => {
  emit('update:open', value);
};
</script>

<template>
  <DialogRoot :open="open" @update:open="handleOpenChange">
    <!-- Trigger slot: consumer provides trigger button -->
    <DialogTrigger as-child>
      <slot name="trigger" />
    </DialogTrigger>

    <!-- Portal: renders to body, isolated from parent stacking context -->
    <DialogPortal>
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <!-- Overlay: Decoupled from dialog (prevents Android Blink flex-sibling flash) -->
        <DialogOverlay v-if="open" class="dialog-overlay" />
      </Transition>

      <Transition
        enter-active-class="transition-all duration-250 ease-out"
        enter-from-class="opacity-0 translate-y-4 scale-95"
        enter-to-class="opacity-100 translate-y-0 scale-100"
        leave-active-class="transition-all duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 scale-100"
        leave-to-class="opacity-0 translate-y-4 scale-95"
      >
        <DialogContent v-if="open" class="dialog-content">
          <!-- Header -->
          <div class="dialog-header">
            <div>
              <DialogTitle class="dialog-title">{{ title }}</DialogTitle>
              <DialogDescription v-if="description" class="dialog-description">
                {{ description }}
              </DialogDescription>
            </div>

            <DialogClose class="dialog-close-button" aria-label="Close dialog">
              <X class="dialog-close-icon" />
            </DialogClose>
          </div>

          <!-- Scrollable Body with overscroll containment & iOS momentum scrolling -->
          <div class="dialog-body">
            <slot />
          </div>

          <!-- Optional footer slot -->
          <div v-if="$slots.footer" class="dialog-footer">
            <slot name="footer" />
          </div>
        </DialogContent>
      </Transition>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
/* ============================================================
   Overlay: fixed backdrop with @supports fallback for browsers
   that don't support backdrop-filter (older Firefox, etc.)
   ============================================================ */
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(15, 23, 42, 0.75);
}

@supports (backdrop-filter: blur(1px)) {
  .dialog-overlay {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
  }
}

/* Opaque fallback when backdrop-filter is not supported */
@supports not (backdrop-filter: blur(1px)) {
  .dialog-overlay {
    background: rgba(15, 23, 42, 0.92);
  }
}

/* ============================================================
   Content: centered dialog panel with cross-platform safety
   ============================================================ */
.dialog-content {
  position: fixed;
  z-index: 51;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% - 2rem);
  max-width: 40rem;
  /* Cross-platform dynamic height: dvh for iOS Safari toolbar, vh fallback */
  max-height: 90vh;
  max-height: min(90dvh, 90vh);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #ffffff;
  border-radius: 1.5rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  /* GPU compositing layer for smooth transitions */
  -webkit-transform: translate(-50%, -50%) translate3d(0, 0, 0);
  transform: translate(-50%, -50%) translate3d(0, 0, 0);
  /* iOS Safe Area insets (notches, dynamic islands, home bar) */
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

/* ============================================================
   Header, Body, Footer
   ============================================================ */
.dialog-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0;
  flex-shrink: 0;
}

.dialog-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
  line-height: 1.3;
}

.dialog-description {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0.25rem 0 0;
  line-height: 1.5;
}

.dialog-close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 9999px;
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 0.15s ease, color 0.15s ease;
  /* Eliminate 300ms mobile tap latency & grey highlight */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.dialog-close-icon {
  width: 1.125rem;
  height: 1.125rem;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;
  /* Prevent background pull-to-refresh on Android Chrome */
  overscroll-behavior-y: contain;
}

.dialog-footer {
  padding: 1rem 1.5rem 1.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  flex-shrink: 0;
}

/* ============================================================
   Cross-platform hover/touch isolation
   ============================================================ */

/* Hover effects: desktop mouse/trackpad only (Mac / Windows PC) */
@media (hover: hover) and (pointer: fine) {
  .dialog-close-button:hover {
    background-color: #f1f5f9;
    color: #0f172a;
  }
}

/* Touch screen feedback (iOS / Android) */
@media (pointer: coarse) {
  .dialog-close-button:active {
    background-color: #e2e8f0;
    transform: scale(0.92);
  }
}

/* ============================================================
   Windows High Contrast Mode support
   ============================================================ */
@media (forced-colors: active) {
  .dialog-content {
    border: 2px solid ButtonText;
  }
  .dialog-close-button {
    border: 1px solid ButtonText;
  }
}

/* ============================================================
   Cross-browser scrollbar styling
   ============================================================ */

/* Firefox standard */
.dialog-body {
  scrollbar-width: thin;
  scrollbar-color: rgba(148, 163, 184, 0.4) transparent;
}

/* Chrome, Safari, Edge */
.dialog-body::-webkit-scrollbar {
  width: 6px;
}

.dialog-body::-webkit-scrollbar-track {
  background: transparent;
}

.dialog-body::-webkit-scrollbar-thumb {
  background-color: rgba(148, 163, 184, 0.4);
  border-radius: 3px;
}
</style>
