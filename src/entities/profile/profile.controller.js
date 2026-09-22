import { STATUES } from '#configs/constants.js';
import {
  addUserAddressSchema,
  editUserAddressSchema,
  userChangePasswordFormBodyValidation,
  userAddressIdSchema,
} from '#entities/users/users.schema.js';
import {
  orderIdSchema,
  orderQuerySchema,
} from '#entities/orders/orders.schema.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { ProfileService } from './profile.service.js';

export const getAccountController = async (req, res, next) => {
  try {
    const account = await ProfileService.getAccount(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, { data: account });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteAvatarController = async (req, res, next) => {
  try {
    const user = await ProfileService.deleteAvatar(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'آواتار با موفقیت حذف شد',
      data: { avatar: user.avatar },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAddressesController = async (req, res, next) => {
  try {
    const addresses = await ProfileService.getAddresses(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: addresses,
      totalRecords: addresses.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAddressByIdController = async (req, res, next) => {
  try {
    const { addressId } = returnFormValidation(userAddressIdSchema, req.params);
    const address = await ProfileService.getAddressById(req.user, addressId);
    setSuccessResponse(res, STATUES.SUCCESS, { data: address });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateAddressController = async (req, res, next) => {
  try {
    const { addressId } = returnFormValidation(userAddressIdSchema, req.params);
    const changes = returnFormValidation(editUserAddressSchema, req.body);
    const address = await ProfileService.updateAddress(
      req.user,
      addressId,
      changes,
    );
    setSuccessResponse(res, STATUES.SUCCESS, { data: address });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const createAddressController = async (req, res, next) => {
  try {
    const addressData = returnFormValidation(addUserAddressSchema, req.body);
    const address = await ProfileService.createAddress(req.user, addressData);
    setSuccessResponse(res, STATUES.CREATED, { data: address });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteAddressController = async (req, res, next) => {
  try {
    const { addressId } = returnFormValidation(userAddressIdSchema, req.params);
    await ProfileService.deleteAddress(req.user, addressId);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'نشانی با موفقیت حذف شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getOrdersController = async (req, res, next) => {
  try {
    const query = returnFormValidation(orderQuerySchema, req.query);
    const result = await ProfileService.getOrders(req.user, query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: result.result,
      pagination: result.pagination,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getOrderByIdController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(orderIdSchema, req.params);
    const order = await ProfileService.getOrderById(req.user, id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: order });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const resetPasswordController = async (req, res, next) => {
  try {
    const body = returnFormValidation(
      userChangePasswordFormBodyValidation,
      req.body,
    );
    await ProfileService.resetPassword(req.user, body);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'کلمه عبور با موفقیت بازنشانی شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
