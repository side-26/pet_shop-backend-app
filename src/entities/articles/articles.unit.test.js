jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message || 'خطای سمت سرور');
    error.statusCode = statusCode;
    Object.assign(error, options);
    throw error;
  }),
}));

jest.mock('#services/mainImage.service.js', () => ({
  MainImageService: {
    upload: jest.fn(),
    cleanup: jest.fn(),
    getStoredKey: jest.fn(),
  },
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

import { MainImageService } from '#services/mainImage.service.js';

import { PetTypeModel } from '../petTypes/petTypes.model.js';
import { UserModel } from '../users/users.model.js';
import { ArticleModel } from './articles.model.js';
import { ArticleService } from './articles.service.js';

describe('ArticleService', () => {
  const data = {
    title: 'Healthy dogs',
    subtitle: 'A practical guide',
    mainText: { type: 'doc', content: [] },
    tags: [{ title: 'Dogs' }, { title: 'Health' }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    ArticleModel.findOne.mockResolvedValue(null);
    MainImageService.upload.mockResolvedValue({
      key: 'articles/main/new.webp',
      mainImage: 'https://cdn.example.test/articles/new.webp',
      mainImageThumbnail: 'data:image/webp;base64,AAAA',
    });
    MainImageService.getStoredKey.mockReturnValue('articles/main/old.webp');
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
    const imageFile = { buffer: Buffer.from('image') };
    const article = await ArticleService.create(data, 'user-id', imageFile);

    expect(article).toMatchObject({
      createdBy: 'user-id',
      slug: 'healthy-dogs-dogs-health',
      author: {
        avatar: 'https://cdn.example.test/users/author.webp',
        placeholderImage: '',
        firstName: 'Sara',
        lastName: 'Ahmadi',
      },
      mainImage: 'https://cdn.example.test/articles/new.webp',
      mainThumbnailImage: 'data:image/webp;base64,AAAA',
    });
    expect(MainImageService.upload).toHaveBeenCalledWith(
      imageFile,
      'articles/main',
    );
  });

  test('rejects a duplicate generated slug', async () => {
    ArticleModel.findOne.mockResolvedValue({ _id: 'existing' });

    await expect(
      ArticleService.create(data, 'user-id', { buffer: Buffer.from('image') }),
    ).rejects.toThrow('قبلاً استفاده شده‌اند');
  });

  test('rejects an unknown optional pet type', async () => {
    PetTypeModel.findById.mockResolvedValue(null);

    await expect(
      ArticleService.create(
        { ...data, petType: '65a4de97aff1fbb38c437952' },
        'user-id',
        { buffer: Buffer.from('image') },
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

  test('replaces an image server-side and cleans up the previous object', async () => {
    const article = {
      _id: 'article-id',
      title: data.title,
      tags: data.tags,
      mainImage: 'https://cdn.example.test/articles/old.webp',
      save: jest.fn().mockResolvedValue(true),
    };
    const imageFile = { buffer: Buffer.from('replacement') };

    await ArticleService.updateDetails(article, {}, 'user-id', imageFile);

    expect(article).toMatchObject({
      mainImage: 'https://cdn.example.test/articles/new.webp',
      mainThumbnailImage: 'data:image/webp;base64,AAAA',
    });
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'articles/main/old.webp',
      { id: 'article-id', userId: 'user-id' },
    );
  });

  test('cleans up a newly uploaded image when its detail update cannot be saved', async () => {
    const article = {
      _id: 'article-id',
      title: data.title,
      tags: data.tags,
      mainImage: 'https://cdn.example.test/articles/old.webp',
      save: jest.fn().mockRejectedValue(new Error('save failed')),
    };

    await expect(
      ArticleService.updateDetails(article, {}, 'user-id', {
        buffer: Buffer.from('replacement'),
      }),
    ).rejects.toThrow('save failed');

    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'articles/main/new.webp',
      { id: 'article-id', userId: 'user-id' },
    );
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

  test('reads article details and main text separately by ID', async () => {
    const article = { _id: 'article-id', mainText: { type: 'doc' } };
    const detailsSelect = jest.fn().mockResolvedValue(article);
    const mainTextSelect = jest.fn().mockResolvedValue(article);
    ArticleModel.findById
      .mockReturnValueOnce({ select: detailsSelect })
      .mockReturnValueOnce({ select: mainTextSelect });

    await expect(
      ArticleService.getByIdWithoutMainText('article-id'),
    ).resolves.toBe(article);
    await expect(ArticleService.getMainTextById('article-id')).resolves.toEqual(
      article.mainText,
    );
    expect(detailsSelect).toHaveBeenCalledWith('-mainText');
    expect(mainTextSelect).toHaveBeenCalledWith('mainText');
  });

  test("returns only an author's articles with newest first", async () => {
    const articles = [{ _id: 'newer' }, { _id: 'older' }];
    const populate = jest.fn().mockResolvedValue(articles);
    const sort = jest.fn().mockReturnValue({ populate });
    ArticleModel.find.mockReturnValue({ sort });

    await expect(ArticleService.findByAuthor('user-id')).resolves.toBe(
      articles,
    );
    expect(ArticleModel.find).toHaveBeenCalledWith({ createdBy: 'user-id' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(populate).toHaveBeenCalledWith('petType');
  });

  test('deletes the loaded article document and its stored image', async () => {
    const article = {
      _id: 'article-id',
      mainImage: 'https://cdn.example.test/articles/old.webp',
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };

    await expect(
      ArticleService.delete(article, 'user-id'),
    ).resolves.toBeUndefined();
    expect(article.deleteOne).toHaveBeenCalledTimes(1);
    expect(MainImageService.cleanup).toHaveBeenCalledWith(
      'articles/main/old.webp',
      { id: 'article-id', userId: 'user-id' },
    );
  });
});
