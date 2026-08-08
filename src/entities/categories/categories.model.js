// src/entities/categories/categories.model.js

import mongoose from 'mongoose';

import {
  createCategoryZodSchema,
  categoryModelUpdateZodSchema,
} from './categories.schema.js';

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

    enable: {
      type: Boolean,
      default: true,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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

categorySchema.pre('save', function () {
  const categoryData = {
    title: this.title,

    // Convert Mongo ObjectId to string for Zod
    petType: this.petType?.toString(),

    enable: this.enable,
  };

  const result = createCategoryZodSchema.safeParse(categoryData);

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

categorySchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();

  const updateData = update?.$set || update;

  if (!updateData) {
    return;
  }

  const validationData = {
    ...updateData,
  };

  if (validationData.petType) {
    validationData.petType = validationData.petType.toString();
  }

  const result = categoryModelUpdateZodSchema.safeParse(validationData);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');

    throw new Error(`Update validation failed: ${errorMessages}`);
  }
});

// ============================================
// INDEXES
// ============================================

categorySchema.index(
  {
    title: 1,
    petType: 1,
  },
  {
    unique: true,
  },
);

export const CategoryModel = mongoose.model('Categories', categorySchema);
