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
- Designing application layers (Controllers, Form Requests, DTOs, Services, Actions, Repositories).
- Configuring and querying database layers with Eloquent, Doctrine ORM, or Phalcon MVC Models.
- Writing or securing template views using Blade, Twig, or Volt.
- Resolving N+1 query issues, implementing database transactions, or enforcing parameter binding.
- Running syntax validation (`scripts/php-lint.php`), static analysis (PHPStan/Psalm), or test suites (PHPUnit/Pest).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Architecture & Domain Boundaries | Domain boundary design, repository patterns vs active record, choosing between Action classes or Domain Services, event-driven messaging. |
| **Medium Freedom** | DTO Contracts & Validation Rules | Structuring Form Requests, DTO property naming, API Resource payload shaping, caching durations. |
| **Low Freedom** | Security, Type Safety & SQL Binding | Strict parameter binding (zero raw SQL concatenation), explicit native PHP 8 type declarations on all signatures, PSR-12 formatting, no runtime `declare(strict_types=1);` per `project_rules.md`. |

---

## 2. PHP Project Architecture & Environment Verification Framework

Before generating or modifying PHP backend code, verify the project environment and standards:

| Layer / Dimension | Target Standard / Tooling | Inspection Command / Rule |
| :--- | :--- | :--- |
| **PHP Runtime** | PHP 8.1 - 8.4+ | `php -v` & `composer.json` (`php` requirement) |
| **Framework** | Laravel 10/11, Symfony 6/7, Phalcon 5 | Inspect `composer.json` dependencies & framework versions |
| **Coding Standards** | PSR-12 & PSR-PER | Mandatory explicit native PHP 8+ type declarations for all properties, parameters, and return values |
| **Strict Types** | No runtime `declare(strict_types=1);` | Adhere strictly to `project_rules.md` |
| **Database & ORM** | Eloquent, Doctrine, Phalcon PHQL | Parameter binding enforced; zero raw string SQL concatenation |
| **Validation & Linting** | `php -l` & Static Analysis | Execute syntax check via `scripts/php-lint.php` before finishing |

---

## 3. Step-by-Step Development Workflow (Plan-Validate-Execute)

```markdown
- [ ] 1. Environment & Package Verification
  - Run php -v and inspect composer.json to identify installed packages, framework versions, and PHP extensions.
- [ ] 2. Architecture Design
  - Keep controllers thin. Delegate payload validation to Form Requests/DTOs and business logic to Action/Service classes.
- [ ] 3. Type Declarations & Clean Code
  - Enforce explicit PHP 8+ native type declarations on all functions, methods, and properties.
- [ ] 4. Security & Query Optimization
  - Bind all query parameters. Use eager loading (with(), JOIN FETCH) to eliminate N+1 query issues.
- [ ] 5. Syntax & Test Validation
  - Execute syntax validation with php scripts/php-lint.php <path>. Run PHPUnit or Pest test suites if available.
```

---

## 4. Modern PHP 8+ Language Standards (PHP 8.1 – 8.4+)

- **Constructor Property Promotion & Readonly Properties**:
  ```php
  public readonly class UserDto
  {
      public function __construct(
          public int $id,
          public string $email,
          public ?string $name = null,
      ) {}
  }
  ```
- **Enum Types (Backed Enums)**:
  ```php
  enum PostStatus: string
  {
      case DRAFT = 'draft';
      case PUBLISHED = 'published';
      case ARCHIVED = 'archived';
  }
  ```
- **Match Expressions & Nullsafe Operator**:
  ```php
  $badgeColor = match ($post->status) {
      PostStatus::PUBLISHED => 'green',
      PostStatus::DRAFT => 'yellow',
      PostStatus::ARCHIVED => 'gray',
  };

  $authorName = $post->author?->profile?->displayName ?? 'Guest';
  ```

---

## 5. Framework-Specific Guidelines

### A. Laravel (10 / 11)
- **Thin Controllers**: Delegate payload validation to Form Requests and business logic to dedicated Action classes.
- **API Serialization**: Use Eloquent API Resources (`JsonResource`) instead of returning raw arrays or model objects.
- **Database Safety**: Wrap multi-step mutations in `DB::transaction()`. Always eager load relations using `Post::with('author')`.
- **See Reference Implementation**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php)

### B. Symfony (6 / 7)
- **Thin Controllers & DTOs**: Map incoming requests to typed DTOs, validating them via PHP 8 Attributes (`#[Assert\NotBlank]`).
- **Dependency Injection**: Use constructor autowiring. Define service configurations in `config/services.yaml`.
- **Doctrine ORM**: Prefer Doctrine `QueryBuilder` with explicit parameter binding (`->setParameter('key', $val)`). Fetch joined entities (`JOIN FETCH`) in DQL to avoid N+1 queries.
- **See Reference Implementation**: [symfony-controller-doctrine.php](./examples/symfony-controller-doctrine.php)

### C. Phalcon (5)
- **REST API Endpoints**: Explicitly call `$this->view->disable()` and return `$this->response->setJsonContent(...)`.
- **Request Validation**: Use `Phalcon\Filter\Validation` to sanitize and validate request parameters.
- **Phalcon Models & PHQL**: Always bind parameters in static `find()` conditions or PHQL queries (`'bind' => ['published' => 'Y']`). Define reusable relationships in model `initialize()` methods.
- **See Reference Implementation**: [phalcon-controller-model.php](./examples/phalcon-controller-model.php)

---

## 6. Automated PHP Syntax Verification

Validate syntax recursively across your codebase before committing:

```powershell
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
