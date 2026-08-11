import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createOrderSchema,
  orderIdSchema,
  orderQuerySchema,
  updateDeliveryStateSchema,
  updateShippingInfoSchema,
} from './orders.schema.js';
import { OrderService } from './orders.service.js';

export const createOrderController = async (req, res, next) => {
  try {
    const { paymentTrackingId } = returnFormValidation(
      createOrderSchema,
      req.body,
    );
    const order = await OrderService.createOrderFromCart(
      req.user,
      paymentTrackingId,
    );
    setSuccessResponse(res, STATUES.CREATED, {
      data: order,
      message: 'سفارش با موفقیت ثبت شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getUserOrderController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const order = await OrderService.getUserOrder(req.user, id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: order });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getUserOrdersController = async (req, res, next) => {
  try {
    const query = returnFormValidation(orderQuerySchema, req.query);
    const result = await OrderService.getUserOrders(req.user, query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: result.result,
      pagination: result.pagination,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getOrdersController = async (req, res, next) => {
  try {
    const query = returnFormValidation(orderQuerySchema, req.query);
    const result = await OrderService.getOrders(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: result.result,
      pagination: result.pagination,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateOrderDeliveryStateController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const { deliveryState } = returnFormValidation(
      updateDeliveryStateSchema,
      req.body,
    );
    const order = await OrderService.updateOrderDeliveryState(
      id,
      deliveryState,
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: order,
      message: 'وضعیت تحویل سفارش با موفقیت به‌روزرسانی شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateOrderShippingInfoController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const shippingInfo = returnFormValidation(
      updateShippingInfoSchema,
      req.body,
    );
    const order = await OrderService.updateOrderShippingInfo(id, shippingInfo);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: order,
      message: 'اطلاعات ارسال سفارش با موفقیت به‌روزرسانی شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
