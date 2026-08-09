export const formatLanding = (landing, featuredProducts = []) => {
  const value =
    landing && typeof landing.toObject === 'function'
      ? landing.toObject()
      : landing || {};

  return {
    heroTitle: value.heroTitle || '',
    heroSubtitle: value.heroSubtitle || '',
    featuredProductLimit: value.featuredProductLimit || 8,
    featuredProducts,
    updatedAt: value.updatedAt,
  };
};
