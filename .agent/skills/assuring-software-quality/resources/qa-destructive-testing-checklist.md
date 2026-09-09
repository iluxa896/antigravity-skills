# Comprehensive QA Destructive Testing & Bug Audit Checklist

This resource defines the rigorous QA testing procedures, boundary attack vectors, and validation checklist for mission-critical software systems.

---

## 0. Test Pyramid & Pragmatic Architecture Checklist

- [ ] **Pyramid Distribution**: ~70% Fast Unit & HTTP Feature Tests (PHPUnit / Vitest), ~20% Component Tests, ~10% Resilient E2E (Playwright).
- [ ] **No E2E Bloat**: Never test every individual validation rule or minor error state through heavy browser automation. Reserve Playwright for mission-critical multi-step user journeys (Auth, Checkout, Upload).
- [ ] **Framework-Native DB Testing**: Use native framework tools (`RefreshDatabase`, factories, transactions) instead of synthetic in-file mock database connections.
- [ ] **Resilient Selectors**: Strictly use `getByRole` or `data-testid` in browser tests. Zero fragile CSS class selectors.
- [ ] **Zero Arbitrary Sleep**: Use auto-waiting assertions (`toBeVisible()`) instead of `page.waitForTimeout()` or `sleep()`.

---

## 1. Functional & Boundary Value Test Matrix

### Boundary Value Analysis (BVA)
- [ ] **Numeric Minimums & Maximums**: Test `0`, `-1`, `1`, `MAX_INT (2147483647)`, `MIN_INT`, floating points (`0.00001`, `0.99999`).
- [ ] **String Length Limits**: Test empty string `""`, single character, exactly max-length characters, and `max-length + 1` characters.
- [ ] **Array / Collection Limits**: Test empty array `[]`, single item `[1]`, pagination limit boundaries (`page=1`, `page=999999`, `limit=0`, `limit=1000`).

### Negative & Malformed Input Testing
- [ ] **Nullability**: Pass `null`, `undefined`, `NaN`, `[null]`, `{"key": null}` to all endpoints and functions.
- [ ] **Type Coercion Violations**: Send boolean `true` where string is expected, array where object is expected, string `"123"` where integer is expected.
- [ ] **Special Characters & Unicode**: Test emojis (🔥, 🚀), right-to-left scripts (Arabic/Hebrew), zero-width spaces (`\u200B`), non-breaking spaces (`&nbsp;`).

---

## 2. Destructive & Concurrency Testing

### Race Conditions & Idempotency
- [ ] **Double-Click Submissions**: Rapidly double-click submit buttons on payment forms, order placements, and credit deductions. Verify single charge and single record creation.
- [ ] **Concurrent Session Requests**: Fire simultaneous requests with the same one-time coupon or promo code from multiple browser tabs.
- [ ] **Optimistic Locking**: Edit the same record simultaneously in two browser sessions. Verify the second save rejects with an out-of-date conflict warning rather than silently overwriting changes.

### Network & Fault Resilience
- [ ] **Simulated Offline / Connection Drop**: Turn off network mid-upload or mid-checkout. Confirm application alerts user gracefully and does not lock into an infinite spinner.
- [ ] **Slow 3G / High Latency**: Throttle bandwidth to 50kbps with 2000ms latency. Verify loading skeletons appear, buttons indicate busy state, and requests do not duplicate.
- [ ] **Backend 500 / 502 / 504 Handlers**: Mock gateway failures and server errors. Verify user-facing friendly error message with retry mechanism.

---

## 3. Security & Injection Testing Vectors

- [ ] **Cross-Site Scripting (XSS)**: Inject `<script>alert('XSS')</script>`, `<img src=x onerror=alert(1)>`, and `javascript:alert(1)` into all inputs, URL query params, and headers.
- [ ] **SQL Injection (SQLi)**: Test `' OR '1'='1`, `'; DROP TABLE users; --`, `UNION SELECT` in search filters, sort parameters, and pagination IDs.
- [ ] **Broken Object Level Authorization (BOLA/IDOR)**: Change URL IDs (`/api/orders/105` -> `/api/orders/104`) as an unprivileged user to confirm cross-tenant data isolation.
- [ ] **CSRF Defense**: Ensure mutating endpoints (POST/PUT/DELETE) validate anti-CSRF headers or SameSite cookie protection.

---

## 4. Accessibility (a11y) & Visual Regression

- [ ] **Keyboard Navigability**: Entire application can be operated using only `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`. No keyboard traps.
- [ ] **Focus Visibility**: Visible focus rings on all interactive elements during keyboard navigation.
- [ ] **Screen Reader Labels**: Every icon button has an `aria-label` or visually hidden text (`.sr-only`).
- [ ] **Color Contrast**: Normal text contrast $\ge 4.5:1$, large text $\ge 3:1$ against background in both light and dark modes.

---

## 5. Professional Bug Report Template

```markdown
### [BUG] Short Descriptive Title (e.g., Double click on checkout dispatches duplicate charge)

**Severity**: Critical / High / Medium / Low
**Environment**: Production / Staging | Chrome 120 / iOS Safari | Desktop / Mobile

#### Steps to Reproduce
1. Navigate to `/checkout` with items in cart.
2. Fill in valid credit card credentials.
3. Rapidly double-click the "Place Order" button.

#### Expected Result
Button should immediately disable on first click; exactly one charge and order record created.

#### Actual Result
Button remains active for 400ms; two identical charge transactions appear in Stripe dashboard.

#### Logs & Network Evidence
- POST `/api/v1/orders/checkout` dispatched twice (Timestamp: 14:02:01.120 and 14:02:01.290)
- Response 1: 200 OK (Order ORD-101)
- Response 2: 200 OK (Order ORD-102)

#### Proposed Fix
Implement client-side submission state lock + backend idempotency key in header (`Idempotency-Key`).
```
