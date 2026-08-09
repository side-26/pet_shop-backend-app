import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createOrderZodSchema,
  orderIdSchema,
  orderQuerySchema,
  updateOrderStatusZodSchema,
} from './orders.schema.js';
import { OrderService } from './orders.service.js';

export const createOrderController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createOrderZodSchema, req.body);
    const order = await OrderService.create(body, req.user);
    setSuccessResponse(res, STATUES.CREATED, {
      data: OrderService.format(order),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getOrdersController = async (req, res, next) => {
  try {
    const query = returnFormValidation(orderQuerySchema, req.query);
    const orders = await OrderService.findAll(query, req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: OrderService.formatMany(orders),
      totalRecords: orders.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getOrderController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const order = await OrderService.findById(id, req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: OrderService.format(order),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateOrderStatusController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const { status } = returnFormValidation(
      updateOrderStatusZodSchema,
      req.body,
    );
    const order = await OrderService.updateStatus(id, status, req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: OrderService.format(order),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteOrderController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const order = await OrderService.delete(id, req.user);
    setSuccessResponse(res, STATUES.SUCCESS, { data: { id: order._id } });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
