import { getCurrentScope, onScopeDispose, ref, watch, type Ref } from 'vue';

/**
 * useBodyScrollLock
 *
 * Enterprise-grade scroll lock composable resilient against WebKit (iOS Safari)
 * momentum-scroll deadlocks, tile rendering freezes, and layout shifts.
 *
 * Why this is necessary:
 * Mutating `document.body.style.overflow = 'hidden'` during active momentum scroll
 * causes iOS WebKit compositor to deadlock for 3–5 seconds (duration of inertial physics),
 * resulting in checkerboard / blank unrendered page tiles and frozen DOM paint loops.
 *
 * Clean Architecture & Safety:
 * - Reference counted across multiple concurrent modals / drawers.
 * - Compensates for desktop scrollbar width to prevent horizontal layout jumps.
 * - Uses onScopeDispose to guarantee complete memory cleanup on component or scope teardown.
 * - Restores exact original inline styles without state corruption.
 */

let activeLocksCount = 0;
let previousScrollY = 0;
let previousBodyPosition = '';
let previousBodyTop = '';
let previousBodyWidth = '';
let previousBodyOverflow = '';
let previousBodyPaddingRight = '';

export function useBodyScrollLock(isLocked: Ref<boolean> | (() => boolean)) {
    const isCurrentlyLocked = ref(false);

    const lock = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (isCurrentlyLocked.value) return;

        activeLocksCount++;
        isCurrentlyLocked.value = true;

        if (activeLocksCount === 1) {
            // Measure scrollbar width before locking to avoid layout jump on desktop (Windows / Mac)
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            const docStyle = window.getComputedStyle(document.documentElement);
            const hasScrollbarGutter = (docStyle.scrollbarGutter || '').includes('stable');

            // Capture current scroll offset and inline styles
            previousScrollY = window.scrollY || document.documentElement.scrollTop;
            previousBodyPosition = document.body.style.position;
            previousBodyTop = document.body.style.top;
            previousBodyWidth = document.body.style.width;
            previousBodyOverflow = document.body.style.overflow;
            previousBodyPaddingRight = document.body.style.paddingRight;

            // Lock position without tearing down WebKit compositor tree
            document.body.style.position = 'fixed';
            document.body.style.top = `-${previousScrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';

            // Only pad if scrollbar-gutter is not already reserving the space
            if (!hasScrollbarGutter && scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }
    };

    const unlock = () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        if (!isCurrentlyLocked.value) return;

        activeLocksCount = Math.max(0, activeLocksCount - 1);
        isCurrentlyLocked.value = false;

        if (activeLocksCount === 0) {
            const scrollYToRestore = previousScrollY;

            document.body.style.position = previousBodyPosition;
            document.body.style.top = previousBodyTop;
            document.body.style.width = previousBodyWidth;
            document.body.style.overflow = previousBodyOverflow;
            document.body.style.paddingRight = previousBodyPaddingRight;

            // Restore scroll position instantly
            window.scrollTo({
                top: scrollYToRestore,
                left: 0,
                behavior: 'instant' as ScrollBehavior,
            });
        }
    };

    watch(
        () => (typeof isLocked === 'function' ? isLocked() : isLocked.value),
        (locked) => {
            if (locked) {
                lock();
            } else {
                unlock();
            }
        },
        { immediate: true }
    );

    // Guaranteed cleanup on component unmount or effect-scope disposal (prevents memory/style leaks)
    if (getCurrentScope()) {
        onScopeDispose(() => {
            if (isCurrentlyLocked.value) {
                unlock();
            }
        });
    }

    return {
        lock,
        unlock,
        isCurrentlyLocked,
    };
}
