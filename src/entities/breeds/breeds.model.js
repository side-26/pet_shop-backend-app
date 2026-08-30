import mongoose from 'mongoose';

import { BREED_LEVELS } from '#configs/constants.js';

import {
  breedModelUpdateZodSchema,
  createBreedZodSchema,
} from './breeds.schema.js';

const propertyDefinitionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      trim: true,
      match: /^[a-z][a-zA-Z0-9]*$/,
      default: undefined,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    valueType: {
      type: String,
      enum: ['string', 'number', 'boolean', 'date', 'enum'],
      default: undefined,
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: undefined },
    value: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const breedSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 100 },
    petType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetType',
      required: true,
      index: true,
    },
    country: { type: String, trim: true, maxlength: 100, default: undefined },
    ageAverage: { type: String, required: true, trim: true, maxlength: 50 },
    size: { type: Number, required: true, enum: BREED_LEVELS },
    activityLevel: {
      type: Number,
      enum: BREED_LEVELS,
      default: undefined,
    },
    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },
    thumbnailImage: {
      type: String,
      required: true,
      validate: {
        validator(value) {
          return Buffer.byteLength(value, 'utf8') < 10 * 1024;
        },
        message: 'حجم تصویر بندانگشتی باید کمتر از ۱۰ کیلوبایت باشد',
      },
    },
    propertyDefinitions: {
      type: [propertyDefinitionSchema],
      default: [],
      validate: {
        validator(definitions) {
          const keys = definitions
            .filter(({ key }) => key)
            .map(({ key }) => key);
          return new Set(keys).size === keys.length;
        },
        message: 'کلید ویژگی‌ها باید یکتا باشد',
      },
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    enable: { type: Boolean, required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  },
  {
    timestamps: true,
    toJSON: { transform: (document, value) => (delete value.__v, value) },
    toObject: { transform: (document, value) => (delete value.__v, value) },
  },
);

const validateBreedData = (schema, data, messagePrefix) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`${messagePrefix}: ${messages}`);
  }
};

breedSchema.pre('save', function () {
  validateBreedData(
    createBreedZodSchema,
    {
      title: this.title,
      petType: this.petType?.toString(),
      country: this.country,
      ageAverage: this.ageAverage,
      size: this.size,
      activityLevel: this.activityLevel,
      enable: this.enable,
      ...(this.propertyDefinitions.every(({ key }) => key)
        ? { propertyDefinitions: this.propertyDefinitions }
        : {}),
    },
    'اعتبارسنجی نژاد ناموفق بود',
  );
});

breedSchema.pre('save', function () {
  if (!this.slug && this.title) {
    const generatedSlug = this.title
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .substring(0, 50);

    this.slug = generatedSlug || `breed-${this._id.toString().slice(-8)}`;
  }
});

breedSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  validateBreedData(
    breedModelUpdateZodSchema,
    update?.$set || update || {},
    'اعتبارسنجی ویرایش نژاد ناموفق بود',
  );
});

breedSchema.index({ title: 1, petType: 1 }, { unique: true });
breedSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, enable: true });
};

export const BreedModel = mongoose.model('Breeds', breedSchema);
