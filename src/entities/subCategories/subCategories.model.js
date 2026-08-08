import mongoose from 'mongoose';

import {
  createSubCategoryZodSchema,
  subCategoryModelUpdateZodSchema,
} from './subCategories.schema.js';

const subCategorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,

    toJSON: {
      transform: (doc, ret) => {
        delete ret.__v;

        return ret;
      },
    },

    toObject: {
      transform: (doc, ret) => {
        delete ret.__v;

        return ret;
      },
    },
  },
);

// ============================================
// CREATE VALIDATION
// ============================================

subCategorySchema.pre('save', function () {
  const data = {
    title: this.title,

    category: this.category?.toString(),
  };

  const result = createSubCategoryZodSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Validation failed: ${errors}`);
  }
});

// ============================================
// UPDATE VALIDATION
// ============================================

subCategorySchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();

  const updateData = update?.$set || update;

  if (!updateData) {
    return;
  }

  const validationData = {
    ...updateData,
  };

  if (validationData.category) {
    validationData.category = validationData.category.toString();
  }

  const result = subCategoryModelUpdateZodSchema.safeParse(validationData);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Update validation failed: ${errors}`);
  }
});

// ============================================
// UNIQUE CATEGORY + TITLE
// ============================================

subCategorySchema.index(
  {
    title: 1,
    category: 1,
  },
  {
    unique: true,
  },
);

export const SubCategoryModel = mongoose.model(
  'SubCategories',
  subCategorySchema,
);
