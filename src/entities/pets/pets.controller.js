import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  createPetZodSchema,
  petIdSchema,
  petQuerySchema,
  updatePetZodSchema,
} from './pets.schema.js';
import { PetService } from './pets.service.js';

const getUserId = (user) => user?.userId || user?.id;
const updatePet = async (req, res, next, method) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const body = returnFormValidation(updatePetZodSchema, req.body);
    const pet = await PetService[method](
      id,
      body,
      getUserId(req.user),
      req.file,
    );
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService.formatManagement(pet),
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
  updatePet(req, res, next, 'update');
export const editPetController = (req, res, next) =>
  updatePet(req, res, next, 'edit');

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
      data: PetService.formatManagementMany(result.result),
      pagination: result.pagination,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

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
      data: PetService.formatCustomerList(result.result),
      pagination: result.pagination,
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
