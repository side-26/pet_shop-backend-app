import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { CategoryModel } from '#entities/categories/categories.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';

import { escapeProductRegex, formatProduct } from './products.helpers.js';
import { ProductModel } from './products.model.js';

export class ProductService {
  static async ensureRelations({ category, subCategory }) {
    const categoryDocument = await CategoryModel.findById(category);
    if (!categoryDocument) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'Selected category does not exist',
        code: 'CATEGORY_NOT_FOUND',
      });
    }

    if (subCategory) {
      const subCategoryDocument = await SubCategoryModel.findOne({
        _id: subCategory,
        category,
      });
      if (!subCategoryDocument) {
        setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
          message: 'Selected sub-category does not belong to the category',
          code: 'SUB_CATEGORY_NOT_FOUND',
        });
      }
    }
  }

  static async findById(id, throwOnNotFound = true) {
    const product = await ProductModel.findById(id);
    if (!product && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Product not found',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static findAll({ category, subCategory, includeDisabled = false } = {}) {
    const query = {};
    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (!includeDisabled) query.isEnabled = true;
    return ProductModel.find(query).sort({ createdAt: -1 });
  }

  static async create(data, userId) {
    await this.ensureRelations(data);
    const duplicate = await ProductModel.findOne({
      title: { $regex: `^${escapeProductRegex(data.title)}$`, $options: 'i' },
      category: data.category,
    });
    if (duplicate) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'A product with this title already exists in the category',
        code: ERROR_CODES.PRODUCT_ALREADY_EXISTS,
      });
    }
    return ProductModel.create({ ...data, createdBy: userId });
  }

  static async update(id, data, userId) {
    const current = await this.findById(id);
    const relations = {
      category: data.category || current.category,
      subCategory:
        data.subCategory === undefined ? current.subCategory : data.subCategory,
    };
    await this.ensureRelations(relations);
    if (data.title || data.category) {
      const duplicate = await ProductModel.findOne({
        _id: { $ne: id },
        title: {
          $regex: `^${escapeProductRegex(data.title || current.title)}$`,
          $options: 'i',
        },
        category: relations.category,
      });
      if (duplicate) {
        setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
          message: 'A product with this title already exists in the category',
          code: ERROR_CODES.PRODUCT_ALREADY_EXISTS,
        });
      }
    }
    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    return product;
  }

  static async delete(id) {
    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'Product not found',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static format(product) {
    return formatProduct(product);
  }

  static formatMany(products) {
    return products.map(formatProduct);
  }
}
