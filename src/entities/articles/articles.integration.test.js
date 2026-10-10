jest.mock('#middlewares/auth.middleware.js', () => ({
  authenticated: (req, _res, next) => {
    req.user = {
      id: req.get('x-test-user-id'),
      userId: req.get('x-test-user-id'),
      role: req.get('x-test-role') || 'seller',
    };
    next();
  },
}));

jest.mock('#infrastructure/redis/rateLimit/rateLimit.core.js', () => ({
  RateLimiter: class {
    applyTo() {}
  },
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: {
    upload: jest.fn(async (imageFile) => {
      if (!imageFile) {
        const error = new Error('تصویر اصلی باید ارسال شود');
        error.statusCode = 422;
        throw error;
      }
      return {
        key: 'articles/main/article.webp',
        mainImage: 'https://cdn.example.test/articles/article.webp',
        mainImageThumbnail: 'data:image/webp;base64,AAAA',
      };
    }),
    cleanup: jest.fn().mockResolvedValue(undefined),
    getStoredKey: jest.fn().mockReturnValue('articles/main/article.webp'),
  },
}));

import express from 'express';
import request from 'supertest';

import { PetTypeModel } from '#entities/petTypes/petTypes.model.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import { ArticleModel } from './articles.model.js';
import articleRoutes from './articles.route.js';
import { UserModel } from '../users/users.model.js';

describe('Article API', () => {
  let app;
  let seller;
  let anotherSeller;

  const createPayload = {
    title: 'Healthy dogs',
    subtitle: 'A practical guide',
    mainText: { type: 'doc', content: [] },
  };
  const storedArticleFields = {
    mainImage: 'https://cdn.example.test/articles/dogs.webp',
    mainThumbnailImage: 'data:image/webp;base64,AAAA',
    tags: [{ title: 'Dogs' }, { title: 'Health' }],
  };
  const imageBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', articleRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await ArticleModel.deleteMany({});
    await PetTypeModel.deleteMany({});
    await UserModel.deleteMany({});
    seller = await UserModel.create({
      firstName: 'Sara',
      lastName: 'Ahmadi',
      phoneNumber: '09120000001',
      password: 'hashed-password',
      role: 'seller',
      avatar: 'https://cdn.example.test/users/sara.webp',
    });
    anotherSeller = await UserModel.create({
      firstName: 'Ali',
      lastName: 'Karimi',
      phoneNumber: '09120000002',
      password: 'hashed-password',
      role: 'seller',
    });
  });

  const asUser = (requestBuilder, user, role = 'seller') =>
    requestBuilder
      .set('x-test-user-id', user._id.toString())
      .set('x-test-role', role);

  const multipartArticle = (requestBuilder, values = createPayload) => {
    let form = requestBuilder;
    for (const [field, value] of Object.entries(values)) {
      form = form.field(
        field,
        typeof value === 'object' ? JSON.stringify(value) : String(value),
      );
    }
    return form.attach('mainImage', imageBuffer, {
      filename: 'article.png',
      contentType: 'image/png',
    });
  };

  test('creates an article with a server-derived author and previews it publicly', async () => {
    const created = await multipartArticle(
      asUser(request(app).post('/api/articles'), seller),
    ).expect(201);

    expect(created.body.data).toMatchObject({
      slug: 'healthy-dogs',
      mainImage: 'https://cdn.example.test/articles/article.webp',
      mainThumbnailImage: 'data:image/webp;base64,AAAA',
      author: {
        avatar: seller.avatar,
        placeholderImage: '',
        firstName: 'Sara',
        lastName: 'Ahmadi',
      },
    });
    await request(app)
      .get(`/api/articles/${created.body.data.slug}`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.mainText).toEqual(createPayload.mainText),
      );
  });

  test('reads article details and rich text separately by ID', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
      ...storedArticleFields,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });

    const details = await request(app)
      .get(`/api/articles/id/${article._id}`)
      .expect(200);
    expect(details.body.data).not.toHaveProperty('mainText');
    expect(details.body.data).toMatchObject({ id: article._id.toString() });

    const richText = await request(app)
      .get(`/api/articles/id/${article._id}/main-text`)
      .expect(200);
    expect(richText.body.data).toEqual({ mainText: createPayload.mainText });
  });

  test('reads and replaces tags only through dedicated article endpoints', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
      ...storedArticleFields,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });

    await request(app)
      .get(`/api/articles/id/${article._id}/tags-list`)
      .expect(200)
      .expect(({ body }) =>
        expect(body.data).toEqual(storedArticleFields.tags),
      );

    await asUser(
      request(app).put(`/api/articles/id/${article._id}/range-tags-list`),
      seller,
    )
      .send({ tags: [{ title: 'Training' }] })
      .expect(200)
      .expect(({ body }) => expect(body.data).toEqual([{ title: 'Training' }]));

    const updated = await ArticleModel.findById(article._id);
    expect(updated.slug).toBe('healthy-dogs-training');
  });

  test('allows the creating seller to update details and dedicated main text', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
      ...storedArticleFields,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });

    await multipartArticle(
      asUser(request(app).put(`/api/articles/id/${article._id}`), seller),
      { title: 'Better dogs' },
    )
      .expect(200)
      .expect(({ body }) =>
        expect(body.data.slug).toBe('better-dogs-dogs-health'),
      );

    await asUser(
      request(app).put(`/api/articles/id/${article._id}/main-text`),
      seller,
    )
      .send({ mainText: { type: 'doc', content: [{ type: 'paragraph' }] } })
      .expect(200);
  });

  test("returns only the authenticated author's articles", async () => {
    const petType = await PetTypeModel.create({
      title: 'Dog',
      mainImage: 'https://cdn.example.test/pet-types/dog.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
    const [ownedArticle] = await ArticleModel.create([
      {
        ...createPayload,
        ...storedArticleFields,
        title: 'Owned article',
        slug: 'owned-article',
        petType: petType._id,
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
      },
      {
        ...createPayload,
        ...storedArticleFields,
        title: 'Another author article',
        slug: 'another-author-article',
        author: { firstName: 'Ali', lastName: 'Karimi' },
        createdBy: anotherSeller._id,
      },
    ]);

    const response = await asUser(
      request(app).get('/api/articles/all'),
      seller,
    ).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: ownedArticle._id.toString(),
      petType: { title: 'Dog' },
    });
  });

  test('forbids another seller but permits an admin to delete the article', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
      ...storedArticleFields,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });

    await asUser(
      request(app).delete(`/api/articles/id/${article._id}`),
      anotherSeller,
    ).expect(403);
    await asUser(
      request(app).delete(`/api/articles/id/${article._id}`),
      anotherSeller,
      'admin',
    ).expect(200);
    await expect(ArticleModel.findById(article._id)).resolves.toBeNull();
  });

  test('validates mandatory create fields and never accepts author or slug input', async () => {
    await asUser(request(app).post('/api/articles'), seller)
      .send(createPayload)
      .expect(422);

    await multipartArticle(asUser(request(app).post('/api/articles'), seller), {
      title: 'Only a title',
    }).expect(422);

    const response = await multipartArticle(
      asUser(request(app).post('/api/articles'), seller),
      {
        ...createPayload,
        slug: 'forged',
        author: { firstName: 'Forged' },
      },
    ).expect(201);
    expect(response.body.data.slug).toBe('healthy-dogs');
    expect(response.body.data.author.firstName).toBe('Sara');
  });
});
