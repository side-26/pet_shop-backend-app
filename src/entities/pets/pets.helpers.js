import { BreedService } from '#entities/breeds/breeds.service.js';
import { PetTypeService } from '#entities/petTypes/petTypes.service.js';

export const escapePetRegex = (value = '') =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildPetFilter = (
  { title, petType, breed, quantity, isEnable } = {},
  enabledOnly = false,
) => {
  const filter = {};
  if (enabledOnly) filter.inEnable = true;
  else if (isEnable !== undefined) filter.inEnable = isEnable;
  if (petType) filter.petType = petType;
  if (breed) filter.breed = breed;
  if (quantity !== undefined) filter.quantity = quantity;
  if (title) {
    filter.title = { $regex: escapePetRegex(title), $options: 'i' };
  }
  return filter;
};

const valueOf = (pet) =>
  typeof pet?.toObject === 'function' ? pet.toObject() : pet;

const relationId = (relation) => relation?._id || relation;

export const formatManagementPet = (pet) => {
  if (!pet) return null;
  const value = valueOf(pet);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    images: value.images || [],
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    petType: value.petType?.title
      ? PetTypeService.format(value.petType)
      : relationId(value.petType),
    breed: value.breed?.title
      ? BreedService.format(value.breed)
      : relationId(value.breed),
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    inEnable: value.inEnable,
    slug: value.slug,
    createdBy: value.createdBy,
    updatedBy: value.updatedBy,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
};

export const formatCustomerPetListItem = (pet) => {
  const value = valueOf(pet);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    inEnable: value.inEnable,
    slug: value.slug,
    petType: value.petType?.title,
    breed: value.breed?.title,
  };
};

export const formatCustomerPetDetail = (pet) => {
  const value = valueOf(pet);
  return {
    id: value._id,
    title: value.title,
    mainImage: value.mainImage,
    images: value.images || [],
    mainImageThumbnail: value.mainImageThumbnail,
    summary: value.summary,
    description: value.description,
    quantity: value.quantity,
    price: value.price,
    discountPercentage: value.discountPercentage,
    inEnable: value.inEnable,
    slug: value.slug,
    petType: PetTypeService.format(value.petType),
    breed: BreedService.format(value.breed),
  };
};
