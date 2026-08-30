import mongoose from 'mongoose';

const propertyDefinitionSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      match: /^[a-z][a-zA-Z0-9]*$/,
    },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    valueType: {
      type: String,
      required: true,
      enum: ['string', 'number', 'boolean', 'date', 'enum'],
    },
    required: { type: Boolean, default: false },
    options: { type: [String], default: undefined },
    min: { type: Number, default: undefined },
    max: { type: Number, default: undefined },
    defaultValue: { type: mongoose.Schema.Types.Mixed, default: undefined },
  },
  { _id: false },
);

const petTypeSchema = new mongoose.Schema(
  {
    // Title
    title: {
      type: String,
      required: [true, 'Title is required'],
      unique: true,
      trim: true,
      index: true,
      minlength: [2, 'Title must be at least 2 characters'],
      maxlength: [20, 'Title cannot exceed 20 characters'],
    },

    // Description
    description: {
      type: String,
      trim: true,
      maxlength: [150, 'Description cannot exceed 150 characters'],
      default: '',
    },

    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },

    thumbnail: {
      type: String,
      required: true,
      validate: {
        validator(value) {
          return Buffer.byteLength(value, 'utf8') < 10 * 1024;
        },
        message: 'حجم تصویر بندانگشتی باید کمتر از ۱۰ کیلوبایت باشد',
      },
    },

    // Enable/Disable
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
    },

    propertyDefinitions: {
      type: [propertyDefinitionSchema],
      default: [],
      validate: {
        validator(definitions) {
          return (
            new Set(definitions.map(({ key }) => key)).size ===
            definitions.length
          );
        },
        message: 'Property definition keys must be unique',
      },
    },

    // SEO-friendly slug (auto-generated)
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },

    // Timestamps
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// ============================================
// VIRTUALS
// ============================================

petTypeSchema.virtual('displayName').get(function () {
  return this.title;
});

// ============================================
// MIDDLEWARES
// ============================================

petTypeSchema.pre('save', function () {
  // Auto-generate slug from title
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  }
  // next();
});

// ============================================
// STATIC METHODS
// ============================================

petTypeSchema.statics.getEnabled = function () {
  return this.find({ isEnabled: true }).sort({ createdAt: 1 });
};

petTypeSchema.statics.findBySlug = function (slug) {
  return this.findOne({ slug, isEnabled: true });
};

// ============================================
// INDEXES
// ============================================

petTypeSchema.index({ title: 'text' });

export const PetTypeModel = mongoose.model('PetType', petTypeSchema);
