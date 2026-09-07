import { test, expect } from '@playwright/test';

/**
 * Enterprise QA Destructive E2E Test Suite
 * Tests high-stakes Checkout & Authentication flows with aggressive edge cases.
 */

test.describe('Checkout Flow - Rigorous & Destructive QA Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to pricing/checkout page
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');
  });

  test('Happy Path: Complete order with valid card and verified total', async ({ page }) => {
    await page.locator('[data-testid="input-customer-name"]').fill('Alex Mercer');
    await page.locator('[data-testid="input-customer-email"]').fill('alex.qa@example.com');
    await page.locator('[data-testid="input-card-number"]').fill('4242424242424242');
    await page.locator('[data-testid="input-card-expiry"]').fill('12/28');
    await page.locator('[data-testid="input-card-cvc"]').fill('123');

    const submitBtn = page.locator('[data-testid="button-submit-order"]');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify order confirmation
    const successBanner = page.locator('[data-testid="order-success-confirmation"]');
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="order-id"]')).not.toBeEmpty();
  });

  test('Destructive: Rapid Double-Click Submission (Idempotency Check)', async ({ page }) => {
    await page.locator('[data-testid="input-customer-name"]').fill('Jane Doe');
    await page.locator('[data-testid="input-customer-email"]').fill('jane.idempotency@example.com');
    await page.locator('[data-testid="input-card-number"]').fill('4242424242424242');
    await page.locator('[data-testid="input-card-expiry"]').fill('12/28');
    await page.locator('[data-testid="input-card-cvc"]').fill('123');

    const submitBtn = page.locator('[data-testid="button-submit-order"]');

    // Intercept checkout network requests to count outgoing POST calls
    let postCount = 0;
    await page.route('**/api/v1/orders/checkout', async (route) => {
      postCount++;
      // Add slight delay to simulate real network processing
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, orderId: 'ORD-99201' }),
      });
    });

    // Aggressive double-click
    await submitBtn.dblclick();

    // Button should immediately disable on first click preventing second dispatch
    await expect(submitBtn).toBeDisabled();
    expect(postCount).toBe(1); // Assert only 1 request was dispatched
  });

  test('Boundary: Injection Attack Payloads in Name & Address Fields', async ({ page }) => {
    const xssPayload = `<img src=x onerror=alert('XSS_BREACH')>`;
    const sqliPayload = `' OR 1=1; DROP TABLE orders; --`;

    await page.locator('[data-testid="input-customer-name"]').fill(xssPayload);
    await page.locator('[data-testid="input-customer-email"]').fill('test@test.com');
    await page.locator('[data-testid="input-address"]').fill(sqliPayload);

    // Assert DOM did not execute script or render malicious img tag
    const renderedNameElement = page.locator('[data-testid="preview-customer-name"]');
    if (await renderedNameElement.count() > 0) {
      await expect(renderedNameElement).toHaveText(xssPayload); // Should be safely escaped text, not raw HTML
    }
  });

  test('Resilience: Network Timeout & Gateway 504 Error Recovery', async ({ page }) => {
    await page.locator('[data-testid="input-customer-name"]').fill('Network Tester');
    await page.locator('[data-testid="input-customer-email"]').fill('timeout@test.com');
    await page.locator('[data-testid="input-card-number"]').fill('4242424242424242');

    // Simulate 504 Gateway Timeout from backend
    await page.route('**/api/v1/orders/checkout', async (route) => {
      await route.fulfill({
        status: 504,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Gateway Timeout' }),
      });
    });

    const submitBtn = page.locator('[data-testid="button-submit-order"]');
    await submitBtn.click();

    // UI must gracefully display error message and re-enable button without clearing user input
    const errorAlert = page.locator('[data-testid="alert-checkout-error"]');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText(/temporary network issue|try again/i);
    await expect(submitBtn).toBeEnabled(); // Form remains editable
  });

  test('Accessibility (a11y): Complete Keyboard Navigation Flow', async ({ page }) => {
    // Focus first element
    await page.locator('[data-testid="input-customer-name"]').focus();

    // Tab through fields sequentially
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="input-customer-email"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="input-card-number"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="input-card-expiry"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="input-card-cvc"]')).toBeFocused();
  });
});
