import mongoose from 'mongoose';

const petRatingSchema = new mongoose.Schema(
  {
    pet: { type: mongoose.Schema.Types.ObjectId, ref: 'Pets', required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Users',
      required: true,
    },
    value: { type: Number, required: true, min: 0, max: 5 },
  },
  { timestamps: true },
);

petRatingSchema.index({ pet: 1, user: 1 }, { unique: true });

export const PetRatingModel = mongoose.model('PetRatings', petRatingSchema);
