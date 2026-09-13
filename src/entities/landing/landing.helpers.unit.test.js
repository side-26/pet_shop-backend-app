import {
  buildLandingProductFilter,
  formatLandingProductFilters,
  parseLandingProductFilters,
} from './landing.helpers.js';

describe('landing product-list helpers', () => {
  test('parses selected filters and excludes the requested facet from its query', () => {
    const filters = parseLandingProductFilters({
      category: ['category-id'],
      subCategory: ['sub-category-id'],
      brand: ['brand-id'],
      priceFrom: 100,
      priceTo: 200,
      available: true,
      isEnable: false,
    });

    expect(
      buildLandingProductFilter({ filters, excludeFilter: 'brand' }),
    ).toEqual({
      isEnable: true,
      category: { $in: ['category-id'] },
      subCategory: { $in: ['sub-category-id'] },
      price: { $gte: 100, $lte: 200 },
      quantity: { $gt: 0 },
      _id: { $exists: false },
    });
  });

  test('formats facets using enabled reference labels and zero-value empty ranges', () => {
    expect(
      formatLandingProductFilters(
        {
          category: [{ _id: 'category-id', count: 2 }],
          subCategory: [{ _id: 'sub-category-id', count: 1 }],
          brand: [{ _id: 'brand-id', count: 2 }],
          price: [],
          available: [{ count: 1 }],
          isEnable: [{ count: 2 }],
        },
        {
          categories: [{ _id: 'category-id', title: 'غذا' }],
          subCategories: [{ _id: 'sub-category-id', title: 'خشک' }],
          brands: [{ _id: 'brand-id', title: 'brand', title_fa: 'برند' }],
        },
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'brand',
          options: [{ value: 'brand-id', label: 'برند', count: 2 }],
        }),
        expect.objectContaining({ key: 'price', min: 0, max: 0 }),
        expect.objectContaining({
          key: 'isEnable',
          options: [
            { value: true, label: 'فعال', count: 2 },
            { value: false, label: 'غیرفعال', count: 0 },
          ],
        }),
      ]),
    );
  });
});
