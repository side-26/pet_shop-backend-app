import mongoose from 'mongoose';

import { createDeliveryServiceZodSchema } from './deliveryServices.schema.js';

const validateDeliveryServiceData = (data) => {
  const result = createDeliveryServiceZodSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('، ');
    throw new Error(`اعتبارسنجی سرویس ارسال ناموفق بود: ${details}`);
  }
};

const deliveryServiceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    title_fa: { type: String, required: true, trim: true, maxlength: 100 },
    originCoordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: 'مختصات مبدا سرویس ارسال معتبر نیست',
      },
    },
    basePrice: { type: Number, required: true, min: 0, default: 0 },
    pricePerKilometer: { type: Number, required: true, min: 1 },
    isEnable: { type: Boolean, required: true, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_document, value) => (delete value.__v, value) },
    toObject: { transform: (_document, value) => (delete value.__v, value) },
  },
);

deliveryServiceSchema.pre('validate', function () {
  validateDeliveryServiceData({
    title: this.title,
    title_fa: this.title_fa,
    originCoordinates: this.originCoordinates,
    basePrice: this.basePrice,
    pricePerKilometer: this.pricePerKilometer,
    isEnable: this.isEnable,
  });
});

deliveryServiceSchema.index({ title: 1 }, { unique: true });

export const DeliveryServiceModel = mongoose.model(
  'DeliveryService',
  deliveryServiceSchema,
);
