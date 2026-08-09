import { ROLES, STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import {
  breedIdSchema,
  breedQuerySchema,
  createBreedZodSchema,
  updateBreedZodSchema,
} from './breeds.schema.js';
import { BreedService } from './breeds.service.js';

const getUserId = (user) => user?.userId || user?.id;
const getListQuery = (query, user) => ({
  ...query,
  includeDisabled: user?.role === ROLES.ADMIN && query.includeDisabled,
});

export const createBreedController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createBreedZodSchema, req.body);
    const breed = await BreedService.create(body, getUserId(req.user));
    setSuccessResponse(res, STATUES.CREATED, {
      data: BreedService.format(breed),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateBreedController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(breedIdSchema, req.params);
    const body = returnFormValidation(updateBreedZodSchema, req.body);
    const breed = await BreedService.update(id, body, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.format(breed),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteBreedController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(breedIdSchema, req.params);
    const breed = await BreedService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: { id: breed._id } });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const enableBreedController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(breedIdSchema, req.params);
    const breed = await BreedService.enable(id, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.format(breed),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const disableBreedController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(breedIdSchema, req.params);
    const breed = await BreedService.disable(id, getUserId(req.user));
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.format(breed),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getBreedController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(breedIdSchema, req.params);
    const breed = await BreedService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.format(breed),
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAllBreedsController = async (req, res, next) => {
  try {
    const query = getListQuery(
      returnFormValidation(breedQuerySchema, req.query),
      req.user,
    );
    const breeds = await BreedService.findAll(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.formatMany(breeds),
      totalRecords: breeds.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getAllBreedsWithPaginationController = async (req, res, next) => {
  try {
    const query = getListQuery(
      returnFormValidation(breedQuerySchema, req.query),
      req.user,
    );
    const result = await BreedService.findAllWithPagination(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: BreedService.formatMany(result.result),
      pagination: result.pagination,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
