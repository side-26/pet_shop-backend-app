export const escapeBreedRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatBreed = (breed) => {
  if (!breed) return null;
  const value = typeof breed.toObject === 'function' ? breed.toObject() : breed;

  return {
    id: value._id,
    title: value.title,
    country: value.country,
    ageAverage: value.ageAverage,
    size: value.size,
    activityLevel: value.activityLevel,
    enable: value.enable,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const buildBreedFilter = ({ includeDisabled, search } = {}) => {
  const filter = {};
  if (!includeDisabled) filter.enable = true;
  if (search) {
    filter.title = { $regex: escapeBreedRegex(search), $options: 'i' };
  }
  return filter;
};
