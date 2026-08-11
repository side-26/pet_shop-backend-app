import mongoose from 'mongoose';

const provinceSchema = new mongoose.Schema(
  {
    provinceId: { type: Number, required: true, unique: true },
    title: { type: String, trim: true },
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
