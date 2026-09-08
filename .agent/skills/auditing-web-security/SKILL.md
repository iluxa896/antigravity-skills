---
name: auditing-web-security
description: >-
  Audits web applications, APIs, database queries, and server configurations for security
  vulnerabilities across frontend and backend architectures. Identifies injection vectors
  (SQLi, RCE, SSRF, XSS), broken authorization (IDOR/BOLA), CSRF, insecure JWTs, and missing
  security headers. Use when assessing web application security, auditing codebases, analyzing
  HTTP headers/CORS, reviewing authentication flows, or hardening servers against exploits.
---

# Auditing Web Security

## When to use this skill
- Reviewing source code (PHP, Node.js, Python, TypeScript) for security vulnerabilities.
- Auditing DB queries (SQL, NoSQL, ORM) for injection risks.
- Checking frontends (Vue, React, DOM) for XSS, storage leaks, and CSRF.
- Assessing REST/GraphQL APIs for auth, IDOR/BOLA, and rate-limiting gaps.
- Inspecting server configs (Nginx, Caddy), CSP, CORS headers, and cookie attributes.

---

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Threat Modeling | Trust boundaries, third-party integration risks, auth paradigms (OAuth2/OIDC vs JWT). |
| **Medium** | Validation & Sanitization | Zod/Form Request schemas, error formats, rate-limit bucket sizes. |
| **Low** | Crypto, Query Binding, Headers | Zero SQL string concatenation, `HttpOnly; Secure; SameSite=Strict` cookies, Argon2id/bcrypt. |

---

## 2. Audit Workflow

```
[ ] Phase 1: Attack Surface Discovery
    – Map all public endpoints, auth flows, file uploads, webhooks.
    – Identify all external data inputs: query params, POST bodies, headers, cookies.
[ ] Phase 2: Frontend Audit
    – Search: innerHTML, dangerouslySetInnerHTML, v-html, eval(), document.write().
    – Check localStorage/sessionStorage for sensitive data or JWTs.
    – Verify CORS headers and Content-Security-Policy (no unsafe-inline, unsafe-eval).
[ ] Phase 3: Backend & API Audit
    – Parameterized queries on every DB call (SQLi / NoSQLi).
    – Input validation and strict type safety at all API boundaries.
    – Command injection: exec/system/shell_exec/child_process.exec with user input.
    – SSRF: HTTP client calls constructed from user-supplied URLs.
    – IDOR/BOLA: ownership scoping on every read/update/delete entity access.
    – JWT: algorithm pinning, signature verification, expiry, revocation strategy.
[ ] Phase 4: Server Hardening
    – Run scanner: node .agent/skills/auditing-web-security/scripts/security-audit-scanner.mjs --path src/
    – Enforce: HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Permissions-Policy.
```

---

## 3. Key Vulnerability Patterns

### SQL Injection
- **Detect**: raw string queries, `ORDER BY` with user input, dynamic MongoDB `$where`.
- **Fix**: parameterized queries (PDO, Prisma, Kysely). Whitelist column/sort names strictly.

### XSS (Reflected / Stored / DOM)
- **Detect**: `innerHTML`, `v-html`, `dangerouslySetInnerHTML`, `eval()`, `jQuery.html()`.
- **Fix**: `textContent`/`innerText` for plain text. `DOMPurify.sanitize()` before any HTML render. Strict CSP.

### SSRF
- **Detect**: `fetch(req.body.url)`, `curl_exec($ch)` with user-supplied host.
- **Fix**: Whitelist schemes (`https://`) + hostnames. Reject loopback (`127.0.0.0/8`), RFC-1918, cloud metadata (`169.254.169.254`). Disable redirect following.

### IDOR / BOLA
- **Detect**: controller actions using entity IDs without ownership check.
- **Fix**: Scope every query to current user (`WHERE user_id = :uid`). Use UUIDs. Enforce ACL policies.

### RCE / Command Injection
- **Detect**: `exec()`, `passthru()`, `shell_exec()`, `child_process.exec()` with user input.
- **Fix**: Prefer native libraries. If shell is required, use `execFile()` with argument arrays or `escapeshellarg()`.

---

## 4. Reference Files

- **Scanner Script**: [security-audit-scanner.mjs](./scripts/security-audit-scanner.mjs) — static scan for SQLi, XSS, RCE, SSRF, storage leaks.
- **Nginx Hardened Config**: [nginx-security-hardened.conf](./examples/nginx-security-hardened.conf) — CSP, HSTS, rate limiting, TLS 1.3.
- **Frontend Patterns**: [vulnerable-vs-secure-frontend.ts](./examples/vulnerable-vs-secure-frontend.ts) — unsafe vs secure DOM, storage, CSRF.
- **Backend Patterns**: [vulnerable-vs-secure-backend.php](./examples/vulnerable-vs-secure-backend.php) — raw queries vs parameterized, RCE vs native, SSRF remediation.
- **OWASP Deep Dive**: [owasp-top10-deep-dive.md](./references/owasp-top10-deep-dive.md) — DNS rebinding, BOLA mitigation, blind SQLi.
- **Audit Checklist**: [owasp-audit-checklist.md](./resources/owasp-audit-checklist.md) — actionable audit matrix and security headers.
