---
name: assuring-software-quality
description: >-
  Executes rigorous, pragmatic QA testing workflows, test planning, edge-case analysis, and automated
  test suite creation across Unit, Integration, E2E, a11y, and API boundaries. Enforces the Test Pyramid,
  boundary value analysis (BVA), idempotency verification, framework-native database testing, and
  flakiness-free Playwright/PHPUnit suites. Use when writing tests with Vitest, Playwright, Cypress, or PHPUnit,
  authoring test matrices, conducting destructive audits, or inspecting test files (.spec.ts, .test.ts, Test.php).
---

# Assuring Software Quality (Pragmatic Enterprise QA Master Skill)

## When to use this skill
- Designing QA test plans, edge-case matrices, and regression suites.
- Authoring unit, integration, and HTTP Feature tests with PHPUnit, Pest, or Vitest.
- Authoring robust, flakiness-free E2E browser automation with Playwright or Cypress.
- Conducting destructive testing, boundary value analysis (BVA), and idempotency audits.
- Testing high-risk workflows: authentication, authorization (RBAC/IDOR), data mutations, and race conditions.
- Validating WCAG 2.1 AA accessibility (keyboard focus traps, ARIA roles, color contrast).

---

## 1. Core Senior Principles (KISS, YAGNI & Anti-Test-Bloat)

### A. The Pragmatic Test Pyramid Distribution
Avoid "ice cream cone" anti-patterns where projects rely heavily on slow, fragile E2E tests:
- **~70% Fast Unit & Integration/Feature Tests (PHPUnit / Vitest)**:
  - Validates business logic, domain services, database integrity, and HTTP endpoints.
  - Covers all edge cases, boundary values (BVA), negative inputs, and authorization checks.
  - Runs in seconds inside containers or local environments.
- **~20% Component / Integration Tests**:
  - Validates Vue component state transitions, prop validation, and event emission with mocked API boundaries.
- **~10% Resilient E2E Tests (Playwright / Cypress)**:
  - Strictly reserved for mission-critical end-to-end user journeys (authentication flow, full order checkout, file upload pipeline).
  - **NEVER** test every single validation error or edge case through heavy browser automation.

### B. Framework-Native Testing Over Synthetic Mocks
- **Avoid Fake In-Memory Mocks**: Do NOT write synthetic custom database mock classes (`MockDatabaseConnection`) inside test files. They diverge from real SQL behavior, missing actual constraints, locks, and foreign keys.
- **Use Native Framework Tooling**:
  - In Laravel / PHP: Use `RefreshDatabase`, Eloquent factories (`Model::factory()`), `$this->postJson()`, `assertStatus()`, and `$this->assertDatabaseHas()`.
  - In Vue / JS: Use `@vue/test-utils` or testing library with standard vitest spies.

### C. Test Invariants, Not Framework Internals
- Focus tests on **business invariants, data integrity, and security boundaries** (e.g. preventing negative prices, ensuring transaction rollback on failure, blocking unauthorized reads).
- Do not write repetitive tests verifying that standard framework rules (like `'integer'`) work — trust the underlying framework and test the domain contracts.

---

## 2. Destructive Testing & Boundary Matrix (BVA)

Apply to all mission-critical workflows (orders, payments, sensitive data mutations):

| Test Vector | Target Conditions | Senior Expectation |
| :--- | :--- | :--- |
| **Numeric Boundaries** | `0`, `-1`, `$0.00`, `MAX_INT`, negative amounts | Strict rejection (422 / typed Domain Exception). Never allow negative charges or integer overflow. |
| **String & Payload Limits** | Empty strings `""`, whitespace only, `max+1` chars, 10k strings | Explicit validation errors. Never trigger 500 unhandled exceptions. |
| **Negative & Fuzzing** | `null`, `undefined`, `[]`, emoji, unicode NBSP | Safe default fallback or deterministic 422 error. |
| **Security Injections** | XSS payloads (`<img src=x onerror=...`), SQLi (`' OR 1=1`) | Stripped, escaped, or rejected; parameterized queries ensure zero injection. |
| **Idempotency & Concurrency**| Double-click submissions, duplicate request tokens | First request succeeds; duplicate request safely replays or rejects without double mutation. |
| **Database Failure** | Deadlock simulation, mid-mutation exception | Atomic `DB::transaction()` automatically rolls back all partial mutations. |

---

## 3. E2E Playwright Automation Rules (Flakiness Defense)

1. **Resilient Selectors Only**:
   - Use accessible roles (`page.getByRole('button', { name: 'Сохранить' })`) or explicit test IDs (`page.locator('[data-testid="input-price"]')`).
   - **STRICTLY FORBIDDEN**: Never use brittle CSS classes (`.btn-primary > span:first-child`) or DOM hierarchy paths.
2. **Zero Arbitrary Sleep Calls**:
   - **NEVER** use `page.waitForTimeout(3000)` or `sleep()` to wait for UI updates.
   - Use auto-waiting web assertions: `await expect(locator).toBeVisible()` or wait for network state `await page.waitForResponse()`.
3. **Isolated Test State**:
   - Every test must be completely independent. Seed test fixtures cleanly before each test; never depend on execution order.

---

## 4. Execution Workflow

```
1. Requirements & Risk Decomposition
   – Identify critical paths (Auth, Catalog Mutations, Checkout, Admin Uploads).
   – Map the happy path and primary failure vectors.

2. Automated Test Implementation
   – Backend Feature/Unit tests for domain logic, validation rules, and DB transactions.
   – E2E Playwright tests strictly for critical user journeys.

3. Destructive Verification & CI Pass
   – Run PHPUnit: docker compose exec -T app php artisan test
   – Run Playwright (if E2E is present): npx playwright test
   – Verify 100% pass rate with zero flaky assertions.
```

---

## 5. Reference Suite

- **Script**: [qa-suite-runner.mjs](./scripts/qa-suite-runner.mjs) — static QA auditor checking test hygiene, boundary checks, and resilient selectors.
- **Backend Destructive Feature Test**: [phpunit-api-destructive-test.php](./examples/phpunit-api-destructive-test.php) — real Laravel HTTP Feature Test with BVA, idempotency, and transaction rollback.
- **E2E Destructive Suite (Playwright)**: [playwright-e2e-suite.ts](./examples/playwright-e2e-suite.ts) — idempotency double-click check, network timeouts, resilient selectors.
- **Checklist**: [qa-destructive-testing-checklist.md](./resources/qa-destructive-testing-checklist.md) — comprehensive QA checklist.

