import mongoose from 'mongoose';

import { SHIPPING } from '#configs/constants.js';

export const deliveryWindowSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    startsAt: { type: Date, required: true },
    endsAt: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          return !this.startsAt || value > this.startsAt;
        },
        message: 'زمان پایان بازه ارسال باید بعد از زمان شروع باشد',
      },
    },
    countryCode: {
      type: String,
      required: true,
      enum: [SHIPPING.COUNTRY_CODE],
    },
    timezone: { type: String, required: true, enum: [SHIPPING.TIME_ZONE] },
    label: { type: String, required: true, trim: true },
    shippingPrice: { type: Number, required: true, min: 0 },
    provider: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export const deliveryQuoteSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    addressId: { type: mongoose.Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
    countryCode: {
      type: String,
      required: true,
      enum: [SHIPPING.COUNTRY_CODE],
    },
    timezone: { type: String, required: true, enum: [SHIPPING.TIME_ZONE] },
    options: {
      type: [deliveryWindowSchema],
      required: true,
      validate: {
        validator: (options) => options.length > 0,
        message: 'پیشنهاد ارسال باید حداقل یک بازه زمانی داشته باشد',
      },
    },
  },
  { _id: false },
);
