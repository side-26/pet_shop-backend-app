import { CityModel, ProvinceModel } from './locations.model.js';

export class LocationsService {
  static getAllProvinces() {
    return ProvinceModel.find({}).sort({ title: 1 }).lean();
  }

  static getCitiesByProvinceId(provinceId) {
    return CityModel.find({ provinceId }).sort({ title: 1 }).lean();
  }
}
