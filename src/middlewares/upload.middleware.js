import multer from 'multer';

import { IMAGE_UPLOAD, STATUES } from '#configs/constants.js';
import {
  imageUpload,
  petCreateImageUpload,
  petTypeImageUpload,
} from '#configs/upload.config.js';

const MULTER_ERROR_MESSAGES = {
  LIMIT_FILE_SIZE: 'حجم فایل بیشتر از حد مجاز است',
  LIMIT_FILE_COUNT: 'تعداد فایل‌ها بیشتر از حد مجاز است',
  LIMIT_FIELD_COUNT: 'تعداد فیلدها بیشتر از حد مجاز است',
  LIMIT_UNEXPECTED_FILE: 'فیلد فایل ارسال‌شده معتبر نیست',
  LIMIT_PART_COUNT: 'تعداد بخش‌های فرم بیشتر از حد مجاز است',
  LIMIT_FIELD_KEY: 'نام فیلد فرم بیشتر از حد مجاز است',
  LIMIT_FIELD_VALUE: 'مقدار فیلد فرم بیشتر از حد مجاز است',
};

const handleUpload = (uploadMiddleware) => (req, res, next) => {
  uploadMiddleware(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      error.statusCode = STATUES.BAD_FORM_VALIDATION;
      error.message =
        MULTER_ERROR_MESSAGES[error.code] || 'بارگذاری فایل ناموفق بود';
    }

    next(error);
  });
};

export const uploadAvatar = handleUpload(
  imageUpload.single(IMAGE_UPLOAD.AVATAR_FIELD),
);

export const uploadMainImage = handleUpload(
  imageUpload.single(IMAGE_UPLOAD.MAIN_IMAGE_FIELD),
);

export const uploadPetTypeMainImage = handleUpload(
  petTypeImageUpload.single(IMAGE_UPLOAD.MAIN_IMAGE_FIELD),
);

export const uploadBreedMainImage = handleUpload(
  petTypeImageUpload.single(IMAGE_UPLOAD.MAIN_IMAGE_FIELD),
);

export const uploadPetImages = handleUpload(
  imageUpload.array(IMAGE_UPLOAD.PET_IMAGES_FIELD, IMAGE_UPLOAD.MAX_PET_IMAGES),
);

export const uploadPetCreateImages = handleUpload(
  petCreateImageUpload.fields([
    { name: IMAGE_UPLOAD.MAIN_IMAGE_FIELD, maxCount: 1 },
    {
      name: IMAGE_UPLOAD.PET_IMAGES_FIELD,
      maxCount: IMAGE_UPLOAD.MAX_PET_IMAGES,
    },
  ]),
);

export const uploadPetUpdateImages = handleUpload(
  petCreateImageUpload.fields([
    { name: IMAGE_UPLOAD.MAIN_IMAGE_FIELD, maxCount: 1 },
    {
      name: IMAGE_UPLOAD.PET_IMAGES_FIELD,
      maxCount: IMAGE_UPLOAD.MAX_PET_IMAGES,
    },
  ]),
);
