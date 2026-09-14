import mongoose from 'mongoose';

import { MANAGEMENT_ROLES, USER_ITEM_TYPES } from '#configs/constants.js';
import { BrandModel } from '#entities/brands/brands.model.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { LANDING_LIMITS } from './landing.constants.js';

export class LandingModel {
  static findProductList(filter, sort, skip, limit) {
    return ProductModel.find(filter).sort(sort).skip(skip).limit(limit);
  }

  static countProductList(filter) {
    return ProductModel.countDocuments(filter);
  }

  static findProductFacetData(filters) {
    const toAggregationFilter = (filter) =>
      Object.fromEntries(
        Object.entries(filter).map(([key, value]) => {
          if (value?.$in) {
            return [
              key,
              {
                $in: value.$in.map((id) => new mongoose.Types.ObjectId(id)),
              },
            ];
          }
          return [key, value];
        }),
      );
    const createCountFacet = (filter, field) => [
      { $match: filter },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ];

    return ProductModel.aggregate([
      {
        $facet: {
          category: createCountFacet(
            toAggregationFilter(filters.category),
            'category',
          ),
          subCategory: createCountFacet(
            toAggregationFilter(filters.subCategory),
            'subCategory',
          ),
          brand: createCountFacet(toAggregationFilter(filters.brand), 'brand'),
          price: [
            { $match: toAggregationFilter(filters.price) },
            {
              $group: {
                _id: null,
                min: { $min: '$price' },
                max: { $max: '$price' },
              },
            },
          ],
          isEnable: [
            { $match: toAggregationFilter(filters.isEnable) },
            { $count: 'count' },
          ],
        },
      },
    ]).then(([facets]) => facets);
  }

  static findFacetCategories(ids) {
    return CategoryModel.find({ _id: { $in: ids }, isEnable: true }).select(
      '_id title',
    );
  }

  static findFacetSubCategories(ids) {
    return SubCategoryModel.find({ _id: { $in: ids } }).select('_id title');
  }

  static findFacetBrands(ids) {
    return BrandModel.find({ _id: { $in: ids }, isEnable: true }).select(
      '_id title title_fa',
    );
  }

  static findPetList(filter, sort, skip, limit) {
    return PetModel.find(filter)
      .populate([{ path: 'petType' }, { path: 'breed' }])
      .sort(sort)
      .skip(skip)
      .limit(limit);
  }
  static countPetList(filter) {
    return PetModel.countDocuments(filter);
  }
  static findPetFacetData(filters) {
    const convert = (filter) =>
      Object.fromEntries(
        Object.entries(filter).map(([key, value]) => [
          key,
          value?.$in
            ? { $in: value.$in.map((id) => new mongoose.Types.ObjectId(id)) }
            : value,
        ]),
      );
    const count = (filter, field) => [
      { $match: convert(filter) },
      { $group: { _id: `$${field}`, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ];
    return PetModel.aggregate([
      {
        $facet: {
          petType: count(filters.petType, 'petType'),
          breed: count(filters.breed, 'breed'),
          price: [
            { $match: convert(filters.price) },
            {
              $group: {
                _id: null,
                min: { $min: '$price' },
                max: { $max: '$price' },
              },
            },
          ],
          isEnable: [
            { $match: convert(filters.isEnable) },
            { $count: 'count' },
          ],
        },
      },
    ]).then(([facets]) => facets);
  }
  static findFacetPetTypes(ids) {
    return PetTypeModel.find({ _id: { $in: ids }, isEnabled: true }).select(
      '_id title',
    );
  }
  static findFacetBreeds(ids) {
    return PetModel.db
      .model('Breeds')
      .find({ _id: { $in: ids } })
      .select('_id title');
  }

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

  static findRecentlyUpdatedPets() {
    return PetModel.find({
      inEnable: true,
      quantity: { $gt: 0 },
      updatedBy: { $exists: true, $ne: null },
    })
      .sort({ updatedAt: -1, _id: -1 })
      .limit(LANDING_LIMITS.RECENT_PETS)
      .populate([{ path: 'petType' }, { path: 'breed' }]);
  }

  static findHighestPricedAvailablePets(excludedIds, limit) {
    return PetModel.find({
      _id: { $nin: excludedIds },
      inEnable: true,
      quantity: { $gt: 0 },
    })
      .sort({ price: -1, title: 1, _id: 1 })
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

  static findMostPopularBrands() {
    return ProductModel.aggregate([
      { $match: { isEnable: true } },
      { $group: { _id: '$brand', productCount: { $sum: 1 } } },
      { $sort: { productCount: -1, _id: 1 } },
      {
        $lookup: {
          from: BrandModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'brand',
        },
      },
      { $unwind: '$brand' },
      { $match: { 'brand.isEnable': true } },
      { $limit: LANDING_LIMITS.POPULAR_BRANDS },
      {
        $project: {
          _id: 0,
          productCount: 1,
          brand: {
            _id: '$brand._id',
            title: '$brand.title',
            title_fa: '$brand.title_fa',
            logo: '$brand.logo',
            thumbnailLogo: '$brand.thumbnailLogo',
            slug: '$brand.slug',
          },
        },
      },
    ]);
  }

  static findMostPurchasedProduct(excludedIds) {
    return OrderModel.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.itemType': USER_ITEM_TYPES.PRODUCT } },
      {
        $group: {
          _id: '$items.item',
          purchasedQuantity: { $sum: '$items.quantity' },
        },
      },
      { $match: { _id: { $nin: excludedIds } } },
      { $sort: { purchasedQuantity: -1, _id: 1 } },
      {
        $lookup: {
          from: ProductModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isEnable': true } },
      { $limit: 1 },
      { $replaceWith: '$product' },
    ]);
  }

  static findMostDiscountedProduct(excludedIds) {
    return ProductModel.findOne({
      _id: { $nin: excludedIds },
      isEnable: true,
    }).sort({ discountPercentage: -1, title: 1, _id: 1 });
  }

  static findCheapestProduct(excludedIds) {
    return ProductModel.findOne({
      _id: { $nin: excludedIds },
      isEnable: true,
    }).sort({ price: 1, title: 1, _id: 1 });
  }

  static findMostWishlistedProduct(excludedIds) {
    return UserModel.aggregate([
      { $match: { role: { $nin: MANAGEMENT_ROLES } } },
      { $unwind: '$wishlist' },
      { $match: { 'wishlist.itemType': USER_ITEM_TYPES.PRODUCT } },
      { $group: { _id: '$wishlist.item', likes: { $sum: 1 } } },
      { $match: { _id: { $nin: excludedIds } } },
      { $sort: { likes: -1, _id: 1 } },
      {
        $lookup: {
          from: ProductModel.collection.name,
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $match: { 'product.isEnable': true } },
      { $limit: 1 },
      { $replaceWith: '$product' },
    ]);
  }

  static findProductBySlug(slug) {
    return ProductModel.findOne({ slug, isEnable: true }).populate([
      { path: 'category' },
      { path: 'brand' },
      { path: 'subCategory' },
    ]);
  }
}
