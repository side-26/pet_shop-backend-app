import multer from 'multer';

import { IMAGE_UPLOAD, STATUES } from '#configs/constants.js';

const allowedImageMimeTypes = new Set(IMAGE_UPLOAD.ALLOWED_MIME_TYPES);
const allowedPetTypeImageMimeTypes = new Set(
  IMAGE_UPLOAD.PET_TYPE_ALLOWED_MIME_TYPES,
);

const createImageFileFilter = (allowedMimeTypes) => (_req, file, callback) => {
  if (allowedMimeTypes.has(file.mimetype)) {
    callback(null, true);
    return;
  }

  const error = new Error(
    'فقط تصاویر با فرمت JPEG، PNG، WebP و AVIF مجاز هستند',
  );
  error.statusCode = STATUES.BAD_FORM_VALIDATION;
  error.code = 'UNSUPPORTED_IMAGE_TYPE';
  callback(error);
};

const imageFileFilter = createImageFileFilter(allowedImageMimeTypes);
const petTypeImageFileFilter = createImageFileFilter(
  allowedPetTypeImageMimeTypes,
);

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: petTypeImageFileFilter,
  limits: {
    fileSize: IMAGE_UPLOAD.MAX_FILE_SIZE_BYTES,
    files: IMAGE_UPLOAD.MAX_PET_IMAGES,
    fields: IMAGE_UPLOAD.MAX_MULTIPART_FIELDS,
  },
});

export const petTypeImageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: IMAGE_UPLOAD.MAX_PET_TYPE_IMAGE_SIZE_BYTES,
    files: 1,
    fields: IMAGE_UPLOAD.MAX_MULTIPART_FIELDS,
  },
});
