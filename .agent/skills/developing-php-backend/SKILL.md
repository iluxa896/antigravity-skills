---
name: developing-php-backend
description: >-
  Assists with modern PHP backend development, architecture, frameworks, templating, databases,
  and ORMs. Enforces PHP 8.1–8.4+ clean architecture (thin controllers, DTOs, Actions/Services),
  prevents SQL injection and N+1 query bottlenecks, and validates syntax across Laravel 10/11,
  Symfony 6/7, and Phalcon 5. Use when writing, refactoring, or optimizing PHP code, configuring
  Eloquent/Doctrine/Phalcon models, or writing Blade/Twig/Volt templates.
---

# Developing PHP Backend

## When to use this skill
- Writing, refactoring, or optimizing PHP 8.1+ backend code.
- Designing clean layers: Thin Controllers, Form Requests, DTOs, Domain Services, Actions, Repositories.
- Querying database layers with Eloquent, Doctrine ORM, or Phalcon PHQL.
- Writing or securing templates: Blade, Twig, or Volt.
- Resolving N+1 bottlenecks, enforcing parameter binding, wrapping mutations in atomic transactions.
- Running syntax validation, static analysis (PHPStan/Psalm), or test suites (PHPUnit/Pest).

---

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Domain Architecture | Bounded contexts, Action vs Service, event-driven patterns, caching strategies. |
| **Medium** | DTO Contracts & Validation | Form Request rules, DTO property names, API Resource payload shaping. |
| **Low** | Security & Transactions | Strict parameter binding (zero raw SQL), atomic DB transactions, explicit PHP 8.1+ native types, PSR-12. |

---

## 2. Clean Architecture Layers

```
┌───────────────────────────────────────────────────────────┐
│ 1. Transport     : Thin Controllers / CLI Commands        │
│    → Input ingestion, Form Request / DTO mapping          │
├───────────────────────────────────────────────────────────┤
│ 2. Application   : Action Classes / Domain Services       │
│    → Orchestration, DB transactions, business validation  │
├───────────────────────────────────────────────────────────┤
│ 3. Domain        : Entities, Backed Enums, Value Objects  │
│    → Core invariants, strict native typings               │
├───────────────────────────────────────────────────────────┤
│ 4. Persistence   : Eloquent, Doctrine ORM, Phalcon PHQL   │
│    → Parameter binding, eager loading (with / JOIN FETCH) │
└───────────────────────────────────────────────────────────┘
```

---

## 3. Development Workflow

```
[ ] 1. Environment Verification
      – php -v and inspect composer.json (PHP 8.1–8.4+, framework version).
[ ] 2. Clean Architecture Scaffolding
      – Thin controllers: map inputs to DTOs / Form Requests, delegate to Actions.
      – Domain logic lives exclusively in single-responsibility Action / Service classes.
[ ] 3. Type Safety & PSR-12
      – Native PHP 8+ types on all properties, parameters, and returns.
      – No runtime declare(strict_types=1) unless project_rules.md mandates it.
[ ] 4. Security & Data Integrity
      – All SQL parameters bound. Multi-step writes wrapped in atomic transactions.
      – Eager load relations (Post::with('author'), JOIN FETCH) to eliminate N+1.
[ ] 5. Syntax & Regression Verification
      – php .agent/skills/developing-php-backend/scripts/php-lint.php <target-dir>
```

---

## 4. Modern PHP 8.1–8.4 Essentials

- **Readonly constructor promotion**: `public readonly string $title` on DTO constructors.
- **Backed Enums** with `match`: status → badge color, label, icon; eliminates `if/else` chains.
- **PHP 8.4 property hooks**: `public string $fullName { get => "$this->first $this->last"; }`.
- **PHP 8.4 asymmetric visibility**: `public private(set) int $version = 0;`.
- **First-class callable syntax**: `array_map($this->transform(...), $items)`.
- **Fibers**: cooperative multitasking for async workloads without runtime overhead.

---

## 5. Framework-Specific Patterns

### Laravel 10/11
- Thin controllers: `StorePostRequest` → `CreatePostAction` → `PostResource`.
- Wrap writes in `DB::transaction()`. Eager load with `Post::with('author')`.
- **Reference**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php)

### Symfony 6/7
- DTOs with `#[Assert\NotBlank]` attributes. Service layer for persistence.
- Doctrine `QueryBuilder` with `-&gt;setParameter()`. JOIN FETCH to prevent N+1.
- **Reference**: [symfony-controller-doctrine.php](./examples/symfony-controller-doctrine.php)

### Phalcon 5
- `$this-&gt;view-&gt;disable()` in REST controllers. `setJsonContent()` for responses.
- `Phalcon\Filter\Validation` for payloads. Bound params in PHQL: `'bind' =&gt; [...]`.
- **Reference**: [phalcon-controller-model.php](./examples/phalcon-controller-model.php)

---

## 6. Reference Files

- **Syntax Linter**: [php-lint.php](./scripts/php-lint.php) — recursive PHP syntax validator with `--help` and timing.
- **Clean Architecture Guide**: [php8-clean-architecture.md](./references/php8-clean-architecture.md) — ADR pattern, typed DTOs, Result monads.
- **Security & Performance Checklist**: [php-security-performance-checklist.md](./resources/php-security-performance-checklist.md) — SQLi, XSS, CSRF, Argon2id, OPcache, N+1 audit.
