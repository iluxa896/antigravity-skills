---
name: auditing-web-security
description: >-
  Audits web applications, APIs, database queries, and server configurations for security vulnerabilities
  across frontend and backend architectures. Identifies injection attack vectors (SQLi, RCE, SSRF, XSS),
  broken authorization (IDOR/BOLA), CSRF, insecure JWTs, and missing security headers. Use when assessing
  web application security, auditing codebases, analyzing HTTP headers/CORS, or hardening servers against exploits.
---

# Auditing Web Security (Master Security Skill)

## When to use this skill
- Reviewing source code (PHP, Node.js, Python, JavaScript, TypeScript) for security vulnerabilities.
- Auditing database queries (SQL, NoSQL, ORM calls) for parameter binding and injection risks.
- Checking frontend applications (Vue, React, Vanilla DOM) for DOM XSS, storage leaks, and CSRF.
- Assessing REST, GraphQL, or gRPC APIs for authentication, authorization (IDOR/BOLA), and rate limiting weaknesses.
- Inspecting server configurations (Nginx, Apache, Caddy), CSP policies, CORS headers, and cookie attributes.
- Running the static security scanner tool (`scripts/security-audit-scanner.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Threat Modeling & Architecture | Designing trust boundaries, evaluating third-party integration risks, choosing auth paradigms (OAuth2/OIDC vs Session vs JWT). |
| **Medium Freedom** | Validation Schemas & Sanitization | Implementing input validation schemas (Zod, Form Requests), error reporting formats, and rate-limiting bucket sizes. |
| **Low Freedom** | Cryptography, Query Binding & Headers | Strict parameter binding (zero string concatenation in SQL), CSP directive syntax, `HttpOnly; Secure; SameSite=Strict` cookie flags, Argon2id/bcrypt hashing parameters. |

---

## 2. Plan-Validate-Execute Security Audit Workflow

```markdown
- [ ] Phase 1: Attack Surface Discovery
  - [ ] Map all public endpoints, API routes, authentication workflows, and file uploads.
  - [ ] Identify external data inputs (query params, POST bodies, headers, cookies, webhooks).
- [ ] Phase 2: Frontend & Client-Side Audit
  - [ ] Audit DOM manipulation for XSS (innerHTML, dangerouslySetInnerHTML, eval).
  - [ ] Inspect client-side storage (localStorage, sessionStorage) for sensitive data/JWTs.
  - [ ] Check CORS headers and Content Security Policy (CSP).
- [ ] Phase 3: Backend & API Logic Audit
  - [ ] Verify parameterized SQL/ORM queries (SQLi / NoSQLi checks).
  - [ ] Validate input sanitization, type safety, and strict validation schemas.
  - [ ] Check for Command Injection (exec, system, shell processes) and SSRF (cURL / HTTP client calls).
  - [ ] Evaluate Broken Object Level Authorization (IDOR/BOLA) on database entity access.
  - [ ] Audit Session & JWT validation (algorithm pinning, signature verification, expiry, revocation).
- [ ] Phase 4: Server Hardening & Automated Scanning
  - [ ] Run security scanner: node .agent/skills/auditing-web-security/scripts/security-audit-scanner.mjs
  - [ ] Enforce Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options).
