jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, res, next) => {
    void res;
    req.user = { role: global.__TEST_IMAGE_ROLE__ };
    next();
  },
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: { uploadImage: jest.fn() },
}));

jest.mock('#services/objectStorage.service.js', () => ({
  ObjectStorageService: {
    deleteObject: jest.fn(),
    getObjectKeyFromUrl: jest.fn(),
  },
}));

import express from 'express';
import request from 'supertest';

import { ROLES, STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';
import { MainImageService } from '#services/mainImage.service.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';

import imageRoutes from './images.route.js';

describe('Images API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', imageRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    global.__TEST_IMAGE_ROLE__ = ROLES.ADMIN;
  });

  afterAll(() => {
    delete global.__TEST_IMAGE_ROLE__;
  });

  test('allows management users to upload and delete images', async () => {
    const imageUrl =
      'https://cdn.example.test/management/images/generated.webp';
    MainImageService.uploadImage.mockResolvedValue({ url: imageUrl });
    ObjectStorageService.getObjectKeyFromUrl.mockReturnValue(
      'management/images/generated.webp',
    );
    ObjectStorageService.deleteObject.mockResolvedValue();

    const uploaded = await request(app)
      .post('/api/images')
      .attach('mainImage', Buffer.from('image-bytes'), {
        filename: 'image.png',
        contentType: 'image/png',
      });
    expect(uploaded.status).toBe(STATUES.CREATED);
    expect(uploaded.body.data).toEqual({ imageUrl });
    expect(MainImageService.uploadImage).toHaveBeenCalledWith(
      expect.objectContaining({ fieldname: 'mainImage' }),
      'management/images',
    );

    const deleted = await request(app).delete('/api/images').send({ imageUrl });
    expect(deleted.status).toBe(STATUES.SUCCESS);
    expect(ObjectStorageService.deleteObject).toHaveBeenCalledWith(
      'management/images/generated.webp',
    );
  });

  test('rejects customer access and invalid image URLs', async () => {
    global.__TEST_IMAGE_ROLE__ = ROLES.CUSTOMER;
    await expect(request(app).post('/api/images')).resolves.toMatchObject({
      status: STATUES.NO_ACCESS,
    });

    global.__TEST_IMAGE_ROLE__ = ROLES.SELLER;
    await expect(
      request(app).delete('/api/images').send({ imageUrl: 'not-a-url' }),
    ).resolves.toMatchObject({ status: STATUES.BAD_FORM_VALIDATION });
  });
});
