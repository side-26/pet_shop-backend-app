import { ERROR_CODES, STATUES } from '#configs/constants.js';
import {
  formatCustomerPetDetail,
  formatCustomerPetListItem,
} from '#entities/pets/pets.helpers.js';
import { formatCustomerProductDetail } from '#entities/products/products.helpers.js';
import { setErrorResponse } from '#utils/helpers.js';
import { calculateDiscountedPrice } from '#utils/price.helpers.js';

import { LandingModel } from './landing.model.js';
import {
  FEATURED_PRODUCT_TAGS,
  LANDING_LIMITS,
  LANDING_PRODUCT_LIST_SORT_ORDERS,
} from './landing.constants.js';

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

const formatLandingProductCard = (product) => ({
  ...formatProduct(product),
  slug: product.slug,
  discountPrice: calculateDiscountedPrice(
    product.price,
    product.discountPercentage,
  ),
});

const buildProductListFilter = ({
  category,
  subCategory,
  brand,
  priceFrom,
  priceTo,
}) => {
  const filter = { isEnable: true };
  if (category) filter.category = category;
  if (subCategory) filter.subCategory = subCategory;
  if (brand) filter.brand = brand;
  if (priceFrom !== undefined || priceTo !== undefined) {
    filter.price = {};
    if (priceFrom !== undefined) filter.price.$gte = priceFrom;
    if (priceTo !== undefined) filter.price.$lte = priceTo;
  }
  return filter;
};

const formatPopularBrand = ({ brand, productCount }) => ({
  id: brand._id,
  title: brand.title,
  title_fa: brand.title_fa,
  logo: brand.logo,
  thumbnailLogo: brand.thumbnailLogo,
  slug: brand.slug,
  productCount,
});

const orderPetsById = (pets, ids) => {
  const petsById = new Map(pets.map((pet) => [String(pet._id), pet]));
  return ids.map((id) => petsById.get(String(id))).filter(Boolean);
};

export class LandingService {
  static async getProductList(query) {
    const { page, limit, sort } = query;
    const filter = buildProductListFilter(query);
    const skip = (page - 1) * limit;
    const [products, totalItems] = await Promise.all([
      LandingModel.findProductList(
        filter,
        LANDING_PRODUCT_LIST_SORT_ORDERS[sort],
        skip,
        limit,
      ),
      LandingModel.countProductList(filter),
    ]);
    const totalPages = Math.ceil(totalItems / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      result: products.map(formatLandingProductCard),
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
        nextPage: hasNextPage ? page + 1 : null,
        prevPage: hasPrevPage ? page - 1 : null,
      },
    };
  }

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

  static async getRecentlyUpdatedPets() {
    let pets = await LandingModel.findRecentlyUpdatedPets();
    if (pets.length < LANDING_LIMITS.RECENT_PETS) {
      const highestPricedPets =
        await LandingModel.findHighestPricedAvailablePets(
          pets.map((pet) => pet._id),
          LANDING_LIMITS.RECENT_PETS - pets.length,
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
    return products.map(formatLandingProductCard);
  }

  static async getMostPopularBrands() {
    const brands = await LandingModel.findMostPopularBrands();
    return brands.map(formatPopularBrand);
  }

  static async getFeaturedProducts() {
    const featuredProducts = [];
    const excludedIds = [];
    const selections = [
      [
        FEATURED_PRODUCT_TAGS.MOST_PURCHASED,
        async () => {
          const [product] = await LandingModel.findMostPurchasedProduct([
            ...excludedIds,
          ]);
          return product;
        },
      ],
      [
        FEATURED_PRODUCT_TAGS.MOST_DISCOUNTED,
        () => LandingModel.findMostDiscountedProduct([...excludedIds]),
      ],
      [
        FEATURED_PRODUCT_TAGS.CHEAPEST,
        () => LandingModel.findCheapestProduct([...excludedIds]),
      ],
      [
        FEATURED_PRODUCT_TAGS.MOST_WISHLISTED,
        async () => {
          const [product] = await LandingModel.findMostWishlistedProduct([
            ...excludedIds,
          ]);
          return product;
        },
      ],
    ];

    for (const [tag, findProduct] of selections) {
      const product = await findProduct();
      if (!product) continue;

      excludedIds.push(product._id);
      featuredProducts.push({ tag, product: formatProduct(product) });
    }

    return featuredProducts;
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
