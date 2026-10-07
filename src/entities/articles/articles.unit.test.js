jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');
    error.statusCode = statusCode;
    Object.assign(error, options);
    throw error;
  }),
}));

jest.mock('../petTypes/petTypes.model.js', () => ({
  PetTypeModel: { findById: jest.fn() },
}));

jest.mock('../users/users.model.js', () => ({
  UserModel: { findById: jest.fn() },
}));

jest.mock('./articles.model.js', () => {
  const MockModel = jest.fn().mockImplementation(function (data) {
    Object.assign(this, data);
    this.save = jest.fn().mockResolvedValue(this);
    return this;
  });
  MockModel.findById = jest.fn();
  MockModel.find = jest.fn();
  MockModel.findOne = jest.fn();
  return { ArticleModel: MockModel };
});

import { PetTypeModel } from '../petTypes/petTypes.model.js';
import { UserModel } from '../users/users.model.js';
import { ArticleModel } from './articles.model.js';
import { ArticleService } from './articles.service.js';

describe('ArticleService', () => {
  const data = {
    title: 'Healthy dogs',
    subtitle: 'A practical guide',
    mainImage: 'https://cdn.example.test/articles/dogs.webp',
    mainThumbnailImage: 'data:image/webp;base64,AAAA',
    mainText: { type: 'doc', content: [] },
    tags: [{ title: 'Dogs' }, { title: 'Health' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ArticleModel.findOne.mockResolvedValue(null);
    UserModel.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        avatar: 'https://cdn.example.test/users/author.webp',
        firstName: 'Sara',
        lastName: 'Ahmadi',
      }),
    });
  });

  test('derives a normalized slug from the title and first five tags', () => {
    expect(
      ArticleService.createSlug({
        title: 'Healthy Dogs!',
        tags: [
          { title: 'Food' },
          { title: 'Care' },
          { title: 'Training' },
          { title: 'Puppies' },
          { title: 'Vet' },
          { title: 'Ignored' },
        ],
      }),
    ).toBe('healthy-dogs-food-care-training-puppies-vet');
  });

  test('creates an article with an author snapshot from its creator', async () => {
    const article = await ArticleService.create(data, 'user-id');

    expect(article).toMatchObject({
      createdBy: 'user-id',
      slug: 'healthy-dogs-dogs-health',
      author: {
        avatar: 'https://cdn.example.test/users/author.webp',
        placeholderImage: '',
        firstName: 'Sara',
        lastName: 'Ahmadi',
      },
    });
  });

  test('rejects a duplicate generated slug', async () => {
    ArticleModel.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(ArticleService.create(data, 'user-id')).rejects.toThrow(
      'قبلاً استفاده شده‌اند',
    );
  });

  test('rejects an unknown optional pet type', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      ArticleService.create(
        { ...data, petType: '65a4de97aff1fbb38c437952' },
        'user-id',
      ),
    ).rejects.toThrow('نوع حیوان انتخاب‌شده یافت نشد');
  });

  test('changes the slug only when details include title or tags', async () => {
    const article = {
      _id: 'article-id',
      title: data.title,
      tags: data.tags,
      slug: 'healthy-dogs-dogs-health',
      save: jest.fn().mockResolvedValue(true),
    };

    await ArticleService.updateDetails(
      article,
      { subtitle: 'Updated' },
      'user-id',
    );
    expect(article.slug).toBe('healthy-dogs-dogs-health');

    await ArticleService.updateDetails(
      article,
      { title: 'Better dogs' },
      'user-id',
    );
    expect(article.slug).toBe('better-dogs-dogs-health');
    expect(article.updatedBy).toBe('user-id');
  });

  test('updates only the main text in its dedicated action', async () => {
    const article = { save: jest.fn().mockResolvedValue(true) };
    const mainText = { type: 'doc', content: [{ type: 'paragraph' }] };

    await ArticleService.updateMainText(article, { mainText }, 'user-id');
    expect(article).toMatchObject({ mainText, updatedBy: 'user-id' });
  });

  test('returns an article by ID and reports missing lookup values', async () => {
    const article = { _id: 'article-id' };
    ArticleModel.findById.mockResolvedValue(article);
    ArticleModel.findOne.mockResolvedValue(article);

    await expect(ArticleService.findById('article-id')).resolves.toBe(article);
    await expect(ArticleService.getPreviewBySlug('healthy-dogs')).resolves.toBe(
      article,
    );

    ArticleModel.findById.mockResolvedValue(null);
    ArticleModel.findOne.mockResolvedValue(null);
    await expect(ArticleService.findById('missing')).rejects.toThrow(
      'یافت نشد',
    );
    await expect(ArticleService.getPreviewBySlug('missing')).rejects.toThrow(
      'یافت نشد',
    );
  });

  test("returns only an author's articles with newest first", async () => {
    const articles = [{ _id: 'newer' }, { _id: 'older' }];
    const sort = jest.fn().mockResolvedValue(articles);
    ArticleModel.find.mockReturnValue({ sort });

    await expect(ArticleService.findByAuthor('user-id')).resolves.toBe(
      articles,
    );
    expect(ArticleModel.find).toHaveBeenCalledWith({ createdBy: 'user-id' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  test('deletes the loaded article document', async () => {
    const article = { deleteOne: jest.fn().mockResolvedValue(undefined) };

    await expect(ArticleService.delete(article)).resolves.toBeUndefined();
    expect(article.deleteOne).toHaveBeenCalledTimes(1);
  });
});
