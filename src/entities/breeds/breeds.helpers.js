export const escapeBreedRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatBreed = (breed) => {
  if (!breed) return null;
  const value = typeof breed.toObject === 'function' ? breed.toObject() : breed;

  return {
    id: value._id,
    title: value.title,
    petType: value.petType,
    country: value.country,
    ageAverage: value.ageAverage,
    size: value.size,
    activityLevel: value.activityLevel,
    propertyDefinitions: value.propertyDefinitions || [],
    slug: value.slug,
    mainImage: value.mainImage,
    thumbnailImage: value.thumbnailImage,
    enable: value.enable,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const buildBreedFilter = ({
  activityLevel,
  country,
  includeDisabled,
  petType,
  search,
  size,
  title,
} = {}) => {
  const filter = {};
  if (!includeDisabled) filter.enable = true;
  if (petType) filter.petType = petType;
  if (country) {
    filter.country = { $regex: escapeBreedRegex(country), $options: 'i' };
  }
  if (size !== undefined) filter.size = size;
  if (activityLevel !== undefined) filter.activityLevel = activityLevel;

  const titleQueries = [title, search].filter(Boolean).map((value) => ({
    title: { $regex: escapeBreedRegex(value), $options: 'i' },
  }));
  if (titleQueries.length === 1) {
    Object.assign(filter, titleQueries[0]);
  } else if (titleQueries.length > 1) {
    filter.$and = titleQueries;
  }
  return filter;
};
