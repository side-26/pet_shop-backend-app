import mongoose from 'mongoose';

import { PET_LIMITS } from '#configs/constants.js';

import {
  petModelUpdateZodSchema,
  petPersistedZodSchema,
} from './pets.schema.js';

const petSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },
    images: {
      type: [String],
      default: [],
      validate: {
        validator: (images) => images.length <= PET_LIMITS.MAX_IMAGES,
        message: 'تعداد تصاویر بیشتر از حد مجاز است',
      },
    },
    mainImageThumbnail: {
      type: String,
      required: true,
      trim: true,
      maxlength: PET_LIMITS.MAX_THUMBNAIL_LENGTH,
    },
    summary: { type: String, trim: true, maxlength: 500, default: undefined },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    petType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetType',
      required: true,
      index: true,
    },
    breed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Breeds',
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true, min: 0, default: 0 },
    price: { type: Number, required: true, min: 0, default: 0 },
    discountPercentage: {
      type: Number,
      required: true,
      min: PET_LIMITS.MIN_DISCOUNT_PERCENTAGE,
      max: PET_LIMITS.MAX_DISCOUNT_PERCENTAGE,
      default: 0,
    },
    enable: { type: Boolean, required: true, index: true },
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

const validatePetData = (schema, data, message) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('، ');
    throw new Error(`${message}: ${details}`);
  }
};

petSchema.pre('save', function () {
  validatePetData(
    petPersistedZodSchema,
    {
      title: this.title,
      mainImage: this.mainImage,
      images: this.images,
      mainImageThumbnail: this.mainImageThumbnail,
      summary: this.summary,
      description: this.description,
      petType: this.petType?.toString(),
      breed: this.breed?.toString(),
      quantity: this.quantity,
      price: this.price,
      discountPercentage: this.discountPercentage,
      enable: this.enable,
      slug: this.slug,
    },
    'اعتبارسنجی حیوان ناموفق بود',
  );
});

petSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();
  validatePetData(
    petModelUpdateZodSchema,
    update?.$set || update || {},
    'اعتبارسنجی ویرایش حیوان ناموفق بود',
  );
});

petSchema.index({ enable: 1, petType: 1, breed: 1 });
petSchema.index({ title: 'text', description: 'text', summary: 'text' });

export const PetModel = mongoose.model('Pets', petSchema);
