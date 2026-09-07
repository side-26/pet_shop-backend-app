import { LandingModel } from './landing.model.js';

const formatPetType = (petType) => ({
  id: petType._id,
  title: petType.title,
  mainImage: petType.mainImage,
  summary: petType.description,
});

const formatProduct = (product) => ({
  id: product._id,
  title: product.title,
  mainImage: product.mainImage,
  summary: product.summary,
  price: product.price,
  discountPercentage: product.discountPercentage,
});

export class LandingService {
  static async getFeaturedPetTypes() {
    const petTypes = await LandingModel.findFeaturedPetTypes();
    return petTypes.map(formatPetType);
  }

  static async getAllPetTypes() {
    const petTypes = await LandingModel.findAllPetTypes();
    return petTypes.map(formatPetType);
  }

  static async getMostDiscountedProducts() {
    const products = await LandingModel.findMostDiscountedProducts();
    return products.map(formatProduct);
  }

  static async getMostPopularProducts() {
    const products = await LandingModel.findMostPopularProducts();
    return products.map(formatProduct);
  }
}
