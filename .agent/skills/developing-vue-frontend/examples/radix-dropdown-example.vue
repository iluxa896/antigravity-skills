<script setup lang="ts">
/**
 * Universal Radix Vue Dropdown Menu Example
 *
 * Production-ready, fully accessible dropdown menu built on Radix Vue primitives.
 * Works universally across both:
 * - Archetype A: Inertia.js Monoliths (using Inertia <Link> or router actions)
 * - Archetype B: Standalone Vue 3 SPAs (using <RouterLink> or standard emits)
 *
 * Features:
 * - WAI-ARIA Menu role, keyboard arrow-key navigation, Esc to dismiss, focus restoration.
 * - Headless styling with clean Tailwind CSS utility classes.
 * - Slot-based trigger composition via `as-child`.
 * - Cross-platform touch resilience: touch-action manipulation, hover isolation.
 */
import { ref } from 'vue';
import {
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from 'radix-vue';
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
} from 'lucide-vue-next';

interface DropdownAction {
  id: string;
  label: string;
  href?: string;
  danger?: boolean;
}

const props = withDefaults(
  defineProps<{
    userName?: string;
    userEmail?: string;
    align?: 'start' | 'center' | 'end';
  }>(),
  {
    userName: 'Александр',
    userEmail: 'alex@example.com',
    align: 'end',
  }
);

const emit = defineEmits<{
  (e: 'select', actionId: string): void;
  (e: 'logout'): void;
}>();

const isOpen = ref(false);

const handleItemSelect = (actionId: string) => {
  if (actionId === 'logout') {
    emit('logout');
  } else {
    emit('select', actionId);
  }
};
</script>

<template>
  <DropdownMenuRoot v-model:open="isOpen">
    <!-- Trigger: Use as-child so Radix attaches aria-* directly to your custom button -->
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 transition-colors touch-manipulation"
        aria-label="User account menu"
      >
        <span class="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs uppercase">
          {{ userName.charAt(0) }}
        </span>
        <span class="hidden sm:inline">{{ userName }}</span>
        <ChevronDown
          class="w-4 h-4 text-slate-400 transition-transform duration-200"
          :class="{ 'rotate-180': isOpen }"
        />
      </button>
    </DropdownMenuTrigger>

    <!-- Portal renders content into body to avoid overflow:hidden clipping from parents -->
    <DropdownMenuPortal>
      <DropdownMenuContent
        :align="align"
        :side-offset="6"
        class="z-50 min-w-[13rem] p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-900/5 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2"
      >
        <!-- User Info Header -->
        <DropdownMenuLabel class="px-2.5 py-2 text-xs text-slate-500">
          <p class="font-medium text-slate-800 text-sm truncate">{{ userName }}</p>
          <p class="truncate text-slate-400 font-normal">{{ userEmail }}</p>
        </DropdownMenuLabel>

        <DropdownMenuSeparator class="h-px bg-slate-100 my-1" />

        <!-- Profile Item -->
        <DropdownMenuItem
          class="group flex items-center gap-2 px-2.5 py-2 text-sm text-slate-700 rounded-lg cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 transition-colors"
          @select="handleItemSelect('profile')"
        >
          <User class="w-4 h-4 text-slate-400 group-data-[highlighted]:text-slate-600" />
          <span>Профиль</span>
        </DropdownMenuItem>

        <!-- Settings Item -->
        <DropdownMenuItem
          class="group flex items-center gap-2 px-2.5 py-2 text-sm text-slate-700 rounded-lg cursor-pointer select-none outline-none data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900 transition-colors"
          @select="handleItemSelect('settings')"
        >
          <Settings class="w-4 h-4 text-slate-400 group-data-[highlighted]:text-slate-600" />
          <span>Настройки</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator class="h-px bg-slate-100 my-1" />

        <!-- Logout Item (Danger) -->
        <DropdownMenuItem
          class="group flex items-center gap-2 px-2.5 py-2 text-sm text-rose-600 rounded-lg cursor-pointer select-none outline-none data-[highlighted]:bg-rose-50 data-[highlighted]:text-rose-700 transition-colors"
          @select="handleItemSelect('logout')"
        >
          <LogOut class="w-4 h-4 text-rose-500 group-data-[highlighted]:text-rose-600" />
          <span>Выйти</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
