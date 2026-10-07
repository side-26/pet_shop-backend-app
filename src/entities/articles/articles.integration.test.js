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

import express from 'express';
import request from 'supertest';

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
    mainImage: 'https://cdn.example.test/articles/dogs.webp',
    mainThumbnailImage: 'data:image/webp;base64,AAAA',
    mainText: { type: 'doc', content: [] },
    tags: [{ title: 'Dogs' }, { title: 'Health' }],
  };

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', articleRoutes);
    app.use(errorHandler);
  });

  beforeEach(async () => {
    await ArticleModel.deleteMany({});
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

  test('creates an article with a server-derived author and previews it publicly', async () => {
    const created = await asUser(request(app).post('/api/articles'), seller)
      .send(createPayload)
      .expect(201);

    expect(created.body.data).toMatchObject({
      slug: 'healthy-dogs-dogs-health',
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

  test('allows the creating seller to update details and dedicated main text', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
      slug: 'healthy-dogs-dogs-health',
      author: { firstName: 'Sara', lastName: 'Ahmadi' },
      createdBy: seller._id,
    });

    await asUser(request(app).put(`/api/articles/id/${article._id}`), seller)
      .send({ title: 'Better dogs' })
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
    const [ownedArticle] = await ArticleModel.create([
      {
        ...createPayload,
        title: 'Owned article',
        slug: 'owned-article',
        author: { firstName: 'Sara', lastName: 'Ahmadi' },
        createdBy: seller._id,
      },
      {
        ...createPayload,
        title: 'Another author article',
        slug: 'another-author-article',
        author: { firstName: 'Ali', lastName: 'Karimi' },
        createdBy: anotherSeller._id,
      },
    ]);

    const response = await asUser(
      request(app).get('/api/article/all'),
      seller,
    ).expect(200);

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      id: ownedArticle._id.toString(),
    });
  });

  test('forbids another seller but permits an admin to delete the article', async () => {
    const article = await ArticleModel.create({
      ...createPayload,
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
      .send({ title: 'Only a title' })
      .expect(422);

    const response = await asUser(request(app).post('/api/articles'), seller)
      .send({
        ...createPayload,
        slug: 'forged',
        author: { firstName: 'Forged' },
      })
      .expect(201);
    expect(response.body.data.slug).toBe('healthy-dogs-dogs-health');
    expect(response.body.data.author.firstName).toBe('Sara');
  });
});
