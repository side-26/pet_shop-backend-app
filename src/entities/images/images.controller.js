import { STATUES } from '#configs/constants.js';
import {
  onCatchPromiseController,
  returnFormValidation,
  setSuccessResponse,
} from '#utils/helpers.js';

import { deleteImageSchema } from './images.schema.js';
import { ImagesService } from './images.service.js';

export const uploadImageController = async (req, res, next) => {
  try {
    const imageUrl = await ImagesService.upload(req.file);
    setSuccessResponse(res, STATUES.CREATED, {
      data: { imageUrl },
      message: 'تصویر با موفقیت بارگذاری شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};

export const deleteImageController = async (req, res, next) => {
  try {
    const { imageUrl } = returnFormValidation(deleteImageSchema, req.body);
    await ImagesService.delete(imageUrl);
    setSuccessResponse(res, STATUES.SUCCESS, {
      message: 'تصویر با موفقیت حذف شد',
    });
  } catch (error) {
    onCatchPromiseController(error, next);
  }
};
