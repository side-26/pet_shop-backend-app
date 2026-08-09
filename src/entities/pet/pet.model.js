import mongoose from 'mongoose';

const petSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    petType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetType',
      required: true,
      index: true,
    },
    age: { type: Number, min: 0, max: 200 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    properties: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: () => new Map(),
    },
    isEnabled: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

petSchema.index({ petType: 1, isEnabled: 1 });

export const PetModel = mongoose.model('Pet', petSchema);
