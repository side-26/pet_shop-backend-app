import mongoose from 'mongoose';

import { PAYMENT_STATUSES } from '#configs/constants.js';

const paymentSchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Orders',
      default: null,
      unique: true,
      sparse: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    checkoutSnapshot: { type: mongoose.Schema.Types.Mixed, required: true },
    authority: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUSES),
      default: PAYMENT_STATUSES.PENDING,
    },
    gatewayReferenceId: { type: String, trim: true, default: null },
    expiresAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ status: 1, expiresAt: 1 });

export const PaymentModel = mongoose.model('Payments', paymentSchema);
