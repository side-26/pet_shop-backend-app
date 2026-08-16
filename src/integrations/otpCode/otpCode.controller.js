import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { otpCodeBodySchema } from './otpCode.schema.js';
import { OtpCodeService } from './otpCode.service.js';

export const otpCodeController = async (req, res, next) => {
  try {
    const destination = returnFormValidation(otpCodeBodySchema, req.body);
    const result = await OtpCodeService.send(destination);

    setSuccessResponse(res, STATUES.SUCCESS, { data: result });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
