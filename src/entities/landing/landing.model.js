import { PetModel } from '#entities/pets/pets.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { ProductModel } from '#entities/products/products.model.js';

import { LANDING_LIMITS } from './landing.constants.js';

export class LandingModel {
  static findPetBySlug(slug) {
    return PetModel.findOne({ slug, inEnable: true }).populate([
      { path: 'petType' },
      { path: 'breed' },
    ]);
  }

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

  static findMostDiscountedProducts(limit) {
    return ProductModel.find({ isEnable: true })
      .sort({ discountPercentage: -1, title: 1, _id: 1 })
      .limit(limit);
  }

  static findMostPopularProducts() {
    return ProductModel.find({ isEnable: true })
      .sort({ salesVolume: -1, title: 1, _id: 1 })
      .limit(LANDING_LIMITS.FEATURED_PRODUCTS);
  }

  static findProductBySlug(slug) {
    return ProductModel.findOne({ slug, isEnable: true }).populate([
      { path: 'category' },
      { path: 'subCategory' },
    ]);
  }
}
