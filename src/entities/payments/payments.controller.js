import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createPaymentSchema,
  paymentAuthoritySchema,
  paymentIdSchema,
  paymentQuerySchema,
  requestPaymentSchema,
  updatePaymentStatusSchema,
} from './payments.schema.js';
import { PaymentService } from './payments.service.js';

export const createPaymentController = async (req, res, next) => {
  try {
    const data = returnFormValidation(createPaymentSchema, req.body);
    const payment = await PaymentService.createPayment(req.user, data);
    setSuccessResponse(res, STATUES.CREATED, {
      data: payment,
      message: 'پرداخت با موفقیت ایجاد شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const requestPaymentController = async (req, res, next) => {
  try {
    returnFormValidation(requestPaymentSchema, req.body);
    const payment = await PaymentService.requestPayment(req.user);
    setSuccessResponse(res, STATUES.CREATED, {
      data: payment,
      message: 'درخواست پرداخت با موفقیت ایجاد شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getUserPaymentController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(paymentIdSchema, req.params);
    const payment = await PaymentService.getUserPayment(req.user, id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: payment });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getGatewayPaymentController = async (req, res, next) => {
  try {
    const { authority } = returnFormValidation(
      paymentAuthoritySchema,
      req.params,
    );
    const payment = await PaymentService.getGatewayPayment(authority);
    setSuccessResponse(res, STATUES.SUCCESS, { data: payment });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const payGatewayPaymentController = async (req, res, next) => {
  try {
    const { authority } = returnFormValidation(
      paymentAuthoritySchema,
      req.params,
    );
    const result = await PaymentService.payGatewayPayment(authority);
    setSuccessResponse(res, STATUES.SUCCESS, { data: result });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const cancelGatewayPaymentController = async (req, res, next) => {
  try {
    const { authority } = returnFormValidation(
      paymentAuthoritySchema,
      req.params,
    );
    await PaymentService.cancelGatewayPayment(authority);
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const respondWithPayments = async (res, serviceCall) => {
  const result = await serviceCall();
  setSuccessResponse(res, STATUES.SUCCESS, {
    data: result.result,
    pagination: result.pagination,
  });
};

export const getUserPaymentsController = async (req, res, next) => {
  try {
    const query = returnFormValidation(paymentQuerySchema, req.query);
    await respondWithPayments(res, () =>
      PaymentService.getUserPayments(req.user, query),
    );
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPaymentsController = async (req, res, next) => {
  try {
    const query = returnFormValidation(paymentQuerySchema, req.query);
    await respondWithPayments(res, () => PaymentService.getPayments(query));
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updatePaymentStatusController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(paymentIdSchema, req.params);
    const data = returnFormValidation(updatePaymentStatusSchema, req.body);
    const payment = await PaymentService.updatePaymentStatus(id, data);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: payment,
      message: 'وضعیت پرداخت با موفقیت به‌روزرسانی شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
