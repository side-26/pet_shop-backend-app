import { ERROR_CODES, STATUES } from '#configs/constants.js';
import {
  formatCustomerPetDetail,
  formatCustomerPetListItem,
} from '#entities/pets/pets.helpers.js';
import { formatCustomerProductDetail } from '#entities/products/products.helpers.js';
import { setErrorResponse } from '#utils/helpers.js';

import { LandingModel } from './landing.model.js';
import { LANDING_LIMITS } from './landing.constants.js';

const formatPetType = (petType) => ({
  id: petType._id,
  title: petType.title,
  mainImage: petType.mainImage,
  thumbnail: petType.thumbnail,
  summary: petType.description,
});

const formatProduct = (product) => ({
  id: product._id,
  title: product.title,
  mainImage: product.mainImage,
  mainImageThumbnail: product.mainImageThumbnail,
  summary: product.summary,
  price: product.price,
  discountPercentage: product.discountPercentage,
  discountPrice: product.price * (product.discountPercentage / 100),
});

const orderPetsById = (pets, ids) => {
  const petsById = new Map(pets.map((pet) => [String(pet._id), pet]));
  return ids.map((id) => petsById.get(String(id))).filter(Boolean);
};

export class LandingService {
  static async getPetBySlug(slug) {
    const pet = await LandingModel.findPetBySlug(slug);
    if (!pet) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'حیوان یافت نشد',
        code: ERROR_CODES.PET_NOT_FOUND,
      });
    }
    return formatCustomerPetDetail(pet);
  }

  static async getFeaturedPetTypes() {
    const petTypes = await LandingModel.findFeaturedPetTypes();
    return petTypes.map(formatPetType);
  }

  static async getAllPetTypes() {
    const petTypes = await LandingModel.findAllPetTypes();
    return petTypes.map(formatPetType);
  }

  static async getMostPopularPets() {
    const wishlistedPetIds = (
      await LandingModel.findMostWishlistedPetIds(LANDING_LIMITS.POPULAR_PETS)
    ).map(({ petId }) => petId);
    let pets = [];

    if (wishlistedPetIds.length) {
      pets = orderPetsById(
        await LandingModel.findPetsByIds(wishlistedPetIds),
        wishlistedPetIds,
      );
    }

    if (!pets.length) {
      pets = await LandingModel.findMostPopularPets(
        LANDING_LIMITS.POPULAR_PETS,
      );
    }

    if (pets.length < LANDING_LIMITS.MINIMUM_PREFERRED_PETS) {
      const highestPricedPets = await LandingModel.findHighestPricedPets(
        pets.map((pet) => pet._id),
        LANDING_LIMITS.POPULAR_PETS - pets.length,
      );
      pets = [...pets, ...highestPricedPets];
    }

    return pets.map(formatCustomerPetListItem);
  }

  static async getMostDiscountedProducts(limit) {
    const products = await LandingModel.findMostDiscountedProducts(limit);
    return products.map(formatProduct);
  }

  static async getMostPopularProducts() {
    const products = await LandingModel.findMostPopularProducts();
    return products.map(formatProduct);
  }

  static async getProductBySlug(slug) {
    const product = await LandingModel.findProductBySlug(slug);
    if (!product) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'محصول یافت نشد',
        code: ERROR_CODES.PRODUCT_NOT_FOUND,
      });
    }
    return formatCustomerProductDetail(product);
  }
}
