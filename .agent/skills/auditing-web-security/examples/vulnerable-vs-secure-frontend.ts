/**
 * Web Security Master Example: Vulnerable vs Secure Frontend TypeScript Patterns
 * 
 * Demonstrates common client-side vulnerabilities (DOM XSS, Storage Leaks,
 * CSRF, Open Redirects) alongside enterprise-grade, typesafe remediation patterns.
 */

import DOMPurify from 'dompurify';

export interface UserCommentProps {
  commentText: string;
}

export interface UserProfileResponse {
  id: string;
  name: string;
  email: string;
}

// ============================================================================
// 1. DOM-Based XSS (Cross-Site Scripting)
// ============================================================================

// ❌ VULNERABLE: Direct innerHTML assignment from untrusted URL parameter
export function renderUserProfileVulnerable(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('name') || '';

  const target = document.getElementById('user-profile');
  if (target) {
    // UNSAFE: Allows arbitrary script execution in client browser via "?name=<img src=x onerror=alert(1)>"
    target.innerHTML = `<h2>Welcome, ${username}</h2>`;
  }
}

// ✅ SECURE: Using textContent or DOMPurify HTML sanitization
export function renderUserProfileSecure(): void {
  const urlParams = new URLSearchParams(window.location.search);
  const username = urlParams.get('name') || 'Guest';

  const profileContainer = document.getElementById('user-profile');
  if (!profileContainer) return;

  // SAFE PATTERN A: Text-only node creation (browser automatically escapes entities)
  const titleElement = document.createElement('h2');
  titleElement.textContent = `Welcome, ${username}`;
  profileContainer.replaceChildren(titleElement);

  // SAFE PATTERN B: If rich HTML rendering is strictly required, sanitize with DOMPurify
  const rawHtmlContent = `<div class="user-bio">${username}</div>`;
  const cleanHtml = DOMPurify.sanitize(rawHtmlContent, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p'],
    ALLOWED_ATTR: ['class'],
  });
  // profileContainer.innerHTML = cleanHtml;
}

// ============================================================================
// 2. Client Storage & JWT Security Leaks
// ============================================================================

// ❌ VULNERABLE: Storing authentication tokens in localStorage
export function loginVulnerable(jwtToken: string): void {
  // UNSAFE: Accessible to ANY script running on origin (XSS vulnerability = instant account takeover)
  localStorage.setItem('authToken', jwtToken);
}

// ✅ SECURE: In-Memory Token Reference or HttpOnly, Secure, SameSite Cookies
let inMemoryAccessToken: string | null = null;

export function setAccessTokenSecure(token: string | null): void {
  inMemoryAccessToken = token;
}

export async function makeAuthenticatedApiCallSecure(): Promise<UserProfileResponse | null> {
  // Browser automatically attaches HttpOnly cookie with credentials: 'include' or sends memory Bearer
  const response = await fetch('/api/user/profile', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(inMemoryAccessToken ? { Authorization: `Bearer ${inMemoryAccessToken}` } : {}),
      'X-Requested-With': 'XMLHttpRequest', // Anti-CSRF header defense
    },
    credentials: 'same-origin',
  });

  if (!response.ok) return null;
  return (await response.json()) as UserProfileResponse;
}

// ============================================================================
// 3. CSRF Protection in API Mutations
// ============================================================================

// ❌ VULNERABLE: State-changing POST without CSRF token
export function updateEmailVulnerable(newEmail: string): Promise<Response> {
  return fetch('/api/user/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: newEmail }),
  });
}

// ✅ SECURE: Attaching verified anti-CSRF token and custom headers
export function updateEmailSecure(newEmail: string): Promise<Response> {
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  return fetch('/api/user/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      'X-Requested-With': 'XMLHttpRequest',
    },
    credentials: 'same-origin',
    body: JSON.stringify({ email: newEmail }),
  });
}

// ============================================================================
// 4. Open Redirect Prevention in Client-Side Routing
// ============================================================================

// ❌ VULNERABLE: Direct window.location assignment from query param
export function handleRedirectVulnerable(): void {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirect'); // e.g. "?redirect=https://attacker.com"
  if (target) {
    window.location.href = target;
  }
}

// ✅ SECURE: Whitelist validation ensuring target is an internal relative path
export function handleRedirectSecure(defaultFallback: string = '/dashboard'): string {
  const params = new URLSearchParams(window.location.search);
  const target = params.get('redirect');

  if (!target) return defaultFallback;

  // Enforce relative path starting with single '/' and NOT '//' (protocol-relative) or containing backslashes
  if (target.startsWith('/') && !target.startsWith('//') && !target.includes('\\')) {
    return target;
  }

  return defaultFallback;
}
