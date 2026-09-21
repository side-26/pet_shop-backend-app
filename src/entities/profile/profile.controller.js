import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  setSuccessResponse,
} from '#utils/helpers.js';

import { ProfileService } from './profile.service.js';

export const getAccountController = async (req, res, next) => {
  try {
    const account = await ProfileService.getAccount(req.user);
    setSuccessResponse(res, STATUES.SUCCESS, { data: account });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
