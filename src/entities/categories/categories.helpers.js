export const escapeCategoryRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
