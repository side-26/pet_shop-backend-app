import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  customerPetQuerySchema,
  createPetZodSchema,
  petIdSchema,
  petQuerySchema,
  updatePetBaseInfoZodSchema,
  updatePetImagesZodSchema,
  updatePetPriceZodSchema,
} from './pets.schema.js';
import { PetService } from './pets.service.js';

const getUserId = (user) => user?.userId || user?.id;
const updatePetSection = async (
  req,
  res,
  next,
  schema,
  method,
  formatter,
  imageFile,
) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const body = returnFormValidation(schema, req.body);
    const pet = await PetService[method](
      id,
      body,
      getUserId(req.user),
      imageFile,
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService[formatter](pet),
      message: 'اطلاعات حیوان با موفقیت ویرایش شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const createPetController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createPetZodSchema, req.body);
    const pet = await PetService.create(body, getUserId(req.user), req.file);
    setSuccessResponse(res, STATUES.CREATED, {
      data: PetService.formatManagement(pet),
      message: 'حیوان با موفقیت ایجاد شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updatePetController = (req, res, next) =>
  updatePetSection(
    req,
    res,
    next,
    updatePetBaseInfoZodSchema,
    'updateBaseInfo',
    'formatBaseInfo',
  );

export const updatePetImagesController = (req, res, next) =>
  updatePetSection(
    req,
    res,
    next,
    updatePetImagesZodSchema,
    'updateImages',
    'formatImages',
    req.file,
  );

export const updatePetPriceController = (req, res, next) =>
  updatePetSection(
    req,
    res,
    next,
    updatePetPriceZodSchema,
    'updatePrice',
    'formatPrice',
  );

export const getManagementPetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService.findManagementById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService.formatManagement(pet),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getManagementPetListController = async (req, res, next) => {
  try {
    const query = returnFormValidation(petQuerySchema, req.query);
    const result = await PetService.findManagementList(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: {
        result: PetService.formatManagementMany(result.result),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

const getPetSection = async (req, res, next, method, formatter) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService[method](id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService[formatter](pet),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetImagesController = (req, res, next) =>
  getPetSection(req, res, next, 'findImagesById', 'formatImages');

export const getPetPriceController = (req, res, next) =>
  getPetSection(req, res, next, 'findPriceById', 'formatPrice');

export const getPetBaseInfoController = (req, res, next) =>
  getPetSection(req, res, next, 'findBaseInfoById', 'formatBaseInfo');

const changePetStatus = async (req, res, next, method, message) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService[method](id, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService.formatManagement(pet),
      message,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const enablePetController = (req, res, next) =>
  changePetStatus(req, res, next, 'enable', 'حیوان با موفقیت فعال شد');
export const disablePetController = (req, res, next) =>
  changePetStatus(req, res, next, 'disable', 'حیوان با موفقیت غیرفعال شد');

export const deletePetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: { id: pet._id },
      message: 'حیوان با موفقیت حذف شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCustomerPetListController = async (req, res, next) => {
  try {
    const query = returnFormValidation(petQuerySchema, req.query);
    const result = await PetService.findCustomerList(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: {
        result: PetService.formatCustomerList(result.result),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCustomerPetPaginateController = async (req, res, next) => {
  try {
    const query = returnFormValidation(customerPetQuerySchema, req.query);
    const result = await PetService.findCustomerList(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: {
        result: PetService.formatCustomerDetails(result.result),
        pagination: result.pagination,
      },
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getCustomerPetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService.findCustomerById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService.formatCustomerDetail(pet),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