```

---

## 3. Core Vulnerability Detection & Remediation Rules

### A. SQL & Query Injection (SQLi / NoSQLi)
- **Vulnerability**: String concatenation in queries (`SELECT * FROM users WHERE id = '` + req.query.id + `'`).
- **Detection**: Look for raw string queries, unescaped variable interpolation, or dynamic MongoDB filters (`{ $where: req.body.filter }`).
- **Remediation**:
  - Always use prepared statements with explicit parameter binding (PDO in PHP, `db.Query` in Go, parameterized Prisma/Kysely calls).
  - Never allow raw user input to dictate column names, table names, or sort directions (`ORDER BY`). Use strict field whitelisting.

### B. Cross-Site Scripting (XSS) & Client-Side Flaws
- **Vulnerability**: Unsanitized user inputs rendered in HTML context.
  - **Reflected XSS**: Server returns input directly in HTTP response.
  - **Stored XSS**: Database records rendered without encoding.
  - **DOM-based XSS**: Client JS reads `location.hash` / `urlParams` and writes to `element.innerHTML`.
- **Detection**: Search for `dangerouslySetInnerHTML`, `v-html`, `document.write()`, `jQuery.html()`, `element.innerHTML`, `eval()`.
- **Remediation**:
  - Use text-only DOM setters (`textContent`, `innerText`).
  - Pass dynamic HTML through `DOMPurify.sanitize()` before rendering.
  - Deploy strict Content-Security-Policy (CSP) headers (disallow `'unsafe-inline'` and `'unsafe-eval'`).

### C. Server-Side Request Forgery (SSRF)
- **Vulnerability**: Server fetches a URL provided by user input without validating target network host/IP.
- **Detection**: Search for HTTP requests constructed from user parameters (e.g., `fetch(req.body.imageUrl)`, `curl_exec($ch)`).
- **Remediation**:
  - Whitelist permitted domain schemes (`https://`) and hostnames.
  - Resolve DNS IPs and reject requests targeting loopback (`127.0.0.0/8`), private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), or cloud metadata (`169.254.169.254`).
  - Disable automatic HTTP redirect handling in cURL/fetch.

### D. Broken Object Level Authorization (IDOR / BOLA)
- **Vulnerability**: User can access resource `/api/orders/104` by changing the ID without ownership verification.
- **Detection**: Inspect controller actions receiving entity IDs. Verify if authorization scoping (`WHERE user_id = :current_user_id` or ACL policy check) is enforced on **every** read/update/delete query.
- **Remediation**:
  - Enforce tenant and owner isolation in queries (`Order::where('id', $id)->where('user_id', $currentUser->id)`).
  - Use unpredictable UUIDs (v4) alongside explicit access control policies.

### E. Remote Code Execution (RCE) & Command Injection
- **Vulnerability**: Passing user input directly into system process calls or dynamic code execution (`exec()`, `system()`, `passthru()`, `child_process.exec()`, `eval()`).
- **Remediation**:
  - Avoid OS shell execution whenever possible; use native code libraries.
  - If process execution is mandatory, pass arguments as discrete arrays without shell context (`execFile('convert', [inputPath, outputPath])`), or wrap with `escapeshellarg()`.

---

## 4. Automated Security Scanner

Run the built-in static analysis scanner across the repository:

```bash
node .agent/skills/auditing-web-security/scripts/security-audit-scanner.mjs --path src/
```

---

## 5. Supporting Resources & Examples

- **Security Scanner Tool**: [security-audit-scanner.mjs](./scripts/security-audit-scanner.mjs) - Node.js CLI script scanning codebases for SQLi, XSS, RCE, SSRF, and storage leaks.
- **Hardened Nginx Server Config**: [nginx-security-hardened.conf](./examples/nginx-security-hardened.conf) - Production Nginx configuration with complete CSP, HSTS, rate limiting, and TLS 1.3.
- **Frontend Vulnerability Matrix**: [vulnerable-vs-secure-frontend.js](./examples/vulnerable-vs-secure-frontend.js) - Comparison of unsafe vs secure JS/DOM patterns.
- **Backend Vulnerability Matrix**: [vulnerable-vs-secure-backend.php](./examples/vulnerable-vs-secure-backend.php) - Comparison of raw queries, command execution, and SSRF vs secure PHP code.
- **OWASP Top 10 Deep Dive Guide**: [owasp-top10-deep-dive.md](./references/owasp-top10-deep-dive.md) - Deep architectural guide on SSRF DNS rebinding, BOLA mitigation, and blind SQLi.
- **Audit Checklist & Headers**: [owasp-audit-checklist.md](./resources/owasp-audit-checklist.md) - Actionable audit matrix and security header definitions.
