---
name: assuring-software-quality
description: >-
  Executes rigorous QA testing workflows, test planning, edge-case analysis, destructive testing,
  and automated test suite creation across Unit, Integration, E2E, a11y, and API boundaries.
  Enforces boundary value analysis (BVA), idempotency verification, race condition fuzzing,
  and network timeout resilience. Use when writing tests with Vitest, Playwright, Cypress, or PHPUnit,
  authoring test matrices, conducting destructive audits, or inspecting test files (.spec.ts, .test.ts, Test.php).
---

# Assuring Software Quality (Master QA Skill)

## When to use this skill
- Designing comprehensive QA test plans, test matrices, and regression suites.
- Writing end-to-end (E2E) automation tests with Playwright or Cypress using resilient selectors.
- Authoring isolated unit, component, or integration tests with Vitest, Jest, or PHPUnit.
- Conducting destructive testing, boundary value analysis (BVA), and equivalence partitioning.
- Testing high-risk workflows (authentication, role-based authorization, checkout/payments, concurrency, state desync).
- Validating digital accessibility (WCAG 2.1 AA) and cross-browser/device responsiveness.
- Inspecting test files using the automated QA audit runner (`scripts/qa-suite-runner.mjs`).

---

## 1. Degrees of Freedom Model

| Freedom Level | Area | Application & Constraints |
| :--- | :--- | :--- |
| **High Freedom** | Test Strategy & Risk Modeling | Selecting test coverage levels (Unit vs Integration vs E2E), designing edge-case exploratory matrices, assessing business failure impacts. |
| **Medium Freedom** | Test Case Architecture & Fixtures | Structuring test files, creating mock contracts, configuring test data factories, setting up database seeders and isolated test environments. |
| **Low Freedom** | Assertions, Selectors & CI Exit Codes | Mandatory `data-testid` / `getByRole` selectors (zero fragile CSS selectors), strict status code matching, deterministic test suite exit codes (`process.exit(0/1)`). |

---

## 2. Core QA Engineering Methodologies

### A. The Test Pyramid & Layered Defense
- **Unit Testing**: Fast, isolated testing of pure functions, algorithms, utilities, and domain business logic. Zero external network/DB dependencies.
- **Integration & API Testing**: Testing contract boundaries, database queries, transaction rollbacks, API endpoints, HTTP status codes, and payload validation under invalid/missing data.
- **Component & State Testing**: Testing frontend components in isolation (mocking API responses, checking prop rendering, event emitting, and loading/error states).
- **End-to-End (E2E) Testing**: Full browser automated journeys simulating real user behavior, stateful multi-step wizards, authentication flows, and network failure resilience.

### B. Destructive Testing & Edge Case Discovery Matrix
Subject all critical workflows to aggressive edge-case exploration:
- **Boundary Value Analysis (BVA)**: Limits ($0.00$, $0.01$, max integer $2^{31}-1$, empty strings, 10,000+ char strings, off-by-one bounds).
- **Equivalence Partitioning & Negative Inputs**: `null`, `undefined`, empty array `[]`, `NaN`, negative quantities, emoji strings, Unicode non-breaking spaces, SQL injection strings, XSS payloads.
- **Concurrency & Race Conditions**: Double-click submissions on payment buttons (idempotency checks), simultaneous requests using the same one-time token or promo code, optimistic lock verification.
- **Network Fault Injection & Timeout Resilience**: Offline mode, slow 3G throttling, dropped WebSocket connections, 500/502/504 gateway timeouts mid-flow.

### C. Accessibility (a11y) & Usability Testing
- Verify full keyboard navigability (Tab order, Shift+Tab, Enter, Space, Escape on modals).
- Validate correct ARIA attributes (`aria-expanded`, `aria-controls`, `aria-live="polite"` for asynchronous notifications).
- Confirm color contrast ratios meet minimum 4.5:1 for normal text and 3:1 for large text (WCAG AA).

---

## 3. QA Execution Workflow: Plan -> Automate -> Audit -> Verify

```markdown
- [ ] 1. Requirement & Risk Decomposition
      - Identify critical business paths (e.g., Auth, Checkout, Data Export).
      - Enumerate high-probability failure points and catastrophic edge cases.
- [ ] 2. Test Plan & Matrix Construction
      - Map out Happy Path, Negative Path, Edge/Boundary Cases, and Security/A11y criteria.
      - Define required test fixtures and reproducible test data.
- [ ] 3. Automated Test Authoring
      - Author isolated Unit/Integration tests for domain logic.
      - Author resilient E2E Playwright/Cypress tests using reliable data-testid selectors.
      - Inject negative conditions (network latency, malformed payloads, 401/403/504 errors).
- [ ] 4. Automated Audit & Regression Verification
      - Run QA test suite auditor: node .agent/skills/assuring-software-quality/scripts/qa-suite-runner.mjs
      - Ensure automated tests run in CI/CD pipeline and block breaking changes.
```

---

## 4. Automated QA Suite Verification

Run the built-in QA suite auditor to inspect test files for edge cases, resilient selectors, and negative paths:

```bash
node .agent/skills/assuring-software-quality/scripts/qa-suite-runner.mjs --path tests/ --threshold 75
```

---

## 5. Supporting Resources & Examples

- **Automation Helper**: [qa-suite-runner.mjs](./scripts/qa-suite-runner.mjs) - Node.js CLI script inspecting test suites for boundary coverage, negative assertions, and resilient selectors.
- **E2E Test Suite (Playwright)**: [playwright-e2e-suite.ts](./examples/playwright-e2e-suite.ts) - Resilient E2E test suite covering payment workflows, double-click prevention, network timeouts, and injection attacks.
- **Unit & Integration Spec (Vitest)**: [vitest-unit-integration.spec.ts](./examples/vitest-unit-integration.spec.ts) - Unit & integration test cases with boundary values, mocked exceptions, and state transitions.
- **Backend API Destructive Suite (PHPUnit)**: [phpunit-api-destructive-test.php](./examples/phpunit-api-destructive-test.php) - PHPUnit 10/11 destructive tests with idempotency verification, boundary payloads, and transaction rollbacks.
- **Destructive Testing Reference**: [destructive-testing-patterns.md](./references/destructive-testing-patterns.md) - Deep guide on boundary value analysis, race conditions, and network fault injection.
- **QA Checklist & Bug Matrix**: [qa-destructive-testing-checklist.md](./resources/qa-destructive-testing-checklist.md) - Meticulous testing checklist covering functional, security, performance, and accessibility dimensions.
