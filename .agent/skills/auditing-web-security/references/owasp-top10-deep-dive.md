# OWASP Top 10 Deep Dive: Attack Mechanics & Defense Recipes

This reference provides technical explanations, exploit mechanics, and concrete remediation recipes for the most critical web application vulnerabilities.

---

## 1. Broken Object-Level Authorization (BOLA / IDOR)

### Exploit Mechanics
A client requests an entity via an exposed numerical identifier or UUID:
```http
GET /api/v1/invoices/10842 HTTP/1.1
Host: api.example.com
Authorization: Bearer <User_A_Token>
```
If the backend queries `SELECT * FROM invoices WHERE id = 10842` without checking whether `invoices.user_id == current_user.id`, User A can read User B's financial records by incrementing IDs.

### Defense Recipe
1. **Always Scope Queries to the Authenticated Tenant/Owner**:
   ```php
   // Eloquent (Laravel)
   $invoice = Auth::user()->invoices()->findOrFail($invoiceId);
   ```
2. **Explicit Policy Enforcement**:
   ```php
   $this->authorize('view', $invoice);
   ```

---

## 2. Server-Side Request Forgery (SSRF) & DNS Rebinding

### Exploit Mechanics
The server accepts a webhook or image URL from user input and fetches it using `cURL` or `fetch()`. An attacker provides:
- Cloud metadata service: `http://169.254.169.254/latest/meta-data/iam/security-credentials/`
- Internal loopback services: `http://127.0.0.1:6379/` (Redis) or `http://localhost:9200/` (Elasticsearch)

### Defense Recipe
1. **Never Fetch User-Supplied URLs Directly**: Validate both protocol (`https://` only) and destination IP address.
2. **Resolve and Check Private CIDRs**:
   - Disallow loopback: `127.0.0.0/8`, `::1`
   - Disallow RFC 1918: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`
   - Disallow Link-Local / Cloud Metadata: `169.254.0.0/16`
3. **Disable HTTP Redirect Following** (`CURLOPT_FOLLOWLOCATION = false`) to prevent redirecting to an internal IP after initial domain validation.

---

## 3. SQL Injection (SQLi) & Blind Injection

### Exploit Mechanics
Concatenating user parameters into dynamic SQL queries allows attackers to break syntax and execute arbitrary queries:
```sql
SELECT * FROM users WHERE email = 'admin@example.com' OR '1'='1' --'
```
Even when error messages are suppressed (Blind SQLi), attackers extract data bit-by-bit using conditional time delays (`pg_sleep(5)`, `BENCHMARK()`).

### Defense Recipe
- **Enforce Parameterized Queries Exclusively**:
  ```php
  $stmt = $pdo->prepare('SELECT id, password_hash FROM users WHERE email = :email');
  $stmt->execute(['email' => $userInput]);
  ```
- **Whitelist Dynamic Identifiers**: Column names and sort directions (`ASC`/`DESC`) cannot be bound as parameters; validate them against an explicit PHP array whitelist.

---

## 4. Cross-Site Scripting (XSS) & DOM-Based Attacks

### Defense Recipe
1. **Context-Aware Encoding**:
   - HTML body: Escape `&`, `<`, `>`, `"`, `'`.
   - JavaScript context: Never interpolate variables directly into `<script>` tags. Use `JSON.parse(document.getElementById('data').textContent)` with base64/escaped JSON.
2. **Sanitize Dynamic HTML**:
   - If rendering rich text, always pass through `DOMPurify.sanitize(dirtyHtml)`.
3. **Strict Content Security Policy (CSP)**:
   - Deploy `default-src 'self'; script-src 'self' 'nonce-...'; object-src 'none';`.
