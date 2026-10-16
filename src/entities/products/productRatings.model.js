import mongoose from 'mongoose';

const productRatingSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    value: { type: Number, required: true, min: 0, max: 5 },
  },
  { timestamps: true },
);

productRatingSchema.index({ product: 1, user: 1 }, { unique: true });

export const ProductRatingModel = mongoose.model(
  'ProductRatings',
  productRatingSchema,
);
