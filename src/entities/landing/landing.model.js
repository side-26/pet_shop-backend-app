import mongoose from 'mongoose';

const landingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'main' },
    heroTitle: { type: String, trim: true, maxlength: 120, default: '' },
    heroSubtitle: { type: String, trim: true, maxlength: 500, default: '' },
    featuredProductLimit: { type: Number, min: 1, max: 50, default: 8 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' },
  },
  { timestamps: true },
);

export const LandingModel = mongoose.model('Landing', landingSchema);
