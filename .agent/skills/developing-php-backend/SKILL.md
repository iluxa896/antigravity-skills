---
name: developing-php-backend
description: >-
  Assists with modern PHP backend development, clean architecture, frameworks, databases,
  and ORMs. Enforces PHP 8.2–8.4+ clean architecture (thin controllers, DTOs, Actions/Services),
  prevents SQL injection and N+1 query bottlenecks, and validates syntax across Laravel 10/11
  and Symfony 6/7. Use when writing, refactoring, or optimizing PHP code, configuring
  Eloquent/Doctrine models, or writing Blade/Twig templates.
---

# Developing PHP Backend

## When to use this skill
- Writing, refactoring, or optimizing modern PHP 8.2–8.4+ backend code.
- Designing clean layers: Thin Controllers, Form Requests, DTOs, Domain Services, Actions, Query Services.
- Building Full-Stack Inertia.js Monoliths or Headless REST APIs.
- Querying database layers with Eloquent ORM or Doctrine ORM.
- Writing or securing templates: Blade or Twig.
- Resolving N+1 bottlenecks, enforcing parameter binding, wrapping mutations in atomic transactions.
- Running syntax validation (`php-lint.php`), static analysis (Larastan/PHPStan), or test suites (PHPUnit/Pest).

---

## 1. Dual Transport Architecture Matrix

Always distinguish between full-stack monolithic applications and headless APIs. Do NOT cross-pollinate their transport mechanisms:

| Dimension | Archetype A: Full-Stack Inertia Monolith | Archetype B: Headless REST API |
| :--- | :--- | :--- |
| **Response Type** | `Inertia::render('Page/Component', [...])` | `JsonResponse` via `PostResource` |
| **Mutation Redirect** | `to_route('admin.cards.index')->with('success', '...')` | `response()->json([...], 201)` |
| **Authentication** | Web session cookies (`HttpOnly`, `SameSite=Lax`) | Bearer tokens (Sanctum / Passport / JWT) |
| **CSRF Defense** | Automatic `X-XSRF-TOKEN` cookie validation | Header token authorization |
| **Shared State** | Middleware `HandleInertiaRequests` (`auth.user`) | Auth payload or `/api/user` endpoint |
| **Strict Anti-Pattern** | **FORBIDDEN**: Do NOT return `response()->json()` or API Resources for Inertia page routes | Do NOT mix HTML/Inertia views into API endpoints |

---

## 2. Command-Query Separation (CQS) & DTO Pragmatism

A senior software engineer prevents **Layer Explosion / Cargo-Culting**. Do not create a `RepositoryInterface` + `Repository` + `Action` + `DTO` pipeline for a simple 3-line query.

### A. Queries (Reading Data) — Zero Overhead
- **Simple entity reads (Catalog, details, admin tables)**:
  - Controller invokes Eloquent query scopes or thin `QueryService` directly:
    ```php
    $cards = Card::published()->with(['category', 'tags'])->paginate(12);
    ```
  - **Why NO Read DTO here**: Eloquent models in Laravel 11 are already strongly typed via `casts()`, BackedEnums, and PHPDoc generics (`Collection<int, Card>`). Wrapping simple reads in DTOs doubles object allocation in memory, increases GC pressure, breaks native pagination, and violates DRY by duplicating DB schemas.
- **When to use DTOs for Reading**:
  - Complex aggregations from multiple sources (e.g. `SeoMetadataDto` combining configs, models, and JSON-LD).
  - External 3rd-party API responses (e.g. CDEK, YooKassa, Telegram Webhooks).
  - Composite reporting and analytical dashboards.

### B. Commands (Mutations & Writes) — Strict Domain Safety
- **Flow**: `FormRequest` (input validation) → `DTO` (sanitized domain payload) → `Action / DomainService` → `Redirect / Response`.
- **Atomic Transactions**: All multi-step database mutations must be wrapped inside `DB::transaction()`:
  ```php
  return DB::transaction(function () use ($dto): Card {
      $card = Card::create($dto->toArray());
      $card->syncRelations($dto->relationIds);
      return $card;
  });
  ```

