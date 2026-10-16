import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createDeliveryServiceZodSchema,
  deliveryServiceAvailableQueryZodSchema,
  deliveryServiceIdZodSchema,
  deliveryServiceQueryZodSchema,
  updateDeliveryServiceZodSchema,
} from './deliveryServices.schema.js';
import { DeliveryServiceService } from './deliveryServices.service.js';

export const createDeliveryServiceController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createDeliveryServiceZodSchema, req.body);
    const deliveryService = await DeliveryServiceService.create(
      body,
      req.user?.id,
    );
    setSuccessResponse(res, STATUES.CREATED, {
      message: `سرویس ارسال "${deliveryService.title}" با موفقیت ایجاد شد`,
      data: DeliveryServiceService.format(deliveryService),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateDeliveryServiceController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(deliveryServiceIdZodSchema, req.params);
    const body = returnFormValidation(updateDeliveryServiceZodSchema, req.body);
    const deliveryService = await DeliveryServiceService.update(
      id,
      body,
      req.user?.id,
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `سرویس ارسال "${deliveryService.title}" با موفقیت ویرایش شد`,
      data: DeliveryServiceService.format(deliveryService),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAllDeliveryServicesController = async (req, res, next) => {
  try {
    const { includeDisabled } = returnFormValidation(
      deliveryServiceQueryZodSchema,
      req.query,
    );
    const deliveryServices = await DeliveryServiceService.findAll({
      includeDisabled,
    });
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: DeliveryServiceService.formatMany(deliveryServices),
      totalRecords: deliveryServices.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAvailableDeliveryServicesController = async (
  req,
  res,
  next,
) => {
  try {
    const { lat, lng } = returnFormValidation(
      deliveryServiceAvailableQueryZodSchema,
      req.query,
    );
    const deliveryServices =
      await DeliveryServiceService.findAvailableByCoordinates([lng, lat]);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: deliveryServices,
      totalRecords: deliveryServices.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getDeliveryServiceByIdController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(deliveryServiceIdZodSchema, req.params);
    const deliveryService = await DeliveryServiceService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: DeliveryServiceService.format(deliveryService),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const setDeliveryServiceStatus = (isEnable) => async (req, res, next) => {
  try {
    const { id } = returnFormValidation(deliveryServiceIdZodSchema, req.params);
    const deliveryService = isEnable
      ? await DeliveryServiceService.enable(id, req.user?.id)
      : await DeliveryServiceService.disable(id, req.user?.id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `سرویس ارسال "${deliveryService.title}" با موفقیت ${
        isEnable ? 'فعال' : 'غیرفعال'
      } شد`,
      data: DeliveryServiceService.format(deliveryService),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const enableDeliveryServiceController = setDeliveryServiceStatus(true);
export const disableDeliveryServiceController = setDeliveryServiceStatus(false);

export const deleteDeliveryServiceController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(deliveryServiceIdZodSchema, req.params);
    const deliveryService = await DeliveryServiceService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `سرویس ارسال "${deliveryService.title}" با موفقیت حذف شد`,
      data: { id: deliveryService._id },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
