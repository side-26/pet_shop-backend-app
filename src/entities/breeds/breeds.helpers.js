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

export const buildBreedFilter = ({ includeDisabled, search, petType } = {}) => {
  const filter = {};
  if (!includeDisabled) filter.enable = true;
  if (petType) filter.petType = petType;
  if (search) {
    filter.title = { $regex: escapeBreedRegex(search), $options: 'i' };
  }
  return filter;
};