---

## 3. Clean Architecture Layers

```
┌───────────────────────────────────────────────────────────┐
│ 1. Transport     : Thin Controllers / CLI Commands        │
│    → Inertia::render(), Form Requests, DTO mapping        │
├───────────────────────────────────────────────────────────┤
│ 2. Application   : Action Classes / Domain Services       │
│    → Orchestration, DB transactions, business validation  │
├───────────────────────────────────────────────────────────┤
│ 3. Domain        : Entities, Backed Enums, Value Objects  │
│    → Core invariants, strict native typings, casts()      │
├───────────────────────────────────────────────────────────┤
│ 4. Persistence   : Eloquent, Doctrine ORM                 │
│    → Parameter binding, eager loading (with / JOIN FETCH) │
└───────────────────────────────────────────────────────────┘
```

---

## 4. Development & Verification Workflow

Always execute PHP CLI commands inside the Docker container to avoid host environment discrepancies:

```
[ ] 1. Environment Verification
      – Check composer.json and PHP version (PHP 8.2–8.4+).
[ ] 2. Clean Architecture Scaffolding
      – Thin controllers: delegate business logic to Actions / Domain Services.
      – Distinguish Inertia transport (Inertia::render, to_route) from REST API transport.
[ ] 3. Type Safety & CQS Pragmatism
      – Native PHP 8.2+ types, readonly classes, BackedEnums with match.
      – Simple reads via Eloquent scopes; DTOs reserved for complex aggregations and writes.
[ ] 4. Security & Data Integrity
      – All SQL parameters bound. Multi-step writes wrapped in DB::transaction().
      – Eager-load relations (Card::with('category')) to eliminate N+1.
[ ] 5. Automated Verification in Container
      – Syntax check: docker compose exec -T app php .agent/skills/developing-php-backend/scripts/php-lint.php app/
      – Template check: docker compose exec -T app php artisan view:cache
      – Test suite: docker compose exec -T app php artisan test
```

---

## 5. Modern PHP 8.2–8.4 Essentials

- **Readonly classes**: `final readonly class CreateCardData` (applies `readonly` to all properties automatically).
- **Backed Enums** with `match`: status → badge color, label, icon; eliminates brittle `if/else` chains.
- **PHP 8.4 property hooks**: `public string $fullName { get => "$this->first $this->last"; }`.
- **PHP 8.4 asymmetric visibility**: `public private(set) int $version = 0;`.
- **First-class callable syntax**: `array_map($this->transform(...), $items)`.
- **Native `casts()` method**: In Laravel 11, use `protected function casts(): array` on models.

---

## 6. Framework-Specific Patterns

### Laravel 11
- **Inertia Monolith**: `CatalogFilterRequest` → `CardQueryService::publicListing()` → `Inertia::render('Home', [...])`.
- **REST API**: `StorePostRequest` → `CreatePostData` DTO → `CreatePostAction` → `PostResource`.
- **Streamlined Config**: Laravel 11 configures middleware and exceptions inside `bootstrap/app.php` (no `app/Http/Kernel.php`).
- **Reference**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php)

### Symfony 6/7
- DTOs with `#[Assert\NotBlank]` attributes. Service layer for persistence.
- Doctrine `QueryBuilder` with `->setParameter()`. JOIN FETCH to prevent N+1.
- **Reference**: [symfony-controller-doctrine.php](./examples/symfony-controller-doctrine.php)

---

## 7. Reference Files

- **Syntax Linter**: [php-lint.php](./scripts/php-lint.php) — recursive PHP syntax validator with container execution instructions.
- **Laravel & Inertia Patterns**: [laravel-controller-eloquent.php](./examples/laravel-controller-eloquent.php) — dual examples (Inertia Monolith vs REST API).
- **Clean Architecture Guide**: [php8-clean-architecture.md](./references/php8-clean-architecture.md) — ADR pattern, typed DTOs, CQS guidelines.
- **Security & Performance Checklist**: [php-security-performance-checklist.md](./resources/php-security-performance-checklist.md) — SQLi, XSS, CSRF, Argon2id, OPcache, N+1 audit.
