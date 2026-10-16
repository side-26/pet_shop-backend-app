import express from 'express';
import request from 'supertest';

import { IMAGE_UPLOAD, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import {
  uploadAvatar,
  uploadPetCreateImages,
  uploadPetImages,
  uploadPetUpdateImages,
  uploadProductCreateImages,
  uploadProductUpdateImages,
} from '#middlewares/upload.middleware.js';

const createApp = (path, middleware) => {
  const app = express();
  app.post(path, middleware, (req, res) => {
    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
    res.status(STATUES.SUCCESS).json({
      file: req.file?.originalname ?? null,
      files: files.map((file) => file.originalname),
      isBuffer: req.file ? Buffer.isBuffer(req.file.buffer) : null,
    });
  });
  app.use(errorHandler);
  return app;
};

describe('upload middleware', () => {
  it('keeps an avatar image in memory for later processing', async () => {
    const response = await request(createApp('/avatar', uploadAvatar))
      .post('/avatar')
      .attach(IMAGE_UPLOAD.AVATAR_FIELD, Buffer.from('image'), {
        filename: 'avatar.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({
      file: 'avatar.webp',
      files: [],
      isBuffer: true,
    });
  });

  it('accepts multiple pet images up to the configured maximum', async () => {
    let pendingRequest = request(createApp('/pets', uploadPetImages)).post(
      '/pets',
    );

    for (let index = 0; index < IMAGE_UPLOAD.MAX_PET_IMAGES; index += 1) {
      pendingRequest = pendingRequest.attach(
        IMAGE_UPLOAD.IMAGES_FIELD,
        Buffer.from(`image-${index}`),
        {
          filename: `pet-${index}.png`,
          contentType: 'image/png',
        },
      );
    }

    const response = await pendingRequest;

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.files).toHaveLength(IMAGE_UPLOAD.MAX_PET_IMAGES);
  });

  it('accepts one main image and a pet image list during creation', async () => {
    let pendingRequest = request(
      createApp('/pets/create', uploadPetCreateImages),
    )
      .post('/pets/create')
      .attach(IMAGE_UPLOAD.MAIN_IMAGE_FIELD, Buffer.from('main-image'), {
        filename: 'main.png',
        contentType: 'image/png',
      });

    for (let index = 0; index < IMAGE_UPLOAD.MAX_PET_IMAGES; index += 1) {
      pendingRequest = pendingRequest.attach(
        IMAGE_UPLOAD.IMAGES_FIELD,
        Buffer.from(`image-${index}`),
        {
          filename: `pet-${index}.png`,
          contentType: 'image/png',
        },
      );
    }

    const response = await pendingRequest;

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.files).toHaveLength(IMAGE_UPLOAD.MAX_PET_IMAGES + 1);
  });

  it('accepts one replacement main image and a gallery image list during updates', async () => {
    const response = await request(
      createApp('/pets/update-images', uploadPetUpdateImages),
    )
      .post('/pets/update-images')
      .attach(IMAGE_UPLOAD.MAIN_IMAGE_FIELD, Buffer.from('main-image'), {
        filename: 'main.png',
        contentType: 'image/png',
      })
      .attach(IMAGE_UPLOAD.IMAGES_FIELD, Buffer.from('gallery-image'), {
        filename: 'gallery.png',
        contentType: 'image/png',
      });

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.files).toEqual(['main.png', 'gallery.png']);
  });

  it('accepts the configured product main image and gallery sizes', async () => {
    let pendingRequest = request(
      createApp('/products/create', uploadProductCreateImages),
    )
      .post('/products/create')
      .attach(IMAGE_UPLOAD.MAIN_IMAGE_FIELD, Buffer.from('main-image'), {
        filename: 'main.png',
        contentType: 'image/png',
      });

    for (let index = 0; index < IMAGE_UPLOAD.MAX_PRODUCT_IMAGES; index += 1) {
      pendingRequest = pendingRequest.attach(
        IMAGE_UPLOAD.IMAGES_FIELD,
        Buffer.from(`image-${index}`),
        {
          filename: `product-${index}.png`,
          contentType: 'image/png',
        },
      );
    }

    const response = await pendingRequest;

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body.files).toHaveLength(
      IMAGE_UPLOAD.MAX_PRODUCT_IMAGES + 1,
    );
    expect(uploadProductUpdateImages).toBe(uploadProductCreateImages);
  });

  it('rejects unsupported MIME types with the application error shape', async () => {
    const response = await request(createApp('/avatar', uploadAvatar))
      .post('/avatar')
      .attach(IMAGE_UPLOAD.AVATAR_FIELD, Buffer.from('not-an-image'), {
        filename: 'avatar.txt',
        contentType: 'text/plain',
      });

    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.message).toBe(
      'فقط تصاویر با فرمت JPEG، PNG، WebP و AVIF مجاز هستند',
    );
  });

  it('maps Multer limit errors to a validation response', async () => {
    let pendingRequest = request(createApp('/pets', uploadPetImages)).post(
      '/pets',
    );

    for (let index = 0; index <= IMAGE_UPLOAD.MAX_PET_IMAGES; index += 1) {
      pendingRequest = pendingRequest.attach(
        IMAGE_UPLOAD.IMAGES_FIELD,
        Buffer.from(`image-${index}`),
        {
          filename: `pet-${index}.jpeg`,
          contentType: 'image/jpeg',
        },
      );
    }

    const response = await pendingRequest;

    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.message).toBe('تعداد فایل‌ها بیشتر از حد مجاز است');
  });

  it('rejects an image larger than the configured byte limit', async () => {
    const oversizedImage = Buffer.alloc(IMAGE_UPLOAD.MAX_FILE_SIZE_BYTES + 1);

    const response = await request(createApp('/avatar', uploadAvatar))
      .post('/avatar')
      .attach(IMAGE_UPLOAD.AVATAR_FIELD, oversizedImage, {
        filename: 'oversized.webp',
        contentType: 'image/webp',
      });

    expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
    expect(response.body.message).toBe('حجم فایل بیشتر از حد مجاز است');
  });
});
