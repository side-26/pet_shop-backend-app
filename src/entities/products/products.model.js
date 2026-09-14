import mongoose from 'mongoose';

import { PRODUCT_LIMITS } from '#configs/constants.js';

import {
  productPersistedZodSchema,
  productModelUpdateZodSchema,
} from './products.schema.js';

const productSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= PRODUCT_LIMITS.MAX_IMAGES,
        message: 'تعداد تصاویر بیشتر از حد مجاز است',
      },
    },
    mainImageThumbnail: {
      type: String,
      required: true,
      trim: true,
      maxlength: PRODUCT_LIMITS.MAX_THUMBNAIL_LENGTH,
    },
    summary: { type: String, trim: true, maxlength: 500, default: undefined },
    description: { type: mongoose.Schema.Types.Mixed, required: true },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Categories',
      required: true,
      index: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
      index: true,
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategories',
      default: undefined,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    weights: {
      type: [
        {
          metric: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20,
            default: 'KG',
          },
          quantity: {
            type: Number,
            required: true,
            min: 0,
            validate: Number.isInteger,
          },
          value: { type: Number, required: true, min: 0 },
        },
      ],
      default: [],
    },
    userRate: { type: Number, required: true, min: 0, max: 5, default: 0 },
    propertyDefinitions: { type: [mongoose.Schema.Types.Mixed], default: [] },
    salesVolume: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
    discountPercentage: {
      type: Number,
      required: true,
      min: PRODUCT_LIMITS.MIN_DISCOUNT_PERCENTAGE,
      max: PRODUCT_LIMITS.MAX_DISCOUNT_PERCENTAGE,
      default: 0,
    },
    isEnable: { type: Boolean, required: true, default: true, index: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  },
  {
    timestamps: true,
    toJSON: { transform: (document, value) => (delete value.__v, value) },
    toObject: { transform: (document, value) => (delete value.__v, value) },
  },
);

const validateProductData = (schema, data, message) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('، ');
    throw new Error(`${message}: ${details}`);
  }
};

productSchema.pre('validate', function () {
  if (!this.slug && this.title) {
    const generatedSlug = this.title
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .substring(0, 150);
    this.slug = generatedSlug
      ? `${generatedSlug}-${this._id.toString().slice(-8)}`
      : `product-${this._id.toString().slice(-8)}`;
  }
});

productSchema.pre('save', function () {
  if (this.isModified('weights')) {
    this.quantity = this.weights.reduce(
      (total, weight) => total + weight.quantity,
      0,
    );
  }
  validateProductData(
    productPersistedZodSchema,
    {
      title: this.title,
      mainImage: this.mainImage,
      images: this.images,
      mainImageThumbnail: this.mainImageThumbnail,
      summary: this.summary,
      description: this.description,
      category: this.category?.toString(),
      brand: this.brand?.toString(),
      subCategory: this.subCategory?.toString(),
      quantity: this.quantity,
      weights: this.weights,
      userRate: this.userRate,
      propertyDefinitions: this.propertyDefinitions,
      salesVolume: this.salesVolume,
      price: this.price,
      discountPercentage: this.discountPercentage,
      isEnable: this.isEnable,
      slug: this.slug,
    },
    'اعتبارسنجی محصول ناموفق بود',
  );
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const data = { ...(update?.$set || update || {}) };
  if (data.category) data.category = data.category.toString();
  if (data.brand) data.brand = data.brand.toString();
  if (data.subCategory) data.subCategory = data.subCategory.toString();
  validateProductData(
    productModelUpdateZodSchema,
    data,
    'اعتبارسنجی ویرایش محصول ناموفق بود',
  );
});

productSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const weights = update?.$set?.weights || update?.weights;
  if (weights) {
    const quantity = weights.reduce(
      (total, weight) => total + weight.quantity,
      0,
    );
    this.set({ quantity });
  }
});

productSchema.index({ isEnable: 1, category: 1, brand: 1, subCategory: 1 });
productSchema.index({ title: 'text', summary: 'text' });

export const ProductModel = mongoose.model('Products', productSchema);
