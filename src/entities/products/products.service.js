import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  buildProductFilter,
  escapeProductRegex,
  formatCustomerProductDetail,
  formatCustomerProductListItem,
  formatManagementProduct,
} from './products.helpers.js';
import { ProductModel } from './products.model.js';

const populateRelations = async (documents) =>
  ProductModel.populate(documents, [
    { path: 'category' },
    { path: 'subCategory' },
  ]);

export class ProductService {
  static escapeRegex(value = '') {
    return escapeProductRegex(value);
  }

  static async findOne({ slug, excludeId } = {}) {
    const query = {};
    if (slug) query.slug = slug.toLowerCase();
    if (excludeId) query._id = { $ne: excludeId };
    return ProductModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const product = await ProductModel.findById(id);
    if (!product && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static async validateRelations(categoryId, subCategoryId) {
    const [category, subCategory] = await Promise.all([
      CategoryModel.findById(categoryId),
      subCategoryId ? SubCategoryModel.findById(subCategoryId) : null,
    ]);
    if (!category) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'دسته‌بندی انتخاب‌شده وجود ندارد',
        code: ERROR_CODES.PRODUCT_CATEGORY_NOT_FOUND,
      });
    }
    if (subCategoryId && !subCategory) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'زیر دسته‌بندی انتخاب‌شده وجود ندارد',
        code: ERROR_CODES.PRODUCT_SUB_CATEGORY_NOT_FOUND,
      });
    }
    if (
      subCategory &&
      subCategory.category?.toString() !== category._id.toString()
    ) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'زیر دسته‌بندی انتخاب‌شده متعلق به دسته‌بندی انتخاب‌شده نیست',
        code: ERROR_CODES.PRODUCT_SUB_CATEGORY_MISMATCH,
      });
    }
    return { category, subCategory };
  }

  static async ensureUniqueSlug(slug, excludeId) {
    const existingProduct = await this.findOne({ slug, excludeId });
    if (existingProduct) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'محصولی با این نامک قبلاً ثبت شده است',
        code: ERROR_CODES.PRODUCT_ALREADY_EXISTS,
      });
    }
  }

  static async create(data, userId) {
    await Promise.all([
      this.validateRelations(data.category, data.subCategory),
      this.ensureUniqueSlug(data.slug),
    ]);
    return ProductModel.create({ ...data, createdBy: userId });
  }

  static async update(id, data, userId) {
    const currentProduct = await this.findById(id);
    const categoryId = data.category || currentProduct.category;
    const hasSubCategory = Object.prototype.hasOwnProperty.call(
      data,
      'subCategory',
    );
    const subCategoryId = hasSubCategory
      ? data.subCategory
      : currentProduct.subCategory;
    const validations = [
      this.validateRelations(categoryId, subCategoryId || null),
    ];
    if (data.slug) validations.push(this.ensureUniqueSlug(data.slug, id));
    await Promise.all(validations);

    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static edit(id, data, userId) {
    return this.update(id, data, userId);
  }

  static async setEnableStatus(id, enable, userId) {
    await this.findById(id);
    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { enable, updatedBy: userId } },
      { returnDocument: 'after', runValidators: true },
    );
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    const product = await ProductModel.findByIdAndDelete(id);
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return product;
  }

  static async findManagementById(id) {
    const product = await this.findById(id);
    return populateRelations(product);
  }

  static async findManagementList(queryParams = {}) {
    const filter = {
      ...buildProductFilter(queryParams),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    const result = await getPaginationData(ProductModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست محصولات ناموفق بود',
        error: String(error),
      }),
    );
    result.result = await populateRelations(result.result);
    return result;
  }

  static async findCustomerList(queryParams = {}) {
    const filter = {
      ...buildProductFilter(queryParams, true),
      page: queryParams.page,
      limit: queryParams.limit,
      sort: queryParams.sort,
    };
    const result = await getPaginationData(ProductModel, filter, '', (error) =>
      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'دریافت فهرست محصولات ناموفق بود',
        error: String(error),
      }),
    );
    result.result = await populateRelations(result.result);
    return result;
  }

  static async findCustomerById(id) {
    const product = await ProductModel.findOne({ _id: id, enable: true });
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return populateRelations(product);
  }

  static formatManagement(product) {
    return formatManagementProduct(product);
  }

  static formatManagementMany(products) {
    return products.map(formatManagementProduct);
  }

  static formatCustomerList(products) {
    return products.map(formatCustomerProductListItem);
  }

  static formatCustomerDetail(product) {
    return formatCustomerProductDetail(product);
  }
}
