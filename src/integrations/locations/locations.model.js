import mongoose from 'mongoose';

const provinceSchema = new mongoose.Schema(
  {
    provinceId: { type: Number, required: true, unique: true },
    title: { type: String, trim: true },
    latLng: {
      type: [Number],
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'مختصات استان باید شامل عرض و طول جغرافیایی باشد',
      },
    },
  },
  { collection: 'provinces', strict: false },
);

const citySchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    provinceId: {
      type: Number,
      required: true,
      index: true,
    },
  },
  { collection: 'cities', strict: false },
);

export const ProvinceModel = mongoose.model('Provinces', provinceSchema);
export const CityModel = mongoose.model('Cities', citySchema);
