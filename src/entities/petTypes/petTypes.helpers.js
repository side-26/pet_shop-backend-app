// src/entities/petTypes/petTypes.helpers.js

import { PetTypeModel } from './petTypes.model.js';
import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/index.js';

// ============================================
// CHECK IF PET TYPE EXISTS
// ============================================
export const doesPetTypeExist = async ({ title, ...filter }) => {
  const query = {
    ...filter,
  };

  if (title) {
    query.title = {
      $regex: `^${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
      $options: 'i',
    };
  }

  return PetTypeModel.findOne(query);
};

// ============================================
// GET PET TYPE BY ID
// ============================================
export const getPetTypeById = async (id, throwOnNotFound = true) => {
  const petType = await PetTypeModel.findById(id);
  if (!petType && throwOnNotFound) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'نوع حیوان یافت نشد',
      code: 'PET_TYPE_NOT_FOUND',
    });
  }
  return petType;
};

// ============================================
// GET PET TYPE BY SLUG
// ============================================
export const getPetTypeBySlug = async (slug, throwOnNotFound = true) => {
  const petType = await PetTypeModel.findBySlug(slug);
  if (!petType && throwOnNotFound) {
    setErrorResponse(STATUES.NOT_FOUND, {
      message: 'نوع حیوان یافت نشد',
      code: 'PET_TYPE_NOT_FOUND',
    });
  }
  return petType;
};

// ============================================
// GET ALL PET TYPES
// ============================================
export const getAllPetTypes = async (includeDisabled = false) => {
  const query = includeDisabled ? {} : { isEnabled: true };
  return await PetTypeModel.find(query).sort({ createdAt: 1 });
};

// ============================================
// CREATE PET TYPE
// ============================================
export const createPetType = async (data, userId) => {
  const petType = new PetTypeModel({ ...data, createdBy: userId });
  return await petType.save();
};

// ============================================
// UPDATE PET TYPE
// ============================================
export const updatePetType = async (id, data, userId) => {
  const petType = await getPetTypeById(id);
  Object.assign(petType, data);
  petType.updatedBy = userId;
  return await petType.save();
};

// ============================================
// DISABLE PET TYPE (soft delete) – used by disablePetTypeController
// ============================================
export const disablePetType = async (id, userId) => {
  const petType = await getPetTypeById(id);
  petType.isEnabled = false;
  petType.updatedBy = userId;
  return await petType.save();
};

// ============================================
// ENABLE PET TYPE
// ============================================
export const enablePetType = async (id, userId) => {
  const petType = await getPetTypeById(id);
  petType.isEnabled = true;
  petType.updatedBy = userId;
  return await petType.save();
};

// ============================================
// FORMAT RESPONSE
// ============================================
export const formatPetTypeResponse = (petType) => {
  if (!petType) return null;
  return {
    id: petType._id,
    title: petType.title,
    description: petType.description,
    isEnabled: petType.isEnabled,
    slug: petType.slug,
    createdAt: petType.createdAt,
    updatedAt: petType.updatedAt,
  };
};

export const formatPetTypesResponse = (petTypes) => {
  return petTypes.map((type) => formatPetTypeResponse(type));
};
