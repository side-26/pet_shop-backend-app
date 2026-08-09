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
} from './pet.schema.js';
import { PetService } from './pet.service.js';

export const createPetController = async (req, res, next) => {
  try {
    const body = returnFormValidation(createPetZodSchema, req.body);
    const pet = await PetService.create(body, req.user?.id);
    setSuccessResponse(res, STATUES.CREATED, { data: PetService.format(pet) });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updatePetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const body = returnFormValidation(updatePetZodSchema, req.body);
    const pet = await PetService.update(id, body, req.user?.id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: PetService.format(pet) });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService.findById(id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: PetService.format(pet) });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const getPetsController = async (req, res, next) => {
  try {
    const query = returnFormValidation(petQuerySchema, req.query);
    const pets = await PetService.findAll(query);
    setSuccessResponse(res, STATUES.SUCCESS, {
      data: PetService.formatMany(pets),
      totalRecords: pets.length,
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deletePetController = async (req, res, next) => {
  try {
    const { id } = returnFormValidation(petIdSchema, req.params);
    const pet = await PetService.delete(id);
    setSuccessResponse(res, STATUES.SUCCESS, { data: { id: pet._id } });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
