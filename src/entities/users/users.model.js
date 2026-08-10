import mongoose from 'mongoose';

import { userZodSchema } from './users.schema.js';

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    password: { type: String, required: true },
    isEnable: { type: Boolean, default: true },
    avatar: { type: String, default: '' },
    address: { type: String, default: '' },
    nationalCode: { type: String, default: '' },
    city: { type: String, default: '' },
    province: { type: String, default: '' },
    postalCode: { type: String, default: '' },
    age: { type: Number, default: null },
    role: { type: String, default: 'customer' },
    orders: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cart: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  {
    timestamps: true, // Apply to when using res.json() (calls .toJSON())
    toJSON: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
    // Apply to when using .toObject() manually
    toObject: {
      transform: (doc, ret) => {
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  },
);

userSchema.pre('save', function () {
  const userData = this.toObject({ transform: false }); // ← include password
  const result = userZodSchema.safeParse(userData);
  if (!result.success) {
    const errorMessages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new Error(`اعتبارسنجی ناموفق بود: ${errorMessages}`);
  }
});

userSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate();

  if (update.$set) {
    // Use .partial() so only the provided fields are validated
    const result = userZodSchema.partial().safeParse(update.$set);
    if (!result.success) {
      const errorMessages = result.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join(', ');
      throw new Error(`اعتبارسنجی به‌روزرسانی ناموفق بود: ${errorMessages}`);
    }
  }
});
export const UserModel = mongoose.model('Users', userSchema);
