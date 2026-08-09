export const escapeSubCategoryRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
