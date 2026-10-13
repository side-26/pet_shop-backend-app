export const RELATED_ARTICLE_LIMIT = 5;

export const ARTICLE_LIST_SORTS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
};

export const ARTICLE_LIST_SORT_OPTIONS = [
  { value: ARTICLE_LIST_SORTS.NEWEST, label: 'جدیدترین' },
  { value: ARTICLE_LIST_SORTS.OLDEST, label: 'قدیمی‌ترین' },
];

export const ARTICLE_LIST_SORT_ORDERS = {
  [ARTICLE_LIST_SORTS.NEWEST]: { createdAt: -1, _id: -1 },
  [ARTICLE_LIST_SORTS.OLDEST]: { createdAt: 1, _id: 1 },
};
