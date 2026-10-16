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

  test('gets an article tags and its five closest tag matches by slug', async () => {
    const sourceArticle = await ArticleModel.create({
      ...createPayload,
      ...storedArticleFields,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });
    const [bestMatch] = await ArticleModel.create([
      {
        ...createPayload,
        ...storedArticleFields,
        title: 'Dogs and health',
        slug: 'dogs-and-health',
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
      },
      ...Array.from({ length: 5 }, (_, index) => ({
        ...createPayload,
        ...storedArticleFields,
        title: `Dog care ${index}`,
        slug: `dog-care-${index}`,
        tags: [{ title: 'Dogs' }],
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
      })),
      {
        ...createPayload,
        ...storedArticleFields,
        title: 'Cats only',
        slug: 'cats-only',
        tags: [{ title: 'Cats' }],
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
      },
    ]);

    const response = await request(app)
      .get(`/api/articles/${sourceArticle.slug}/tags-list/matched-articles`)
      .expect(200);

    expect(response.body.data.tags).toEqual(storedArticleFields.tags);
    expect(response.body.data.articles).toHaveLength(5);
    expect(response.body.data.articles[0]).toMatchObject({
      id: bestMatch._id.toString(),
    });
    expect(response.body.data.articles).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: sourceArticle._id.toString() }),
      ]),
    );
    expect(response.body.data.articles).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mainText: expect.anything() }),
      ]),
    );
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

  test('returns paginated articles with populated pet types and counted filters', async () => {
    const [petType, catPetType] = await PetTypeModel.create([
      {
        title: 'Dog',
        mainImage: 'https://cdn.example.test/pet-types/dog.webp',
        thumbnail: 'data:image/webp;base64,AAAA',
      },
      {
        title: 'Cat',
        mainImage: 'https://cdn.example.test/pet-types/cat.webp',
        thumbnail: 'data:image/webp;base64,AAAA',
      },
    ]);
    await PetTypeModel.create({
      title: 'Bird',
      mainImage: 'https://cdn.example.test/pet-types/bird.webp',
      thumbnail: 'data:image/webp;base64,AAAA',
    });
    await ArticleModel.create([
      {
        ...createPayload,
        ...storedArticleFields,
        slug: 'healthy-dogs-dogs-health',
        petType: petType._id,
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
        createdAt: new Date('2026-09-02T00:00:00.000Z'),
      },
      {
        ...createPayload,
        ...storedArticleFields,
        title: 'Dog training',
        slug: 'dog-training',
        tags: [{ title: 'Dogs' }, { title: 'Training' }],
        petType: catPetType._id,
        author: { firstName: 'Ali', lastName: 'Karimi' },
        createdBy: anotherSeller._id,
        createdAt: new Date('2026-09-01T00:00:00.000Z'),
      },
    ]);

    const response = await request(app)
      .get('/api/articles/paginate')
      .query({ page: 1, limit: 2 })
      .expect(200);

    expect(response.body.data.pagination).toMatchObject({
      currentPage: 1,
      totalPages: 1,
      totalItems: 2,
      itemsPerPage: 2,
    });
    expect(response.body.data.result).toHaveLength(2);
    expect(response.body.data.result).toEqual(
      expect.not.arrayContaining([
        expect.objectContaining({ mainText: expect.anything() }),
      ]),
    );
    expect(response.body.data.result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          author: expect.any(Object),
          petType: expect.objectContaining({ title: 'Dog' }),
        }),
      ]),
    );
    expect(response.body.data.metadata).toEqual({
      tags: [
        { title: 'Dogs', count: 2 },
        { title: 'Health', count: 1 },
        { title: 'Training', count: 1 },
      ],
      petTypes: [
        expect.objectContaining({ title: 'Cat', count: 1 }),
        expect.objectContaining({ title: 'Dog', count: 1 }),
      ],
      sort: {
        current: 'newest',
        options: [
          { value: 'newest', label: 'جدیدترین' },
          { value: 'oldest', label: 'قدیمی‌ترین' },
        ],
      },
    });
    expect(response.body.data.metadata.petTypes).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ title: 'Bird' })]),
    );

    const filtered = await request(app)
      .get('/api/articles/paginate')
      .query({
        tags: ['Dogs'],
        petType: petType._id.toString(),
        sort: 'oldest',
      })
      .expect(200);
    expect(filtered.body.data.result).toEqual([
      expect.objectContaining({ slug: 'healthy-dogs-dogs-health' }),
    ]);

    const oldest = await request(app)
      .get('/api/articles/paginate')
      .query({ tags: ['Health', 'Training'], sort: 'oldest', limit: 2 })
      .expect(200);
    expect(oldest.body.data.result.map(({ slug }) => slug)).toEqual([
      'dog-training',
      'healthy-dogs-dogs-health',
    ]);
    expect(oldest.body.data.metadata.sort.current).toBe('oldest');
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
