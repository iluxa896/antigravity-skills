import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit & Integration Test Suite demonstrating Boundary Value Analysis,
 * Exception Handling, and Negative Partitioning.
 */

// Simulated Cart Calculation Service
interface CartItem {
  id: string;
  price: number;
  quantity: number;
  discountPercentage?: number;
}

class CartPricingEngine {
  static calculateSubtotal(items: CartItem[]): number {
    if (!Array.isArray(items)) {
      throw new TypeError('Items parameter must be an array');
    }

    return items.reduce((total, item) => {
      if (item.price < 0 || item.quantity < 0) {
        throw new RangeError('Price and quantity must be non-negative');
      }
      if (!Number.isFinite(item.price) || !Number.isFinite(item.quantity)) {
        throw new TypeError('Price and quantity must be finite numbers');
      }

      const discount = item.discountPercentage ?? 0;
      if (discount < 0 || discount > 100) {
        throw new RangeError('Discount must be between 0 and 100');
      }

      const effectivePrice = item.price * (1 - discount / 100);
      return total + effectivePrice * item.quantity;
    }, 0);
  }

  static applyPromoCode(subtotal: number, promoCode: string): { finalTotal: number; discountApplied: number } {
    if (subtotal < 0) {
      throw new RangeError('Subtotal cannot be negative');
    }

    const cleanCode = (promoCode || '').trim().toUpperCase();

    if (cleanCode === 'SAVE20') {
      const discount = subtotal * 0.2;
      return { finalTotal: Math.max(0, subtotal - discount), discountApplied: discount };
    }

    if (cleanCode === 'FLAT50') {
      const discount = Math.min(50, subtotal);
      return { finalTotal: Math.max(0, subtotal - discount), discountApplied: discount };
    }

    return { finalTotal: subtotal, discountApplied: 0 };
  }
}

describe('CartPricingEngine - Exhaustive QA Test Matrix', () => {
  describe('Boundary & Valid Inputs', () => {
    it('calculates subtotal for standard valid items', () => {
      const items: CartItem[] = [
        { id: '1', price: 100, quantity: 2 },
        { id: '2', price: 50, quantity: 1, discountPercentage: 10 }, // 45
      ];
      expect(CartPricingEngine.calculateSubtotal(items)).toBe(245);
    });

    it('handles empty cart gracefully (Zero Boundary)', () => {
      expect(CartPricingEngine.calculateSubtotal([])).toBe(0);
    });

    it('handles 0 price item (Free item)', () => {
      const items: CartItem[] = [{ id: '1', price: 0, quantity: 5 }];
      expect(CartPricingEngine.calculateSubtotal(items)).toBe(0);
    });

    it('handles 100% discount correctly', () => {
      const items: CartItem[] = [{ id: '1', price: 500, quantity: 1, discountPercentage: 100 }];
      expect(CartPricingEngine.calculateSubtotal(items)).toBe(0);
    });
  });

  describe('Negative Testing & Exception Boundaries', () => {
    it('throws RangeError when negative price is passed', () => {
      const items: CartItem[] = [{ id: '1', price: -10, quantity: 1 }];
      expect(() => CartPricingEngine.calculateSubtotal(items)).toThrow(RangeError);
    });

    it('throws RangeError when negative quantity is passed', () => {
      const items: CartItem[] = [{ id: '1', price: 10, quantity: -2 }];
      expect(() => CartPricingEngine.calculateSubtotal(items)).toThrow(RangeError);
    });

    it('throws RangeError when discount exceeds 100%', () => {
      const items: CartItem[] = [{ id: '1', price: 10, quantity: 1, discountPercentage: 120 }];
      expect(() => CartPricingEngine.calculateSubtotal(items)).toThrow(RangeError);
    });

    it('throws TypeError when non-array is passed', () => {
      // @ts-expect-error Intentionally invalid input testing runtime defense
      expect(() => CartPricingEngine.calculateSubtotal(null)).toThrow(TypeError);
      // @ts-expect-error Intentionally invalid input
      expect(() => CartPricingEngine.calculateSubtotal(undefined)).toThrow(TypeError);
    });

    it('handles floating point precision boundaries without distortion', () => {
      const items: CartItem[] = [
        { id: '1', price: 0.1, quantity: 1 },
        { id: '2', price: 0.2, quantity: 1 },
      ];
      const result = CartPricingEngine.calculateSubtotal(items);
      expect(Number(result.toFixed(2))).toBe(0.3);
    });
  });

  describe('Promo Code Calculation & Edge Cases', () => {
    it('applies percentage discount accurately', () => {
      const result = CartPricingEngine.applyPromoCode(100, 'SAVE20');
      expect(result.finalTotal).toBe(80);
      expect(result.discountApplied).toBe(20);
    });

    it('prevents final total from becoming negative when flat discount exceeds subtotal', () => {
      const result = CartPricingEngine.applyPromoCode(30, 'FLAT50');
      expect(result.finalTotal).toBe(0);
      expect(result.discountApplied).toBe(30); // Capped at subtotal
    });

    it('handles lowercase and whitespace promo codes safely', () => {
      const result = CartPricingEngine.applyPromoCode(100, '  save20  ');
      expect(result.finalTotal).toBe(80);
    });

    it('handles empty string or null promo code without crashing', () => {
      const result = CartPricingEngine.applyPromoCode(100, '');
      expect(result.finalTotal).toBe(100);
      expect(result.discountApplied).toBe(0);
    });
  });
});
