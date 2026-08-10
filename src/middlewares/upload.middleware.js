import multer from 'multer';

import { IMAGE_UPLOAD, STATUES } from '#configs/constants.js';
import { imageUpload } from '#configs/upload.config.js';

const handleUpload = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      error.statusCode = STATUES.BAD_FORM_VALIDATION;
    }

    next(error);
  });
};

export const uploadAvatar = handleUpload(
  imageUpload.single(IMAGE_UPLOAD.AVATAR_FIELD),
);

export const uploadPetImages = handleUpload(
  imageUpload.array(IMAGE_UPLOAD.PET_IMAGES_FIELD, IMAGE_UPLOAD.MAX_PET_IMAGES),
);
