/**
 * Web Security Master Example: Vulnerable vs Secure Frontend Patterns
 * 
 * Demonstrates common client-side vulnerabilities (DOM XSS, Storage Leaks,
 * CSRF, CORS misconfigurations) alongside secure remediation patterns.
 */

// ============================================================================
// 1. DOM-Based XSS (Cross-Site Scripting)
// ============================================================================

// ❌ VULNERABLE: Direct innerHTML assignment from untrusted URL parameter
function renderUserProfileVulnerable() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('name'); // e.g. "?name=<img src=x onerror=alert(document.cookie)>"
    
    // UNSAFE: Allows arbitrary script execution in client browser
    document.getElementById('user-profile').innerHTML = `<h2>Welcome, ${username}</h2>`;
}

// ✅ SECURE: Using textContent or DOMPurify HTML sanitization
import DOMPurify from 'dompurify';

function renderUserProfileSecure() {
    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('name') || 'Guest';

    // SAFE OPTION A: Text-only assignment (automatically escapes HTML)
    const titleElement = document.createElement('h2');
    titleElement.textContent = `Welcome, ${username}`;
    
    const profileContainer = document.getElementById('user-profile');
    profileContainer.replaceChildren(titleElement);

    // SAFE OPTION B: Sanitized HTML if rich text rendering is mandatory
    const rawHtmlContent = `<div class="user-bio">${username}</div>`;
    const cleanHtml = DOMPurify.sanitize(rawHtmlContent, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong'] });
    // profileContainer.innerHTML = cleanHtml;
}


// ============================================================================
// 2. React / Vue Dangerous HTML Rendering
// ============================================================================

// ❌ VULNERABLE (React): Unsanitized dangerouslySetInnerHTML
function UserCommentVulnerable({ commentText }) {
    return (
        <div className="comment-box">
            {/* UNSAFE: Renders raw unescaped user-generated HTML */}
            <div dangerouslySetInnerHTML={{ __html: commentText }} />
        </div>
    );
}

// ✅ SECURE (React): Standard JSX rendering or sanitized HTML
function UserCommentSecure({ commentText }) {
    // SAFE OPTION A: React automatically escapes strings inside JSX tags
    return (
        <div className="comment-box">
            <p>{commentText}</p>
        </div>
    );

    // SAFE OPTION B: DOMPurify if HTML formatting is strictly required
    // const cleanComment = DOMPurify.sanitize(commentText);
    // return <div dangerouslySetInnerHTML={{ __html: cleanComment }} />;
}


// ============================================================================
// 3. Client Storage & JWT Security Leaks
// ============================================================================

// ❌ VULNERABLE: Storing authentication tokens in localStorage
function loginVulnerable(jwtToken) {
    // UNSAFE: Accessible to ANY script running on the origin (XSS vulnerability = total account takeover)
    localStorage.setItem('authToken', jwtToken);
}

// ✅ SECURE: HttpOnly SameSite Cookies (Handled Server-Side)
/**
 * Server sets cookie in HTTP response headers:
 * Set-Cookie: authToken=xyz123; Secure; HttpOnly; SameSite=Strict; Path=/;
 * 
 * JavaScript cannot read or extract HttpOnly cookies, rendering them immune to XSS token theft!
 */
function makeAuthenticatedApiCallSecure() {
    // Browser automatically attaches HttpOnly cookie with credentials: 'include'
    return fetch('/api/user/profile', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin' // Ensures cookies are sent automatically
    });
}


// ============================================================================
// 4. CSRF Protection in API Calls
// ============================================================================

// ❌ VULNERABLE: State-changing POST without CSRF token
function updateEmailVulnerable(newEmail) {
    return fetch('/api/user/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail })
    });
}

// ✅ SECURE: Attaching anti-CSRF token from meta tag or cookie
function updateEmailSecure(newEmail) {
    // Retrieve CSRF token injected by backend server framework
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    return fetch('/api/user/email', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken || ''
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email: newEmail })
    });
}
