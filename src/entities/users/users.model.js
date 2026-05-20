import mongoose from 'mongoose';

import { userZodSchema } from './users.schema';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String },
    lastName: { type: String },
    phoneNumber: { type: String, required: true, unique: true },

    password: { type: String, required: true },
    logo: { type: String }, // stores file path/URL
    address: { type: String },
    nationalCode: { type: String },
    city: { type: String },
    province: { type: String },
    age: { type: Number }, // new – number field
    orders: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cart: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true },
);

userSchema.pre('save', function (next) {
  const userData = this.toObject();

  // Mongoose defaults are already applied (orders, cart = [])
  const result = userZodSchema.safeParse(userData);

  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    return next(new Error(`Validation failed: ${errorMessages}`));
  }
  next();
});

userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();

  if (update.$set) {
    // Use .partial() so only the provided fields are validated
    const result = userZodSchema.partial().safeParse(update.$set);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      return next(new Error(`Update validation failed: ${errorMessages}`));
    }
  }
  next();
});
export const UserModel = mongoose.model('Users', userSchema);
