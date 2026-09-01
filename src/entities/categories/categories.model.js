import mongoose from 'mongoose';

import {
  categoryModelUpdateZodSchema,
  createCategoryZodSchema,
} from './categories.schema.js';

const validateCategoryData = (schema, data, message) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('، ');
    throw new Error(`${message}: ${details}`);
  }
};

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },
    petType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetType',
      required: true,
      index: true,
    },
    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },
    mainThumbnailImage: {
      type: String,
      required: true,
      validate: {
        validator(value) {
          return Buffer.byteLength(value, 'utf8') < 10 * 1024;
        },
        message: 'حجم تصویر بندانگشتی باید کمتر از ۱۰ کیلوبایت باشد',
      },
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
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

categorySchema.pre('save', function () {
  validateCategoryData(
    createCategoryZodSchema,
    {
      title: this.title,
      petType: this.petType?.toString(),
      isEnable: this.isEnable,
    },
    'اعتبارسنجی دسته‌بندی ناموفق بود',
  );
});

categorySchema.pre('save', function () {
  if (!this.slug && this.title) {
    const generatedSlug = this.title
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .substring(0, 50);
    const categorySuffix = this.petType?.toString().slice(-8);
    this.slug = generatedSlug
      ? `${generatedSlug}-${categorySuffix}`
      : `category-${this._id.toString().slice(-8)}`;
  }
});

categorySchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  const data = { ...(update?.$set || update || {}) };
  if (data.petType) data.petType = data.petType.toString();
  validateCategoryData(
    categoryModelUpdateZodSchema,
    data,
    'اعتبارسنجی ویرایش دسته‌بندی ناموفق بود',
  );
});

categorySchema.index({ title: 1, petType: 1 }, { unique: true });
categorySchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isEnable: true });
};

export const CategoryModel = mongoose.model('Categories', categorySchema);
