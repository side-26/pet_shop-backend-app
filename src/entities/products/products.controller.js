import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createProductZodSchema,
  productIdSchema,
  productQuerySchema,
  updateProductImagesZodSchema,
  updateProductMainInfoZodSchema,
  updateProductPriceZodSchema,
  updateProductZodSchema,
  replaceProductPropertyDefinitionsZodSchema,
  replaceProductWeightsZodSchema,
  updateProductUserRateZodSchema,
} from './products.schema.js';
import { ProductService } from './products.service.js';

const getUserId = (user) => user?.userId || user?.id;
const getManagementQuery = (query) => ({ ...query, includeDisabled: true });

const updateProductSection = async (
  req,
  res,
  next,
  schema,
  method,
  formatter,
  imageFile,
  imageFiles,
  requiresImages = false,
) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const body = returnFormValidation(schema, req.body);
    const product = requiresImages
      ? await ProductService[method](
          id,
          getUserId(req.user),
          imageFile,
          imageFiles,
        )
      : await ProductService[method](id, body, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService[formatter](product),
      message: 'اطلاعات محصول با موفقیت ویرایش شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const createProductController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createProductZodSchema, req.body);
    const product = await ProductService.create(
      body,
      getUserId(req.user),
      req.files?.mainImage?.[0],
      req.files?.images || [],
    );
    setSuccessResponse(res, STATUES.CREATED, {
      data: ProductService.formatManagement(product),
      message: 'محصول با موفقیت ایجاد شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateProductController = (req, res, next) =>
  updateProductSection(
    req,
    res,
    next,
    updateProductZodSchema,
    'update',
    'formatManagement',
  );
export const editProductController = (req, res, next) =>
  updateProductSection(
    req,
    res,
    next,
    updateProductZodSchema,
    'edit',
    'formatManagement',
  );
export const updateProductImagesController = (req, res, next) =>
  updateProductSection(
    req,
    res,
    next,
    updateProductImagesZodSchema,
    'updateImages',
    'formatImages',
    req.files?.mainImage?.[0],
    req.files?.images || [],
    true,
  );
export const updateProductPriceController = (req, res, next) =>
  updateProductSection(
    req,
    res,
    next,
    updateProductPriceZodSchema,
    'updatePrice',
    'formatPrice',
  );
export const updateProductMainInfoController = (req, res, next) =>
  updateProductSection(
    req,
    res,
    next,
    updateProductMainInfoZodSchema,
    'updateMainInfo',
    'formatMainInfo',
  );

export const replaceProductPropertyDefinitionsController = async (
  req,
  res,
  next,
) => {
  try {
    const { id, propertyDefinitions } = returnFormValidation(
      replaceProductPropertyDefinitionsZodSchema,
      req.body,
    );
    const product = await ProductService.replacePropertyDefinitions(
      id,
      propertyDefinitions,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'ویژگی‌های محصول با موفقیت ویرایش شد',
      data: {
        id: product._id,
        propertyDefinitions: ProductService.formatPropertyDefinitions(product),
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getProductPropertyDefinitionsController = (req, res, next) =>
  getProductSection(req, res, next, 'findById', 'formatPropertyDefinitions');

export const replaceProductWeightsController = async (req, res, next) => {
  try {
    const { id, weights } = returnFormValidation(
      replaceProductWeightsZodSchema,
      req.body,
    );
    const product = await ProductService.replaceWeights(
      id,
      weights,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'وزن‌های محصول با موفقیت ویرایش شد',
      data: { id: product._id, weights: ProductService.formatWeights(product) },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getProductWeightsController = (req, res, next) =>
  getProductSection(req, res, next, 'findById', 'formatWeights');

export const updateProductUserRateController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const { userRate } = returnFormValidation(
      updateProductUserRateZodSchema,
      req.body,
    );
    const product = await ProductService.updateUserRate(
      id,
      userRate,
      getUserId(req.user),
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'امتیاز محصول با موفقیت ویرایش شد',
      data: {
        userRate: product.userRate,
        userRateCount: product.userRateCount,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getManagementProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService.findManagementById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.formatManagement(product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getManagementProductListController = async (req, res, next) => {
  try {
    const query = getManagementQuery(
      returnFormValidation(productQuerySchema, req.query),
    );
    const result = await ProductService.findManagementList(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: {
        result: ProductService.formatManagementMany(result.result),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const getProductSection = async (req, res, next, method, formatter) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService[method](id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService[formatter](product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getProductImagesController = (req, res, next) =>
  getProductSection(req, res, next, 'findImagesById', 'formatImages');
export const getProductPriceController = (req, res, next) =>
  getProductSection(req, res, next, 'findPriceById', 'formatPrice');
export const getProductMainInfoController = (req, res, next) =>
  getProductSection(req, res, next, 'findMainInfoById', 'formatMainInfo');

const changeProductStatus = async (req, res, next, method, message) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService[method](id, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.formatManagement(product),
      message,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const enableProductController = (req, res, next) =>
  changeProductStatus(req, res, next, 'enable', 'محصول با موفقیت فعال شد');
export const disableProductController = (req, res, next) =>
  changeProductStatus(req, res, next, 'disable', 'محصول با موفقیت غیرفعال شد');

export const deleteProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: { id: product._id },
      message: 'محصول با موفقیت حذف شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCustomerProductListController = async (req, res, next) => {
  try {
    const query = returnFormValidation(productQuerySchema, req.query);
    const result = await ProductService.findCustomerList(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: {
        result: ProductService.formatCustomerList(result.result),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCustomerProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService.findCustomerById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.formatCustomerDetail(product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
