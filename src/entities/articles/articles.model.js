import mongoose from 'mongoose';

const tagSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 60 },
  },
  { _id: false },
);

const authorSchema = new mongoose.Schema(
  {
    avatar: { type: String, default: '', trim: true, maxlength: 2048 },
    placeholderImage: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2048,
    },
    firstName: { type: String, default: '', trim: true, maxlength: 100 },
    lastName: { type: String, default: '', trim: true, maxlength: 100 },
  },
  { _id: false },
);

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    subtitle: { type: String, required: true, trim: true, maxlength: 240 },
    mainImage: { type: String, required: true, trim: true, maxlength: 2048 },
    mainThumbnailImage: {
      type: String,
      required: true,
      trim: true,
      maxlength: 10240,
    },
    summary: { type: String, default: '', trim: true, maxlength: 600 },
    tags: { type: [tagSchema], default: [] },
    petType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PetType',
      default: null,
    },
    mainText: { type: mongoose.Schema.Types.Mixed, required: true },
    author: { type: authorSchema, required: true },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { transform: (_document, value) => (delete value.__v, value) },
    toObject: { transform: (_document, value) => (delete value.__v, value) },
  },
);

articleSchema.index({ createdAt: -1 });
articleSchema.index({ createdBy: 1, createdAt: -1 });
articleSchema.index({ petType: 1, createdAt: -1 });

export const ArticleModel = mongoose.model('Article', articleSchema);
