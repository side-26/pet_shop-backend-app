import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { ProductModel } from '#entities/products/products.model.js';

import { LANDING_LIMITS } from './landing.constants.js';

export class LandingModel {
  static findFeaturedPetTypes() {
    return PetTypeModel.find({ isEnabled: true })
      .sort({ createdAt: 1, _id: 1 })
      .limit(LANDING_LIMITS.FEATURED_PET_TYPES);
  }

  static findAllPetTypes() {
    return PetTypeModel.find({ isEnabled: true }).sort({
      createdAt: 1,
      _id: 1,
    });
  }

  static findMostDiscountedProducts() {
    return ProductModel.find({ isEnable: true })
      .sort({ discountPercentage: -1, title: 1, _id: 1 })
      .limit(LANDING_LIMITS.FEATURED_PRODUCTS);
  }

  static findMostPopularProducts() {
    return ProductModel.find({ isEnable: true })
      .sort({ salesVolume: -1, title: 1, _id: 1 })
      .limit(LANDING_LIMITS.FEATURED_PRODUCTS);
  }
}
