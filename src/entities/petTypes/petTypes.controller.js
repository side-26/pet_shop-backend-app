import { STATUES } from '#configs/constants.js';

import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createPetTypeZodSchema,
  updatePetTypeZodSchema,
} from './petTypes.schema.js';

import { PetTypeService } from './petTypes.service.js';

// ============================================
// CREATE
// ============================================

export const createPetTypeController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createPetTypeZodSchema, req.body);

    const petType = await PetTypeService.create(body, req.user?.id, req.file);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `نوع حیوان "${petType.title}" با موفقیت ایجاد شد`,

      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET ALL
// ============================================

export const getAllPetTypesController = async (req, res, next) => {
  try {
    const includeDisabled = req.query.includeDisabled === 'true';

    const petTypes = await PetTypeService.findAll(includeDisabled);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetTypeService.formatMany(petTypes),

      totalRecords: petTypes.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET BY ID
// ============================================

export const getPetTypeByIdController = async (req, res, next) => {
  try {
    const petType = await PetTypeService.findById(req.params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET BY SLUG
// ============================================

export const getPetTypeBySlugController = async (req, res, next) => {
  try {
    const petType = await PetTypeService.findBySlug(req.params.slug);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// UPDATE
// ============================================

export const updatePetTypeController = async (req, res, next) => {
  try {
    const body = returnFormValidation(updatePetTypeZodSchema, req.body);

    const petType = await PetTypeService.update(
      req.params.id,
      body,
      req.user?.id,
      req.file,
    );

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت ویرایش شد`,

      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DISABLE
// ============================================

export const disablePetTypeController = async (req, res, next) => {
  try {
    const petType = await PetTypeService.disable(req.params.id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت غیرفعال شد`,

      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// ENABLE
// ============================================

export const enablePetTypeController = async (req, res, next) => {
  try {
    const petType = await PetTypeService.enable(req.params.id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت فعال شد`,

      data: PetTypeService.format(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DELETE
// ============================================

export const deletePetTypeController = async (req, res, next) => {
  try {
    const petType = await PetTypeService.delete(req.params.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت حذف شد`,

      data: {
        id: petType._id,
      },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
