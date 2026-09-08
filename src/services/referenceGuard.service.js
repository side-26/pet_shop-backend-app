import { ERROR_CODES, STATUES } from '#configs/constants.js';
import { BreedModel } from '#entities/breeds/breeds.model.js';
import { CategoryModel } from '#entities/categories/categories.model.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { PetModel } from '#entities/pets/pets.model.js';
import { ProductModel } from '#entities/products/products.model.js';
import { SubCategoryModel } from '#entities/subCategories/subCategories.model.js';
import { UserModel } from '#entities/users/users.model.js';
import { setErrorResponse } from '#utils/helpers.js';

const referenceChecks = {
  petType: (id) => [
    BreedModel.exists({ petType: id }),
    CategoryModel.exists({ petType: id }),
    PetModel.exists({ petType: id }),
  ],
  breed: (id) => [PetModel.exists({ breed: id })],
  category: (id) => [
    SubCategoryModel.exists({ category: id }),
    ProductModel.exists({ category: id }),
  ],
  subCategory: (id) => [ProductModel.exists({ subCategory: id })],
  brand: (id) => [ProductModel.exists({ brand: id })],
  product: (id) => [
    UserModel.exists({ 'cart.items.item': id }),
    UserModel.exists({ 'wishlist.item': id }),
    OrderModel.exists({ 'items.item': id }),
  ],
  pet: (id) => [
    UserModel.exists({ 'cart.items.item': id }),
    UserModel.exists({ 'wishlist.item': id }),
    OrderModel.exists({ 'items.item': id }),
  ],
  user: (id) => [OrderModel.exists({ user: id })],
};

export const assertEntityIsNotReferenced = async (entity, id) => {
  const checks = referenceChecks[entity]?.(id) || [];
  const references = await Promise.all(checks);
  if (references.some(Boolean)) {
    setErrorResponse(STATUES.CONFLICT, {
      message:
        'امکان حذف وجود ندارد؛ این مورد در رکوردهای دیگر استفاده شده است',
      code: ERROR_CODES.ENTITY_IN_USE,
    });
  }
};
