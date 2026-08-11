import mongoose from 'mongoose';

import {
  CART_PAYMENT_TYPES,
  ORDER_DELIVERY_STATES,
  ORDER_IDENTIFIER,
  USER_ITEM_TYPES,
} from '#configs/constants.js';

const orderItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref() {
        return this.itemType === USER_ITEM_TYPES.PRODUCT ? 'Products' : 'Pets';
      },
    },
    itemType: {
      type: String,
      required: true,
      enum: Object.values(USER_ITEM_TYPES),
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: Number.isInteger,
    },
    price: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, min: 0, max: 100 },
    title: { type: String, required: true, trim: true },
    mainImage: { type: String, required: true, trim: true },
    mainImageThumbnail: { type: String, required: true, trim: true },
  },
  { _id: true },
);

const addressSnapshotSchema = new mongoose.Schema(
  {
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true },
    province: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    detailAddress: { type: String, required: true, trim: true },
    plate: { type: String, required: true, trim: true },
    unit: { type: String, default: null, trim: true },
    postalCode: { type: String, required: true },
    receiverIsMe: { type: Boolean, required: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    nationalCode: { type: String, required: true },
    phoneNumber: { type: String, required: true },
  },
  { _id: false },
);

const shippingInfoSchema = new mongoose.Schema(
  {
    name: { type: String, default: '', trim: true },
    trackingCode: { type: String, default: '', trim: true },
    estimateDeliveryDate: { type: Date, default: null },
  },
  { _id: false },
);

const numericIdentifier = {
  type: String,
  required: true,
  unique: true,
  match: new RegExp(`^\\d{${ORDER_IDENTIFIER.LENGTH}}$`),
};

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    trackingCode: numericIdentifier,
    orderNumber: numericIdentifier,
    deliveryState: {
      type: Number,
      required: true,
      enum: ORDER_DELIVERY_STATES,
      default: ORDER_DELIVERY_STATES[0],
    },
    paymentTrackingId: { type: String, required: true, trim: true },
    totalPrice: { type: Number, required: true, min: 0 },
    items: { type: [orderItemSchema], required: true },
    discountPrice: { type: Number, required: true, min: 0 },
    userAddress: { type: addressSnapshotSchema, required: true },
    deliveringDateToShipping: { type: Date, required: true },
    shippingPrice: { type: Number, required: true, min: 0 },
    shippingInfo: {
      type: shippingInfoSchema,
      required: true,
      default: () => ({}),
    },
    paymentType: {
      type: Number,
      required: true,
      enum: Object.values(CART_PAYMENT_TYPES),
    },
    instalmentCompany: { type: mongoose.Schema.Types.ObjectId, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ deliveryState: 1, createdAt: -1 });

export const OrderModel = mongoose.model('Orders', orderSchema);
