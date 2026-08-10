import mongoose from 'mongoose';

import { BREED_LEVELS } from '#configs/constants.js';

import {
  breedModelUpdateZodSchema,
  createBreedZodSchema,
} from './breeds.schema.js';

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
    },
    'اعتبارسنجی نژاد ناموفق بود',
  );
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

export const BreedModel = mongoose.model('Breeds', breedSchema);
