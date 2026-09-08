---
name: assuring-software-quality
description: >-
  Executes rigorous QA testing workflows, test planning, edge-case analysis, and automated
  test suite creation across Unit, Integration, E2E, a11y, and API boundaries. Enforces boundary
  value analysis (BVA), idempotency verification, race condition fuzzing, and network timeout
  resilience. Use when writing tests with Vitest, Playwright, Cypress, or PHPUnit, authoring
  test matrices, conducting destructive audits, or inspecting test files (.spec.ts, .test.ts, Test.php).
---

# Assuring Software Quality

## When to use this skill
- Designing QA test plans, test matrices, and regression suites.
- Writing E2E automation tests with Playwright or Cypress using resilient selectors.
- Authoring unit, component, or integration tests with Vitest, Jest, or PHPUnit.
- Conducting destructive testing, boundary value analysis (BVA), and equivalence partitioning.
- Testing high-risk workflows: auth, RBAC, payments, concurrency, state desync.
- Validating WCAG 2.1 AA accessibility and cross-browser/device responsiveness.

---

## 1. Degrees of Freedom

| Level | Area | Constraints |
| :--- | :--- | :--- |
| **High** | Test Strategy & Risk Modeling | Coverage levels (Unit/Integration/E2E), edge-case matrices, business failure impact. |
| **Medium** | Test Architecture & Fixtures | File structure, mock contracts, data factories, DB seeders, isolated environments. |
| **Low** | Assertions, Selectors & Exit Codes | `data-testid`/`getByRole` only (zero CSS selectors), strict status codes, `process.exit(0/1)`. |

---

## 2. Core Methodologies

### Test Pyramid
- **Unit**: Pure functions, domain logic — zero external dependencies.
- **Integration / API**: Contract boundaries, DB transactions, rollbacks, HTTP status codes, invalid payloads.
- **Component**: Prop rendering, event emitting, loading/error states with mocked APIs.
- **E2E**: Full browser journeys — multi-step flows, auth, network failure resilience.

### Destructive Edge-Case Matrix
Apply to every critical workflow:
- **BVA**: `$0.00`, `$0.01`, `2^31-1`, empty strings, 10k-char strings, off-by-one bounds.
- **Negative inputs**: `null`, `undefined`, `[]`, `NaN`, negative values, emoji, Unicode NBSP, SQLi/XSS payloads.
- **Concurrency**: Double-click submissions (idempotency), simultaneous one-time token reuse, optimistic lock verification.
- **Network faults**: Offline mode, slow 3G, dropped WebSocket, 500/502/504 mid-flow.

### Accessibility (a11y)
- Full keyboard nav: Tab, Shift+Tab, Enter, Space, Escape on modals.
- ARIA: `aria-expanded`, `aria-controls`, `aria-live="polite"` for async notifications.
- Color contrast: ≥4.5:1 normal text, ≥3:1 large text (WCAG AA).

---

## 3. Execution Workflow

```
[ ] 1. Requirement & Risk Decomposition
      – Identify critical paths (Auth, Checkout, Data Export).
      – Enumerate high-probability failure points and catastrophic edge cases.
[ ] 2. Test Plan & Matrix Construction
      – Map Happy Path, Negative Path, Edge/Boundary, Security/A11y criteria.
      – Define fixtures and reproducible test data.
[ ] 3. Automated Test Authoring
      – Unit/Integration tests for domain logic.
      – E2E Playwright/Cypress with data-testid selectors.
      – Inject negative conditions: bad payloads, 401/403/504 errors, network throttle.
[ ] 4. Audit & Regression Verification
      – node .agent/skills/assuring-software-quality/scripts/qa-suite-runner.mjs --path tests/ --threshold 75
      – Ensure CI/CD blocks merges on test failures.
```

---

## 4. Reference Files

- **Script**: [qa-suite-runner.mjs](./scripts/qa-suite-runner.mjs) — inspects suites for BVA, negative assertions, resilient selectors.
- **E2E Example (Playwright)**: [playwright-e2e-suite.ts](./examples/playwright-e2e-suite.ts) — payment workflow, double-click, network timeouts, injection attacks.
- **Unit/Integration Example (Vitest)**: [vitest-unit-integration.spec.ts](./examples/vitest-unit-integration.spec.ts) — BVA, mocked exceptions, state transitions.
- **Backend Destructive Suite (PHPUnit)**: [phpunit-api-destructive-test.php](./examples/phpunit-api-destructive-test.php) — idempotency, boundary payloads, transaction rollbacks.
- **Checklist**: [qa-destructive-testing-checklist.md](./resources/qa-destructive-testing-checklist.md) — functional, security, performance, a11y dimensions.
- **Patterns Reference**: [destructive-testing-patterns.md](./references/destructive-testing-patterns.md) — deep BVA, race conditions, fault injection guide.
