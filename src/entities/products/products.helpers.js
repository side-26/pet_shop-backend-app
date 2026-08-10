import { CategoryService } from '#entities/categories/categories.service.js';
import { SubCategoryService } from '#entities/subCategories/subCategories.service.js';

export const escapeProductRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildProductFilter = (
  { search, category, subCategory, includeDisabled } = {},
  enabledOnly = false,
) => {
  const filter = {};
  if (enabledOnly || !includeDisabled) filter.enable = true;
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (search) {
    filter.title = { $regex: escapeProductRegex(search), $options: 'i' };
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
    enable: value.enable,
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
    enable: value.enable,
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
    enable: value.enable,
    slug: value.slug,
    category: CategoryService.format(value.category),
    subCategory: value.subCategory
      ? SubCategoryService.format(value.subCategory)
      : null,
  };
};
