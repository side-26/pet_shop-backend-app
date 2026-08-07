import mongoose from 'mongoose';

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

    // Enable/Disable
    isEnabled: {
      type: Boolean,
      default: true,
      index: true,
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

petTypeSchema.pre('save', function (next) {
  // Auto-generate slug from title
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 20);
  }
  next();
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
petTypeSchema.index({ isEnabled: 1 });

export const PetTypeModel = mongoose.model('PetType', petTypeSchema);
