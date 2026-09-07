# OWASP Security Audit Checklist & Headers Reference

A comprehensive reference for auditing web applications, APIs, database query handlers, and web server configurations against standard security benchmarks.

---

## 1. OWASP Top 10 Web Application Vulnerability Matrix

| Vulnerability Category | Common Root Causes | Inspection & Detection Focus | Target Remediation |
| :--- | :--- | :--- | :--- |
| **A01: Broken Access Control** | Missing authorization checks, IDOR/BOLA, path traversal, CORS misconfigurations. | Unrestricted endpoints, entity ID manipulation in URLs (`/api/user/102`), CORS headers. | Role-Based Access Control (RBAC), owner scoping in database queries, denial by default. |
| **A02: Cryptographic Failures** | Hardcoded secrets, weak hashing (MD5/SHA1), HTTP in transit, missing TLS. | Grep for API keys/tokens in code, review password hashing (`password_hash` with Argon2id/BCrypt). | Enforce TLS 1.3, use secret management vaults, use strong password hashing algorithms. |
| **A03: Injection** | SQLi, NoSQLi, Command Injection, LDAP/XML injection, unsafe string concat. | Search for raw query formatting, system calls (`exec`, `system`), unescaped template values. | Prepared statements (PDO), parameterized queries, strict input validation schemas. |
| **A04: Insecure Design** | Lack of security controls in application logic, business logic flaws, credential stuffing. | Review state transitions, payment verification loops, password recovery workflows. | Threat modeling, rate limiting, anti-automation controls (CAPTCHA/hCaptcha). |
| **A05: Security Misconfiguration** | Default passwords, verbose error pages with stack traces, enabled directory listing. | Debug flags enabled (`DEBUG=true`), missing security headers, default admin credentials. | Turn off verbose errors in production, harden container images, remove default endpoints. |
| **A06: Vulnerable & Outdated Components** | Unpatched third-party NPM/Composer/PyPI dependencies. | Inspect `package.json`, `composer.json`, `requirements.txt` via `npm audit` / `composer audit`. | Automated dependency updates (Dependabot, Snyk), remove unused third-party packages. |
| **A07: Identification & Auth Failures** | Weak passwords, session hijacking, missing MFA, insecure JWT secret keys. | Review login handlers, session token entropy, cookie flags (`HttpOnly`, `Secure`, `SameSite`). | Enforce strong password policies, multi-factor authentication (MFA), secure session management. |
| **A08: Software & Data Integrity Failures** | Insecure deserialization, untrusted CI/CD pipelines, missing package signatures. | Unsafe object deserialization (`unserialize()`, `pickle.loads()`), unverified CDN scripts. | Avoid unsafe deserialization, use Subresource Integrity (SRI) hashes on external scripts. |
| **A09: Security Logging & Monitoring Failures** | Unlogged login attempts, missing audit trails for sensitive data modifications. | Check logging middleware for authentication failures, privilege escalations, or data deletes. | Centralized structured logging (JSON), log security events without logging credentials/tokens. |
| **A10: Server-Side Request Forgery (SSRF)** | Server fetching user-supplied URLs without IP range validation. | Search for `file_get_contents`, `curl`, `fetch`, or `axios` taking dynamic input URLs. | Validate schemes (HTTPS only), block loopback/private/metadata IP addresses (`169.254.169.254`). |

---

## 2. Mandatory Production HTTP Security Headers

Deploying these HTTP response headers defends against XSS, clickjacking, MIME-sniffing, and downgrade attacks.

### Recommended Header Values
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=()
Cross-Origin-Opener-Policy: same-origin
```

### Configuration Snippets

#### Nginx (`/etc/nginx/conf.d/security.conf`)
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), camera=(), microphone=()" always;
```

#### Apache (`.htaccess` / `httpd.conf`)
```apache
<IfModule mod_headers.c>
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';"
    Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    Header always set X-Frame-Options "DENY"
    Header always set X-Content-Type-Options "nosniff"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Permissions-Policy "geolocation=(), camera=(), microphone=()"
</IfModule>
```

#### Express.js (Node.js using Helmet)
```javascript
import helmet from 'helmet';
import express from 'express';

const app = express();

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            objectSrc: ["'none'"],
            upgradeInsecureRequests: [],
        },
    },
    frameguard: { action: 'deny' },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
```

#### PHP Header Dispatcher
```php
header("Content-Security-Policy: default-src 'self'; script-src 'self'; object-src 'none'; frame-ancestors 'none';");
header("Strict-Transport-Security: max-age=31536000; includeSubDomains; preload");
header("X-Frame-Options: DENY");
header("X-Content-Type-Options: nosniff");
header("Referrer-Policy: strict-origin-when-cross-origin");
header("Permissions-Policy: geolocation=(), camera=(), microphone=()");
```

---

## 3. Defense-in-Depth Production Hardening Checklist

- [ ] **Secret Management**: Zero plain-text API keys, passwords, or tokens in git repositories or build artifacts. Use environment variables (`.env` omitted from git) or Secret Managers (AWS Secrets Manager, Vault, GCP Secret Manager).
- [ ] **Cookie Hardening**: All authentication & session cookies must have `HttpOnly; Secure; SameSite=Lax` or `SameSite=Strict`.
- [ ] **Input Validation & Encoding**: Parse all incoming request data (query parameters, JSON payloads, form data) through strict validation schemas (Zod, Valibot, Symfony Validator, Laravel Form Request). Encode outputs based on context (HTML, JS, URL, Attribute).
- [ ] **Rate Limiting & Throttling**: Enforce IP and User-based rate limits on sensitive endpoints (`/api/login`, `/api/register`, `/api/password-reset`, `/api/checkout`) to block brute-force and credential-stuffing attacks.
- [ ] **Error Handling**: Sanitize error responses. Never leak database stack traces, file system paths, or internal dependency versions in production HTTP responses. Log complete errors internally.
