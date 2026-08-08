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

    categoryID: {
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
  const subCategoryData = {
    title: this.title,
    categoryID: this.categoryID?.toString(),
  };

  const result = createSubCategoryZodSchema.safeParse(subCategoryData);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Validation failed: ${errorMessages}`);
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

  if (validationData.categoryID) {
    validationData.categoryID = validationData.categoryID.toString();
  }

  const result = subCategoryModelUpdateZodSchema.safeParse(validationData);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Update validation failed: ${errorMessages}`);
  }
});

// ============================================
// INDEXES
// Same sub-category title cannot exist twice
// inside the same category
// ============================================

subCategorySchema.index(
  {
    title: 1,
    categoryID: 1,
  },
  {
    unique: true,
  },
);

export const SubCategoryModel = mongoose.model(
  'SubCategories',
  subCategorySchema,
);
