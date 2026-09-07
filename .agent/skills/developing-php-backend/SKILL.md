---
name: developing-php-backend
description: >-
  Assists with modern PHP backend development, architecture, frameworks, templating, databases, and ORMs.
  Evaluates PHP versions (8.1-8.4+), enforces clean architecture (thin controllers, DTOs, Actions/Services),
  prevents SQL injection and N+1 query bottlenecks, and validates syntax/tests across Laravel, Symfony, and Phalcon 5.
  Use when writing, refactoring, or optimizing PHP code, configuring Eloquent/Doctrine/Phalcon models,
  or writing Blade/Twig/Volt templates.
---

# Developing PHP Backend (Master Skill)

## When to use this skill
- Writing, refactoring, or optimizing PHP 8.1+ backend code.
- Designing clean application layers (Thin Controllers, Form Requests, DTOs, Domain Services, Actions, Repositories).
- Configuring and querying database layers with Eloquent, Doctrine ORM, or Phalcon MVC Models.
- Writing or securing template views using Blade, Twig, or Volt.
- Resolving N+1 query bottlenecks, enforcing parameter binding, or wrapping mutations in atomic transactions.
- Running syntax validation (`scripts/php-lint.php`), static analysis (PHPStan/Psalm), or test suites (PHPUnit/Pest).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Domain Architecture & Strategy | Bounded context modeling, Action vs Domain Service selection, event-driven architecture, caching strategies. |
| **Medium Freedom** | DTO Contracts & Validation Rules | Form Request validation rules, DTO property names, API Resource payload shaping, repository query helpers. |
| **Low Freedom** | Security, Type Safety & Transactions | Strict parameter binding (zero raw SQL concatenation), atomic DB transactions with rollback, explicit native PHP 8.1+ types, PSR-12, no runtime `declare(strict_types=1);`. |

---

## 2. Clean Architecture & Layered Boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. Transport Layer   : Thin Controllers / CLI Commands      │
│    -> Input ingestion, Form Request / DTO mapping           │
├─────────────────────────────────────────────────────────────┤
│ 2. Application Layer : Action Classes / Domain Services     │
│    -> Orchestration, DB transactions, Business validation   │
├─────────────────────────────────────────────────────────────┤
│ 3. Domain Layer      : Entities, Backed Enums, Value Objects│
│    -> Core business invariants, strict native typings       │
├─────────────────────────────────────────────────────────────┤
│ 4. Persistence Layer : Eloquent, Doctrine ORM, Phalcon PHQL │
│    -> Parameter binding, Eager loading (with / JOIN FETCH)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Step-by-Step Development Workflow (Plan-Validate-Execute)

```markdown
- [ ] 1. Environment & Framework Verification
      - Run php -v and inspect composer.json (PHP 8.1–8.4+, Laravel 10/11, Symfony 6/7, Phalcon 5).
- [ ] 2. Clean Architecture Scaffolding
      - Keep controllers ultra-thin; map inputs to typed DTOs or Form Requests.
      - Encapsulate domain logic inside single-responsibility Action classes or Domain Services.
- [ ] 3. Strict Type Declarations & PSR-12
      - Enforce native PHP 8+ types for all properties, parameters, and returns (no runtime declare(strict_types=1);).
- [ ] 4. Security & Data Integrity
      - Bind all SQL query parameters. Wrap multi-step writes in atomic transactions with automatic rollback.
      - Eager load relations (Post::with('author'), JOIN FETCH) to eliminate N+1 bottlenecks.
- [ ] 5. Syntax & Regression Verification
      - Run: php .agent/skills/developing-php-backend/scripts/php-lint.php <target-dir>
```

---

## 4. Modern PHP 8+ Language Standards (PHP 8.1 – 8.4+)

- **Readonly DTOs with Constructor Promotion**:
  ```php
  public readonly class CreatePostDto
  {
      public function __construct(
          public string $title,
          public string $content,
          public int $authorId,
          public ?string $category = null,
      ) {}
  }
  ```
- **Backed Enums with Match Expressions**:
  ```php
  enum PostStatus: string
  {
      case DRAFT = 'draft';
      case PUBLISHED = 'published';
      case ARCHIVED = 'archived';

      public function badgeColor(): string
      {
          return match ($this) {
              self::PUBLISHED => 'green',
              self::DRAFT => 'yellow',
              self::ARCHIVED => 'gray',
          };
      }
  }
  ```

---

## 5. Framework-Specific Clean Implementations

### A. Laravel (10 / 11)
- **Thin Controllers**: Ingest typed `StorePostRequest`, delegate to `CreatePostAction`, return `PostResource`.
- **Transactions & Eager Loading**: Wrap writes in `DB::transaction()`. Load relations via `Post::with('author')`.
- **See Reference Implementation**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php)

### B. Symfony (6 / 7)
- **DTOs & Attribute Validation**: Map payloads to DTOs with PHP 8 attributes (`#[Assert\NotBlank]`).
- **Doctrine ORM**: Use `QueryBuilder` with explicit parameter binding (`->setParameter('key', $val)`). Fetch joined entities (`JOIN FETCH`) to avoid N+1 queries.
- **See Reference Implementation**: [symfony-controller-doctrine.php](./examples/symfony-controller-doctrine.php)

### C. Phalcon (5)
- **REST API Endpoints**: Call `$this->view->disable()` and return `$this->response->setJsonContent(...)`.
- **Request Validation & Bound PHQL**: Use `Phalcon\Filter\Validation` and bind parameters in queries (`'bind' => [...]`).
- **See Reference Implementation**: [phalcon-controller-model.php](./examples/phalcon-controller-model.php)

---

## 6. Automated PHP Syntax Verification

Validate syntax recursively across your codebase before committing:

```bash
php .agent/skills/developing-php-backend/scripts/php-lint.php .agent/skills/developing-php-backend/
```

---

## 7. Supporting Resources & Examples

- **PHP Syntax Linter Script**: [php-lint.php](./scripts/php-lint.php) - Automated recursive PHP syntax validator with `--help` and execution timing.
- **Clean Architecture Guide**: [php8-clean-architecture.md](./references/php8-clean-architecture.md) - Architectural guide on Action-Domain-Responder (ADR), typed DTOs, and Result monads.
- **Laravel Reference**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php) - Laravel 10/11 controller with Form Requests, Actions, API Resources, and transactions.
- **Symfony Reference**: [symfony-controller-doctrine.php](./examples/symfony-controller-doctrine.php) - Symfony 6/7 controller with DTOs, Attribute validation, Service layer, and Doctrine QueryBuilder.
- **Phalcon Reference**: [phalcon-controller-model.php](./examples/phalcon-controller-model.php) - Phalcon 5 REST API controller with filter validation and bound PHQL queries.
- **Security & Performance Checklist**: [php-security-performance-checklist.md](./resources/php-security-performance-checklist.md) - Security hardening (SQLi, XSS, CSRF, Argon2id), OPcache tuning, and N+1 query audit.
