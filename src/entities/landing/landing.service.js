import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { formatCustomerPetDetail } from '#entities/pets/pets.helpers.js';
import { formatCustomerProductDetail } from '#entities/products/products.helpers.js';
import { setErrorResponse } from '#utils/helpers.js';

import { LandingModel } from './landing.model.js';

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
  summary: product.summary,
  price: product.price,
  discountPercentage: product.discountPercentage,
  discountPrice: product.price * (product.discountPercentage / 100),
});

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
