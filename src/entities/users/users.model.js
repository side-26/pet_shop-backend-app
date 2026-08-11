import mongoose from 'mongoose';

import { USER_ADDRESS_LIMITS, USER_ITEM_TYPES } from '#configs/constants.js';

import { userZodSchema } from './users.schema.js';

const addressSchema = new mongoose.Schema({
  province: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  detailAddress: { type: String, required: true, trim: true },
  plate: { type: String, required: true, trim: true },
  unit: { type: String, default: null, trim: true },
  postalCode: {
    type: String,
    required: true,
    match: /^\d{10}$/,
  },
  receiverIsMe: { type: Boolean, default: false },
  firstName: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  nationalCode: {
    type: String,
    required: true,
    match: /^\d{10}$/,
  },
  phoneNumber: {
    type: String,
    required: true,
    match: /^09\d{9}$/,
  },
});

const itemReference = {
  type: mongoose.Schema.Types.ObjectId,
  required: true,
  ref() {
    return this.itemType === USER_ITEM_TYPES.PRODUCT ? 'Products' : 'Pets';
  },
};

const cartItemSchema = new mongoose.Schema({
  item: itemReference,
  itemType: {
    type: String,
    required: true,
    enum: Object.values(USER_ITEM_TYPES),
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    validate: Number.isInteger,
  },
});

const wishlistItemSchema = new mongoose.Schema({
  item: itemReference,
  itemType: {
    type: String,
    required: true,
    enum: Object.values(USER_ITEM_TYPES),
  },
});

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: '' },
    lastName: { type: String, default: '' },
    phoneNumber: { type: String, required: true, unique: true },
    email: { type: String, default: '' },
    password: { type: String, required: true },
    isEnable: { type: Boolean, default: true },
    avatar: { type: String, default: '' },
    nationalCode: { type: String, default: '' },
    addresses: {
      type: [addressSchema],
      default: [],
      validate: {
        validator: (addresses) =>
          addresses.length <= USER_ADDRESS_LIMITS.MAX_ADDRESSES,
        message: 'حداکثر پنج نشانی قابل ثبت است',
      },
    },
    age: { type: Number, default: null },
    role: { type: String, default: 'customer' },
    orders: { type: [mongoose.Schema.Types.Mixed], default: [] },
    cart: { type: [cartItemSchema], default: [] },
    wishlist: { type: [wishlistItemSchema], default: [] },
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
