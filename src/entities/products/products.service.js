import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { MainImageService } from '#services/mainImage.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import {
  buildProductFilter,
  escapeProductRegex,
  formatCustomerProductDetail,
  formatCustomerProductListItem,
  formatManagementProduct,
  formatProductImages,
  formatProductMainInfo,
  formatProductPrice,
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

  static async create(data, userId, imageFile, imageFiles = []) {
    await this.validateRelations(data.category, data.subCategory);
    const uploadResults = await Promise.allSettled([
      MainImageService.upload(imageFile, 'products/main'),
      MainImageService.uploadImages(imageFiles, 'products/images'),
    ]);
    const uploadedMainImage =
      uploadResults[0].status === 'fulfilled' ? uploadResults[0].value : null;
    const uploadedImages =
      uploadResults[1].status === 'fulfilled' ? uploadResults[1].value : [];
    const failedUpload = uploadResults.find(
      (result) => result.status === 'rejected',
    );

    if (failedUpload) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage?.key, { userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { userId },
        ),
      ]);
      throw failedUpload.reason;
    }

    try {
      return await ProductModel.create({
        ...data,
        mainImage: uploadedMainImage.mainImage,
        mainImageThumbnail: uploadedMainImage.mainImageThumbnail,
        images: uploadedImages.map(({ url }) => url),
        createdBy: userId,
      });
    } catch (error) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { userId },
        ),
      ]);
      throw error;
    }
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
    await this.validateRelations(categoryId, subCategoryId || null);

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

  static async updateMainInfo(id, data, userId) {
    const product = await this.update(id, data, userId);
    return populateRelations(product);
  }

  static async updateImages(id, userId, imageFile, imageFiles = []) {
    if (!imageFile) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر اصلی باید ارسال شود',
      });
    }
    const currentProduct = await this.findById(id);
    const uploadResults = await Promise.allSettled([
      MainImageService.upload(imageFile, 'products/main'),
      MainImageService.uploadImages(imageFiles, 'products/images'),
    ]);
    const uploadedMainImage =
      uploadResults[0].status === 'fulfilled' ? uploadResults[0].value : null;
    const uploadedImages =
      uploadResults[1].status === 'fulfilled' ? uploadResults[1].value : [];
    const failedUpload = uploadResults.find(
      (result) => result.status === 'rejected',
    );

    if (failedUpload) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage?.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      throw failedUpload.reason;
    }

    const imageData = {
      mainImage: uploadedMainImage.mainImage,
      mainImageThumbnail: uploadedMainImage.mainImageThumbnail,
      images: uploadedImages.map(({ url }) => url),
    };
    let product;
    try {
      product = await ProductModel.findByIdAndUpdate(
        id,
        { $set: { ...imageData, updatedBy: userId } },
        { returnDocument: 'after', runValidators: true },
      );
    } catch (error) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      throw error;
    }
    if (!product) {
      await Promise.all([
        MainImageService.cleanup(uploadedMainImage.key, { id, userId }),
        MainImageService.cleanupMany(
          uploadedImages.map(({ key }) => key),
          { id, userId },
        ),
      ]);
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    const previousKeys = [
      MainImageService.getStoredKey(currentProduct.mainImage, { id, userId }),
      ...(currentProduct.images || []).map((imageUrl) =>
        MainImageService.getStoredKey(imageUrl, { id, userId }),
      ),
    ];
    await MainImageService.cleanupMany(previousKeys, { id, userId });
    return product;
  }

  static async updatePrice(id, data, userId) {
    await this.findById(id);
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

  static async setEnableStatus(id, isEnable, userId) {
    await this.findById(id);
    const product = await ProductModel.findByIdAndUpdate(
      id,
      { $set: { isEnable, updatedBy: userId } },
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
    const imageKeys = [
      MainImageService.getStoredKey(product.mainImage, { id }),
      ...(product.images || []).map((imageUrl) =>
        MainImageService.getStoredKey(imageUrl, { id }),
      ),
    ];
    await MainImageService.cleanupMany(imageKeys, { id });
    return product;
  }

  static async findManagementById(id) {
    const product = await this.findById(id);
    return populateRelations(product);
  }

  static findImagesById(id) {
    return this.findById(id);
  }

  static findPriceById(id) {
    return this.findById(id);
  }

  static async findMainInfoById(id) {
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
    const product = await ProductModel.findOne({ _id: id, isEnable: true });
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

  static formatImages(product) {
    return formatProductImages(product);
  }

  static formatPrice(product) {
    return formatProductPrice(product);
  }

  static formatMainInfo(product) {
    return formatProductMainInfo(product);
  }
}
