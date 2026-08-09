export const escapeProductRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const formatProduct = (product) => {
  if (!product) return null;
  const value =
    typeof product.toObject === 'function' ? product.toObject() : product;

  return {
    id: value._id,
    title: value.title,
    description: value.description,
    price: value.price,
    stock: value.stock,
    category: value.category,
    subCategory: value.subCategory,
    images: value.images,
    isEnabled: value.isEnabled,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};
