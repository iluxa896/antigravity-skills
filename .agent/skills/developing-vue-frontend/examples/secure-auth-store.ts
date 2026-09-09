import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'editor';
}

/**
 * ============================================================================
 * [ARCHETYPE B: STANDALONE VUE 3 SPA ONLY]
 * DO NOT USE IN INERTIA.JS MONOLITHS (Archetype A).
 *
 * For Inertia.js applications (Laravel/Rails + Vue):
 * - Authentication is managed via server-side session cookies (HttpOnly, CSRF).
 * - Current user and auth state are accessed directly via:
 *     import { usePage } from '@inertiajs/vue3';
 *     const user = computed(() => usePage().props.auth.user);
 * - Never create Pinia auth stores or manual JWT refresh loops in Inertia apps.
 *
 * Use this Pinia store ONLY for Standalone SPAs (Vite/Nuxt + REST API).
 * ============================================================================
 *
 * Security Principles (Standalone SPA):
 * 1. Keep Short-Lived Access Tokens in-memory (RAM only). Never persist access tokens in localStorage/sessionStorage
 *    where rogue 3rd-party scripts or XSS payloads can extract them.
 * 2. Rely on HTTP-Only, Secure, SameSite=Strict cookies for refresh tokens.
 * 3. Sanitize user profile state and provide clean computed guards.
 */
export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const user = ref<UserProfile | null>(null);
  const accessToken = ref<string | null>(null);
  const isAuthenticating = ref<boolean>(false);
  const authError = ref<string | null>(null);

  // --- GETTERS ---
  const isAuthenticated = computed(() => Boolean(accessToken.value && user.value));
  const userRole = computed(() => user.value?.role ?? 'user');
  const isAdmin = computed(() => user.value?.role === 'admin');

  // --- ACTIONS ---

  /**
   * Set in-memory access token safely
   */
  function setAccessToken(token: string | null): void {
    accessToken.value = token;
  }

  /**
   * Set sanitized user profile
   */
  function setUser(profile: UserProfile | null): void {
    if (!profile) {
      user.value = null;
      return;
    }

    // Defensive cloning and sanitization
    user.value = {
      id: String(profile.id).trim(),
      email: String(profile.email).trim().toLowerCase(),
      name: String(profile.name).trim(),
      role: profile.role,
    };
  }

  /**
   * Perform silent refresh of access token via HTTP-Only cookie endpoint
   */
  async function silentRefreshToken(): Promise<boolean> {
    try {
      isAuthenticating.value = true;
      authError.value = null;

      const response = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Sends HttpOnly cookie
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest', // Anti-CSRF defense
        },
      });

      if (!response.ok) {
        clearSession();
        return false;
      }

      const data = (await response.json()) as { token: string; user: UserProfile };
      setAccessToken(data.token);
      setUser(data.user);
      return true;
    } catch (err: unknown) {
      clearSession();
      authError.value = err instanceof Error ? err.message : 'Session refresh failed';
      return false;
    } finally {
      isAuthenticating.value = false;
    }
  }

  /**
   * Clear all authenticated state
   */
  function clearSession(): void {
    accessToken.value = null;
    user.value = null;
    authError.value = null;
  }

  /**
   * Graceful Logout
   */
  async function logout(): Promise<void> {
    try {
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(accessToken.value ? { Authorization: `Bearer ${accessToken.value}` } : {}),
        },
      });
    } finally {
      clearSession();
    }
  }

  return {
    // State & Getters
    user,
    accessToken,
    isAuthenticating,
    authError,
    isAuthenticated,
    userRole,
    isAdmin,

    // Actions
    setAccessToken,
    setUser,
    silentRefreshToken,
    clearSession,
    logout,
  };
});
