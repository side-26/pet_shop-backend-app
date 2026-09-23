import { CityModel, ProvinceModel } from './locations.model.js';
import { DEFAULT_PROVINCES } from './locations.data.js';

const defaultProvinceById = new Map(
  DEFAULT_PROVINCES.map((province) => [province.provinceId, province]),
);

export class LocationsService {
  static async getAllProvinces() {
    const provinces = await ProvinceModel.find({}).sort({ title: 1 }).lean();
    if (!provinces.length) return DEFAULT_PROVINCES;

    return provinces.map((province) => ({
      ...defaultProvinceById.get(province.provinceId),
      ...province,
      latLng:
        province.latLng || defaultProvinceById.get(province.provinceId)?.latLng,
    }));
  }

  static getCitiesByProvinceId(provinceId) {
    return CityModel.find({ provinceId }).sort({ title: 1 }).lean();
  }
}
