import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { updateLandingZodSchema } from './landing.schema.js';
import { LandingService } from './landing.service.js';

export const getLandingController = async (req, res, next) => {
  try {
    const landing = await LandingService.get();
    setSuccessResponse(res, STATUES.SUCCESS, { data: landing });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const updateLandingController = async (req, res, next) => {
  try {
    const body = returnFormValidation(updateLandingZodSchema, req.body);
    const landing = await LandingService.update(
      body,
      req.user?.userId || req.user?.id,
    );
    setSuccessResponse(res, STATUES.SUCCESS, { data: landing });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
