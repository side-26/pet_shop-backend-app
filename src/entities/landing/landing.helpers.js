import { LANDING_PRODUCT_FILTER_DEFINITIONS } from './landing.constants.js';

const PRODUCT_FILTER_FIELDS = ['category', 'subCategory', 'brand'];

const toFilterValues = (value) => {
  if (Array.isArray(value)) return value;
  return typeof value === 'string' ? value.split(',') : value;
};

export const parseLandingProductFilters = (query) => ({
  category: toFilterValues(query.category),
  subCategory: toFilterValues(query.subCategory),
  brand: toFilterValues(query.brand),
  price: {
    min: query.priceFrom,
    max: query.priceTo,
  },
  isEnable: query.isEnable,
});

export const buildLandingProductFilter = ({ filters, excludeFilter }) => {
  const filter = {};

  for (const field of PRODUCT_FILTER_FIELDS) {
    if (excludeFilter !== field && filters[field]?.length) {
      filter[field] = { $in: filters[field] };
    }
  }

  if (
    excludeFilter !== 'price' &&
    (filters.price.min !== undefined || filters.price.max !== undefined)
  ) {
    filter.price = {
      ...(filters.price.min !== undefined && { $gte: filters.price.min }),
      ...(filters.price.max !== undefined && { $lte: filters.price.max }),
    };
  }

  if (excludeFilter !== 'isEnable') {
    if (filters.isEnable === false) filter._id = { $exists: false };
    filter.isEnable = true;
  }

  return filter;
};

const createOptionMap = (items, getLabel) =>
  new Map(items.map((item) => [String(item._id), getLabel(item)]));

const formatMultiSelectFacet = (definition, values, optionMap) => ({
  ...definition,
  options: values
    .filter(({ _id }) => optionMap.has(String(_id)))
    .map(({ _id, count }) => ({
      value: String(_id),
      label: optionMap.get(String(_id)),
      count,
    })),
});

export const formatLandingProductFilters = (facetData, references) => {
  const categories = createOptionMap(
    references.categories,
    ({ title }) => title,
  );
  const subCategories = createOptionMap(
    references.subCategories,
    ({ title }) => title,
  );
  const brands = createOptionMap(
    references.brands,
    ({ title, title_fa }) => title_fa || title,
  );

  return LANDING_PRODUCT_FILTER_DEFINITIONS.map((definition) => {
    if (definition.key === 'price') {
      const [range] = facetData.price || [];
      return { ...definition, min: range?.min ?? 0, max: range?.max ?? 0 };
    }

    if (definition.key === 'isEnable') {
      const [{ count = 0 } = {}] = facetData.isEnable || [];
      return {
        ...definition,
        options: [
          { value: true, label: 'فعال', count },
          { value: false, label: 'غیرفعال', count: 0 },
        ],
      };
    }

    const optionMaps = {
      category: categories,
      subCategory: subCategories,
      brand: brands,
    };
    return formatMultiSelectFacet(
      definition,
      facetData[definition.key] || [],
      optionMaps[definition.key],
    );
  });
};
