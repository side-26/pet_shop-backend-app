import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { reverseGeocodingQuerySchema } from './reverseGeocoding.schema.js';
import { ReverseGeocodingService } from './reverseGeocoding.service.js';

export const reverseGeocodeController = async (req, res, next) => {
  try {
    const coordinates = returnFormValidation(
      reverseGeocodingQuerySchema,
      req.query,
    );
    const location = await ReverseGeocodingService.reverseGeocode(coordinates);
    setSuccessResponse(res, STATUES.SUCCESS, { data: location });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
