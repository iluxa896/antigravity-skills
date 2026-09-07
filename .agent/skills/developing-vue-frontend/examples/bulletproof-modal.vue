<script setup lang="ts">
import { onUnmounted, toRef, watch } from 'vue';
import { X } from 'lucide-vue-next';
import { useBodyScrollLock } from './useBodyScrollLock';
import { useAndroidBackModalSync } from './usePlatformAdaptation';

const props = defineProps<{
  isOpen: boolean;
  title: string;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// 1. Safe scroll locking immune to iOS Safari WebKit momentum freeze & Windows scrollbar shifts
const isOpenRef = toRef(props, 'isOpen');
useBodyScrollLock(isOpenRef);

// 2. Android hardware/gesture back button synchronization: back dismisses modal instead of page exit
const { syncHistoryOnOpen } = useAndroidBackModalSync(isOpenRef, () => emit('close'));

const handleKeyDown = (e: KeyboardEvent) => {
  if (props.isOpen && e.key === 'Escape') {
    emit('close');
  }
};

// 3. Memory-safe conditional event listener: never listen globally when closed
watch(
  isOpenRef,
  (open) => {
    if (typeof window !== 'undefined') {
      if (open) {
        window.addEventListener('keydown', handleKeyDown);
        syncHistoryOnOpen();
      } else {
        window.removeEventListener('keydown', handleKeyDown);
      }
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeyDown);
  }
});
</script>

<template>
  <Teleport to="body">
    <!-- Root transition: controls presence of entire modal tree symmetrically -->
    <Transition
      enter-active-class="transition-opacity duration-250 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        :aria-label="title"
      >
        <!-- Layer 1: Backdrop (Dedicated stacking layer, never mixed as flex sibling to prevent Blink visual flash) -->
        <div
          class="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity"
          @click="emit('close')"
          aria-hidden="true"
        />

        <!-- Layer 2: Positioning Wrapper (Decoupled from backdrop; handles safe area padding for iOS/Android) -->
        <div
          class="fixed inset-0 flex items-center justify-center p-4 pointer-events-none modal-wrapper"
        >
          <Transition
            appear
            enter-active-class="transition-all duration-250 ease-out"
            enter-from-class="opacity-0 translate-y-4 scale-95"
            enter-to-class="opacity-100 translate-y-0 scale-100"
            leave-active-class="transition-all duration-150 ease-in"
            leave-from-class="opacity-100 translate-y-0 scale-100"
            leave-to-class="opacity-0 translate-y-4 scale-95"
          >
            <div
              v-if="isOpen"
              class="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-stone-200/90 pointer-events-auto flex flex-col modal-dialog transform-gpu"
            >
              <!-- Header -->
              <div class="flex items-center justify-between p-5 border-b border-stone-200/80 shrink-0">
                <h2 class="text-xl font-bold text-slate-900 tracking-tight">{{ title }}</h2>
                <button
                  type="button"
                  @click="emit('close')"
                  class="close-button w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-stone-100 transition-colors"
                  aria-label="Close dialog"
                >
                  <X class="w-5 h-5" />
                </button>
              </div>

              <!-- Scrollable Body with overscroll containment & iOS momentum scrolling -->
              <div class="p-6 overflow-y-auto overscroll-contain flex-1 modal-body">
                <slot />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-wrapper {
  /* iOS Safe Area insets (notches, dynamic islands, home bar) */
  padding-top: max(1rem, env(safe-area-inset-top, 0px));
  padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px));
  padding-left: max(1rem, env(safe-area-inset-left, 0px));
  padding-right: max(1rem, env(safe-area-inset-right, 0px));
}

.modal-dialog {
  /* Cross-platform dynamic height (fallback to vh, preference for 100dvh) */
  max-height: 90vh;
  max-height: min(90dvh, 90vh);
  overflow: hidden;
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
}

.modal-body {
  -webkit-overflow-scrolling: touch;
  /* Prevent background pull-to-refresh on Android Chrome */
  overscroll-behavior-y: contain;
}

.close-button {
  /* Remove 300ms mobile tap latency & disable grey highlight */
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Isolate hover effects exclusively to fine pointer / mouse devices (Mac / Windows PC) */
@media (hover: hover) and (pointer: fine) {
  .close-button:hover {
    background-color: rgb(245 245 244);
    color: rgb(15 23 42);
  }
}

/* Touch screen devices (Android, iPhone) active feedback */
@media (pointer: coarse) {
  .close-button:active {
    background-color: rgb(231 229 228);
    transform: scale(0.95);
  }
}

/* Windows High Contrast Mode support */
@media (forced-colors: active) {
  .modal-dialog {
    border: 2px solid ButtonText;
  }
  .close-button {
    border: 1px solid ButtonText;
  }
}
</style>
