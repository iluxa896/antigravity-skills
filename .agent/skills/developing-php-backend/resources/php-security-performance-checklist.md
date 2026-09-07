# PHP Security Hardening & Performance Optimization Checklist

This reference document provides production-grade security guidelines, performance tuning steps, and code review checklists for PHP 8+ backend development across Laravel, Symfony, and Phalcon frameworks.

---

## 1. Security Hardening Guidelines

### A. SQL Injection Prevention
- **Rule**: Never concatenate unvalidated user inputs directly into raw SQL strings, DQL queries, or PHQL statements.
- **PDO Prepared Statements**:
  ```php
  // GOOD: Using bound parameters
  $stmt = $pdo->prepare('SELECT id, email, status FROM users WHERE status = :status AND role = :role');
  $stmt->execute(['status' => $status, 'role' => $role]);
  $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
  ```
- **ORM Safe Practices**:
  - **Laravel Eloquent**: Use `where('status', $status)` or `whereRaw('status = ?', [$status])`. Avoid passing raw unquoted strings into `orderByRaw` or `whereRaw`.
  - **Doctrine ORM**: Use `$qb->where('u.status = :status')->setParameter('status', $status)`.
  - **Phalcon PHQL**: Pass `$this->modelsManager->createQuery("SELECT * FROM App\Models\Users WHERE status = :status:")->execute(['status' => $status])`.

### B. Cross-Site Scripting (XSS) Prevention
- **Rule**: Escape all user-controlled data before rendering into HTML/DOM templates.
- **Templating Escaping Rules**:
  - **Blade**: Standard tags `{{ $var }}` run `e()` (htmlspecialchars). Use `{!! $var !!}` ONLY for pre-sanitized HTML.
  - **Twig**: Twig auto-escapes `{{ var }}`. Use `|raw` filter strictly with HTML Purifier output.
  - **Volt**: Auto-escapes `{{ var }}` by default.
  - **Raw PHP Output**:
    ```php
    echo htmlspecialchars($userInput, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    ```

### C. CSRF Protection & Cookie Security
- **SameSite Cookies**: Set `SameSite=Lax` or `SameSite=Strict` on session and authentication cookies.
- **Cookie Security Flags**: Enforce `HttpOnly; Secure; SameSite=Lax`.
- **Framework Middleware**:
  - Laravel: Enable `VerifyCsrfToken` middleware on web routes.
  - Symfony: Use `csrf_protection: true` in framework settings and check `isCsrfTokenValid()`.
  - Phalcon: Use `$this->security->getToken()` and `$this->security->checkToken()` on form submissions.

### D. Secure Authentication & Password Hashing
- **Algorithm**: Always use modern password hashing algorithms (`Argon2id` or `Bcrypt` with high cost).
  ```php
  // Creating password hash using Argon2id (PHP 7.3+)
  $hash = password_hash($plainPassword, PASSWORD_ARGON2ID, [
      'memory_cost' => 65536, // 64 MB
      'time_cost'   => 4,
      'threads'     => 1,
  ]);

  // Verifying password
  if (password_verify($plainPassword, $hash)) {
      // Rehash if algorithm/cost parameters updated
      if (password_needs_rehash($hash, PASSWORD_ARGON2ID)) {
          $newHash = password_hash($plainPassword, PASSWORD_ARGON2ID);
          // Store $newHash in DB
      }
  }
  ```

### E. Secure File Uploads
- Validate file MIME types using PHP `finfo` extension (`finfo_file`), never relying on `$_FILES['file']['type']` or file extensions alone.
- Re-encode or sanitize uploaded image files using GD or Imagick.
- Store uploaded files outside the public web root (`public/` or `public_html/`) or serve via private storage buckets (S3/MinIO).
- Randomize uploaded file names (`bin2hex(random_bytes(16)) . '.' . $ext`) to prevent path traversal attacks.

---

## 2. Performance Optimization Guidelines

### A. OPcache & Preloading Production Setup
- Enforce optimal `php.ini` configuration for production environments:
  ```ini
  opcache.enable=1
  opcache.enable_cli=1
  opcache.memory_consumption=256
  opcache.interned_strings_buffer=16
  opcache.max_accelerated_files=20000
  opcache.validate_timestamps=0 ; Production only (requires FPM restart on deploy)
  opcache.save_comments=1
  opcache.preload=/var/www/html/config/preload.php ; PHP 7.4+ preloading
  opcache.preload_user=www-data
  ```

### B. Composer Autoloader Optimization
- Run optimized autoloader commands during deployment builds:
  ```bash
  composer install --no-dev --optimize-autoloader --classmap-authoritative
  ```

### C. N+1 Database Query Auditing
- **Problem**: Querying relationships inside a loop creates 1 initial query + N sub-queries.
- **Audit Tooling**: Use Laravel Telescope, Barryvdh Debugbar, Symfony Profiler, or query logging wrappers.
- **Resolution**:
  - **Laravel**: Eager load with `Post::with(['author', 'tags'])->get()`.
  - **Symfony / Doctrine**: Use JOIN FETCH in DQL: `SELECT p, a FROM App\Entity\Post p JOIN p.author a`.
  - **Phalcon**: Enable model relationship reusable caching `'reusable' => true`.

### D. Caching Strategies (Redis / Memcached)
- Use Cache-Aside pattern for expensive DB computations or external API responses:
  ```php
  $cacheKey = 'user_stats_' . $userId;
  $stats = $cacheManager->get($cacheKey, function () use ($userId, $db) {
      return $db->computeUserStats($userId);
  }, 3600); // 1 hour TTL
  ```

---

## 3. Code Review & Quality Checklist

Copy and use this checklist during PHP PR code reviews:

- [ ] **Type Declarations**: All class properties, method parameters, and return types specify explicit native PHP 8+ types.
- [ ] **No strict_types**: Code does not enforce runtime `declare(strict_types=1);` per `project_rules.md`.
- [ ] **Thin Controller**: Controllers only validate payloads, invoke services/actions, and return formatted responses.
- [ ] **SQL Injection**: All dynamic queries use parameter binding or standard ORM builders.
- [ ] **XSS Escaping**: User data in Blade/Twig/Volt templates is properly escaped.
- [ ] **N+1 Queries**: Relational queries in list endpoints use eager loading.
- [ ] **Exception Handling**: Domain exceptions are caught and sanitized before outputting to API responses.
- [ ] **Syntax Verification**: Passed `php -l` linting without errors.
