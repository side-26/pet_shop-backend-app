import {
  calculateDiscountAmount,
  calculateDiscountedPrice,
} from './price.helpers.js';

describe('price helpers', () => {
  test('calculates discount amount and final discounted price', () => {
    expect(calculateDiscountAmount(200000, 20)).toBe(40000);
    expect(calculateDiscountedPrice(200000, 20)).toBe(160000);
  });
});
