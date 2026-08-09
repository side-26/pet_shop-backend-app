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
  updateProductZodSchema,
} from './products.schema.js';
import { ProductService } from './products.service.js';

export const createProductController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createProductZodSchema, req.body);
    const product = await ProductService.create(
      body,
      req.user?.userId || req.user?.id,
    );
    setSuccessResponse(res, STATUES.CREATED, {
      data: ProductService.format(product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const body = returnFormValidation(updateProductZodSchema, req.body);
    const product = await ProductService.update(
      id,
      body,
      req.user?.userId || req.user?.id,
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.format(product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getProductsController = async (req, res, next) => {
  try {
    const query = returnFormValidation(productQuerySchema, req.query);
    const products = await ProductService.findAll(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.formatMany(products),
      totalRecords: products.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: ProductService.format(product),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteProductController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(productIdSchema, req.params);
    const product = await ProductService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: { id: product._id } });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
