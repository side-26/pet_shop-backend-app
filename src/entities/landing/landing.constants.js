export const LANDING_LIMITS = {
  FEATURED_PET_TYPES: 4,
  FEATURED_PRODUCTS: 4,
  POPULAR_BRANDS: 5,
  POPULAR_PETS: 5,
  RECENT_PETS: 5,
  MINIMUM_PREFERRED_PETS: 4,
  MAX_SECTION_ITEMS: 100,
  PRODUCT_LIST_DEFAULT_LIMIT: 20,
};

export const LANDING_PRODUCT_LIST_SORTS = {
  MOST_VALUED: 'most-valued',
  LESS_VALUED: 'less-valued',
  MOST_SALES: 'most-sales',
  LESS_SALES: 'less-sales',
};

export const LANDING_PRODUCT_LIST_SORT_OPTIONS = [
  { value: LANDING_PRODUCT_LIST_SORTS.MOST_SALES, label: 'پرفروش‌ترین' },
  { value: LANDING_PRODUCT_LIST_SORTS.LESS_SALES, label: 'کم‌فروش‌ترین' },
  { value: LANDING_PRODUCT_LIST_SORTS.LESS_VALUED, label: 'ارزان‌ترین' },
  { value: LANDING_PRODUCT_LIST_SORTS.MOST_VALUED, label: 'گران‌ترین' },
];

export const FILTER_TYPES = {
  MULTI_SELECT: 'multi-select',
  RANGE: 'range',
  BOOLEAN: 'boolean',
};

export const LANDING_PRODUCT_FILTER_DEFINITIONS = [
  {
    key: 'category',
    label: 'دسته‌بندی',
    type: FILTER_TYPES.MULTI_SELECT,
    source: 'category',
    order: 1,
  },
  {
    key: 'subCategory',
    label: 'زیردسته‌بندی',
    type: FILTER_TYPES.MULTI_SELECT,
    source: 'subCategory',
    order: 2,
  },
  {
    key: 'brand',
    label: 'برند',
    type: FILTER_TYPES.MULTI_SELECT,
    source: 'brand',
    order: 3,
  },
  {
    key: 'price',
    label: 'قیمت',
    type: FILTER_TYPES.RANGE,
    source: 'price',
    order: 4,
    unit: 'تومان',
  },
  {
    key: 'isEnable',
    label: 'فقط کالاهای موجود',
    type: FILTER_TYPES.BOOLEAN,
    source: 'isEnable',
    order: 5,
  },
];

export const LANDING_PRODUCT_LIST_SORT_ORDERS = {
  [LANDING_PRODUCT_LIST_SORTS.MOST_VALUED]: { price: -1, title: 1, _id: 1 },
  [LANDING_PRODUCT_LIST_SORTS.LESS_VALUED]: { price: 1, title: 1, _id: 1 },
  [LANDING_PRODUCT_LIST_SORTS.MOST_SALES]: {
    salesVolume: -1,
    title: 1,
    _id: 1,
  },
  [LANDING_PRODUCT_LIST_SORTS.LESS_SALES]: {
    salesVolume: 1,
    title: 1,
    _id: 1,
  },
};

export const FEATURED_PRODUCT_TAGS = {
  MOST_PURCHASED: 'mostPurchased',
  MOST_DISCOUNTED: 'mostDiscounted',
  CHEAPEST: 'cheapest',
  MOST_WISHLISTED: 'mostWishlisted',
};
