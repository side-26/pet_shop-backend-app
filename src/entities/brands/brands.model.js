import mongoose from 'mongoose';

import { createBrandZodSchema } from './brands.schema.js';

const validateBrandData = (data) => {
  const result = createBrandZodSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('، ');
    throw new Error(`اعتبارسنجی برند ناموفق بود: ${details}`);
  }
};

const brandSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    title_fa: { type: String, required: true, trim: true, maxlength: 100 },
    logo: { type: String, trim: true, maxlength: 2048 },
    thumbnailLogo: {
      type: String,
      validate: {
        validator(value) {
          return !value || Buffer.byteLength(value, 'utf8') < 10 * 1024;
        },
        message: 'حجم لوگوی بندانگشتی باید کمتر از ۱۰ کیلوبایت باشد',
      },
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    isEnable: { type: Boolean, required: true, default: true, index: true },
    description: { type: mongoose.Schema.Types.Mixed, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: { transform: (_document, value) => (delete value.__v, value) },
    toObject: { transform: (_document, value) => (delete value.__v, value) },
  },
);

brandSchema.pre('save', function () {
  validateBrandData({
    title: this.title,
    title_fa: this.title_fa,
    description: this.description,
    isEnable: this.isEnable,
  });
});

brandSchema.pre('save', function () {
  if (!this.slug && this.title) {
    const generatedSlug = this.title
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .substring(0, 80);
    this.slug = generatedSlug || `brand-${this._id.toString().slice(-8)}`;
  }
});

brandSchema.index({ title: 1 }, { unique: true });
brandSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isEnable: true });
};

export const BrandModel = mongoose.model('Brand', brandSchema);
