import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { calculateDistanceKm } from './deliveryServices.helpers.js';
import { DeliveryServiceModel } from './deliveryServices.model.js';

export class DeliveryServiceService {
  static escapeRegex(value = '') {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  static async findOne({ title, excludeId } = {}) {
    const query = title
      ? { title: { $regex: `^${this.escapeRegex(title)}$`, $options: 'i' } }
      : {};
    if (excludeId) query._id = { $ne: excludeId };
    return DeliveryServiceModel.findOne(query);
  }

  static async findById(id, throwOnNotFound = true) {
    const deliveryService = await DeliveryServiceModel.findById(id);
    if (!deliveryService && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سرویس ارسال یافت نشد',
        code: ERROR_CODES.DELIVERY_SERVICE_NOT_FOUND,
      });
    }
    return deliveryService;
  }

  static async create(data, userId) {
    const existingDeliveryService = await this.findOne({ title: data.title });
    if (existingDeliveryService) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `سرویس ارسال "${data.title}" قبلاً ثبت شده است`,
        code: ERROR_CODES.DELIVERY_SERVICE_ALREADY_EXISTS,
      });
    }
    return new DeliveryServiceModel({ ...data, createdBy: userId }).save();
  }

  static async update(id, data, userId) {
    const deliveryService = await this.findById(id);
    const existingDeliveryService = await this.findOne({
      title: data.title,
      excludeId: id,
    });
    if (existingDeliveryService) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: `سرویس ارسال "${data.title}" قبلاً ثبت شده است`,
        code: ERROR_CODES.DELIVERY_SERVICE_ALREADY_EXISTS,
      });
    }
    Object.assign(deliveryService, data, { updatedBy: userId });
    return deliveryService.save();
  }

  static async setEnableStatus(id, isEnable, userId) {
    const deliveryService = await this.findById(id);
    deliveryService.isEnable = isEnable;
    deliveryService.updatedBy = userId;
    return deliveryService.save();
  }

  static async enable(id, userId) {
    return this.setEnableStatus(id, true, userId);
  }

  static async disable(id, userId) {
    return this.setEnableStatus(id, false, userId);
  }

  static async delete(id) {
    const deliveryService = await DeliveryServiceModel.findByIdAndDelete(id);
    if (!deliveryService) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'سرویس ارسال یافت نشد',
        code: ERROR_CODES.DELIVERY_SERVICE_NOT_FOUND,
      });
    }
    return deliveryService;
  }

  static async findAll({ includeDisabled = false } = {}) {
    return DeliveryServiceModel.find(
      includeDisabled ? {} : { isEnable: true },
    ).sort({ createdAt: 1 });
  }

  static calculateQuote(deliveryService, destinationCoordinates) {
    const distanceKm = calculateDistanceKm(
      deliveryService.originCoordinates,
      destinationCoordinates,
    );
    return {
      distanceKm,
      shippingPrice:
        deliveryService.basePrice +
        deliveryService.packingPrice +
        Math.ceil(distanceKm) * deliveryService.pricePerKilometer,
    };
  }

  static format(deliveryService) {
    if (!deliveryService) return null;
    const value =
      typeof deliveryService.toObject === 'function'
        ? deliveryService.toObject()
        : deliveryService;
    return {
      id: value._id,
      title: value.title,
      title_fa: value.title_fa,
      originCoordinates: value.originCoordinates,
      basePrice: value.basePrice,
      packingPrice: value.packingPrice,
      pricePerKilometer: value.pricePerKilometer,
      isEnable: value.isEnable,
      createdBy: value.createdBy,
      updatedBy: value.updatedBy,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  static formatMany(deliveryServices) {
    return deliveryServices.map((deliveryService) =>
      this.format(deliveryService),
    );
  }
}
