import { STATUES } from '#configs/constants.js';
import {
  setSuccessResponse,
  returnFormValidation,
  onCatchPromiseController,
  setErrorResponse,
} from '#utils/index.js';
import {
  createPetTypeZodSchema,
  updatePetTypeZodSchema,
} from './petTypes.schema.js';
import {
  doesPetTypeExist,
  getPetTypeById,
  getPetTypeBySlug,
  getAllPetTypes,
  createPetType,
  updatePetType,
  enablePetType,
  disablePetType,
  formatPetTypeResponse,
  formatPetTypesResponse,
} from './petType.utils.js';
import { PetTypeModel } from './petTypes.model.js';

// ============================================
// CREATE PET TYPE
// ============================================
export const createPetTypeController = async (req, res, next) => {
  try {
    // Validate request body
    const body = returnFormValidation(createPetTypeZodSchema, req.body);

    // Check if title already exists
    const existingType = await doesPetTypeExist({
      title: body.title.toLowerCase(),
    });

    if (existingType) {
      // This will throw error via setErrorResponse
    }

    // Create pet type
    const petType = await createPetType(body, req.user?.id);

    setSuccessResponse(res, STATUES.CREATED, {
      message: `نوع حیوان "${petType.title}" با موفقیت ایجاد شد`,
      data: formatPetTypeResponse(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET ALL PET TYPES
// ============================================
export const getAllPetTypesController = async (req, res, next) => {
  try {
    const { includeDisabled } = req.query;

    const petTypes = await getAllPetTypes(includeDisabled === 'true');

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: formatPetTypesResponse(petTypes),
      totalRecords: petTypes.length,
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET PET TYPE BY ID
// ============================================
export const getPetTypeByIdController = async (req, res, next) => {
  try {
    const { id } = req.params;

    const petType = await getPetTypeById(id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: formatPetTypeResponse(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// GET PET TYPE BY SLUG
// ============================================
export const getPetTypeBySlugController = async (req, res, next) => {
  try {
    const { slug } = req.params;

    const petType = await getPetTypeBySlug(slug);

    setSuccessResponse(res, STATUES.SUCCESS, {
      data: formatPetTypeResponse(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// UPDATE PET TYPE
// ============================================
export const updatePetTypeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Validate request body
    const body = returnFormValidation(updatePetTypeZodSchema, req.body);

    // Update pet type
    const petType = await updatePetType(id, body, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت ویرایش شد`,
      data: formatPetTypeResponse(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DISABLE PET TYPE (Soft Delete)
// ============================================
export const disablePetTypeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Disable pet type (soft delete)
    const petType = await disablePetType(id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت غیرفعال شد`,
      data: { id: petType._id, isEnabled: false },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// ENABLE PET TYPE
// ============================================
export const enablePetTypeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Enable pet type
    const petType = await enablePetType(id, req.user?.id);

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت فعال شد`,
      data: formatPetTypeResponse(petType),
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};

// ============================================
// DELETE PET TYPE (Permanent Delete)
// ============================================
export const deletePetTypeController = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Permanent delete
    const petType = await PetTypeModel.findByIdAndDelete(id);

    if (!petType) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'نوع حیوان یافت نشد',
        code: 'PET_TYPE_NOT_FOUND',
      });
    }

    setSuccessResponse(res, STATUES.SUCCESS, {
      message: `نوع حیوان "${petType.title}" با موفقیت حذف شد`,
      data: { id: petType._id },
    });
  } catch (err) {
    onCatchPromiseController(err, next);
  }
};
