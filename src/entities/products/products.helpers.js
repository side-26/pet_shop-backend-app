import { CategoryService } from '#entities/categories/categories.service.js';
import { SubCategoryService } from '#entities/subCategories/subCategories.service.js';

export const escapeProductRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildProductFilter = (
  {
    title: filterTitle,
    search,
    category,
    subCategory,
    quantity,
    price,
    isEnable,
    includeDisabled,
  } = {},
  enabledOnly = false,
) => {
  const filter = {};
  const title = filterTitle ?? search;
  if (enabledOnly) filter.isEnable = true;
  else if (isEnable !== undefined) filter.isEnable = isEnable;
  else if (!includeDisabled) filter.isEnable = true;
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (quantity !== undefined) filter.quantity = quantity;
  if (price !== undefined) filter.price = price;
  if (title) {
    filter.title = { $regex: escapeProductRegex(title), $options: 'i' };
  }
  return filter;
};

const valueOf = (product) =>
  typeof product?.toObject === 'function' ? product.toObject() : product;
const relationId = (relation) => relation?._id || relation;

export const formatManagementProduct = (product) => {
  if (!product) return null;
  const value = valueOf(product);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    images: value.images || [],
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    category: value.category?.title
      ? CategoryService.format(value.category)
      : relationId(value.category),
    subCategory: value.subCategory?.title
      ? SubCategoryService.format(value.subCategory)
      : relationId(value.subCategory) || null,
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    isEnable: value.isEnable,
    slug: value.slug,
    createdBy: value.createdBy,
    updatedBy: value.updatedBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const formatCustomerProductListItem = (product) => {
  const value = valueOf(product);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    isEnable: value.isEnable,
    slug: value.slug,
    category: value.category?.title,
    subCategory: value.subCategory?.title || null,
  };
};

export const formatCustomerProductDetail = (product) => {
  const value = valueOf(product);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    images: value.images || [],
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    isEnable: value.isEnable,
    slug: value.slug,
    category: CategoryService.format(value.category),
    subCategory: value.subCategory
      ? SubCategoryService.format(value.subCategory)
      : null,
  };
};

export const formatProductImages = (product) => {
  const value = valueOf(product);
  return {
    mainImage: value.mainImage,
    mainImageThumbnail: value.mainImageThumbnail,
    imagesList: value.images || [],
  };
};

export const formatProductPrice = (product) => {
  const value = valueOf(product);
  return {
    price: value.price,
    discountPercentage: value.discountPercentage,
  };
};

export const formatProductMainInfo = (product) => {
  const value = valueOf(product);
  return {
    title: value.title,
    category: value.category?.title
      ? CategoryService.format(value.category)
      : relationId(value.category),
    subCategory: value.subCategory?.title
      ? SubCategoryService.format(value.subCategory)
      : relationId(value.subCategory) || null,
    quantity: value.quantity,
    summary: value.summary,
    description: value.description,
  };
};
