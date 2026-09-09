import { MANAGEMENT_ROLES, USER_ITEM_TYPES } from '#configs/constants.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { UserModel } from '#entities/users/users.model.js';

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

  static findMostWishlistedPetIds(limit) {
    return UserModel.aggregate([
      { $match: { role: { $nin: MANAGEMENT_ROLES } } },
      { $unwind: '$wishlist' },
      { $match: { 'wishlist.itemType': USER_ITEM_TYPES.PET } },
      { $group: { _id: '$wishlist.item', likes: { $sum: 1 } } },
      { $sort: { likes: -1, _id: 1 } },
      {
        $lookup: {
          from: PetModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'pet',
        },
      },
      { $unwind: '$pet' },
      { $match: { 'pet.inEnable': true } },
      { $limit: limit },
      { $project: { _id: 0, petId: '$_id' } },
    ]);
  }

  static findPetsByIds(ids) {
    return PetModel.find({ _id: { $in: ids }, inEnable: true }).populate([
      { path: 'petType' },
      { path: 'breed' },
    ]);
  }

  static findMostPopularPets(limit) {
    return PetModel.find({ inEnable: true })
      .sort({ salesVolume: -1, title: 1, _id: 1 })
      .limit(limit)
      .populate([{ path: 'petType' }, { path: 'breed' }]);
  }

  static findHighestPricedPets(excludedIds, limit) {
    return PetModel.find({
      _id: { $nin: excludedIds },
      inEnable: true,
    })
      .sort({ price: -1, title: 1, _id: 1 })
      .limit(limit)
      .populate([{ path: 'petType' }, { path: 'breed' }]);
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
      { path: 'brand' },
      { path: 'subCategory' },
    ]);
  }
}
