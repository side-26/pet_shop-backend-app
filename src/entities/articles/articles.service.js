import { STATUES } from '#configs/constants.js';
import { MainImageService } from '#services/mainImage.service.js';
import { getPaginationData, setErrorResponse } from '#utils/helpers.js';

import { PetTypeModel } from '../petTypes/petTypes.model.js';
import { UserModel } from '../users/users.model.js';
import { ArticleModel } from './articles.model.js';
import {
  ARTICLE_LIST_SORT_ORDERS,
  ARTICLE_LIST_SORT_OPTIONS,
  ARTICLE_LIST_SORTS,
  RELATED_ARTICLE_LIMIT,
} from './articles.constants.js';

export class ArticleService {
  static createSlug({ title, tags = [] }) {
    const source = [
      title,
      ...tags.slice(0, 5).map(({ title: tagTitle }) => tagTitle),
    ]
      .join(' ')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, '')
      .trim()
      .replace(/[\s-]+/g, '-')
      .slice(0, 300);
    return source;
  }

  static async findById(id, throwOnNotFound = true) {
    const article = await ArticleModel.findById(id);
    if (!article && throwOnNotFound) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'مقاله یافت نشد',
        code: 'ARTICLE_NOT_FOUND',
      });
    }
    return article;
  }

  static async getByIdWithoutMainText(id) {
    const article = await ArticleModel.findById(id).select('-mainText');
    if (!article) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'مقاله یافت نشد',
        code: 'ARTICLE_NOT_FOUND',
      });
    }
    return article;
  }

  static async getMainTextById(id) {
    const article = await ArticleModel.findById(id).select('mainText');
    if (!article) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'مقاله یافت نشد',
        code: 'ARTICLE_NOT_FOUND',
      });
    }
    return article.mainText;
  }

  static async getPreviewBySlug(slug) {
    const article = await ArticleModel.findOne({ slug });
    if (!article) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'مقاله یافت نشد',
        code: 'ARTICLE_NOT_FOUND',
      });
    }
    return article;
  }

  static async getTagsAndMatchedArticlesBySlug(slug) {
    const article = await this.getPreviewBySlug(slug);
    const tags = article.tags || [];
    const tagTitles = [...new Set(tags.map(({ title }) => title))];

    if (tagTitles.length === 0) {
      return { tags, articles: [] };
    }

    const articles = await ArticleModel.aggregate([
      {
        $match: {
          _id: { $ne: article._id },
          'tags.title': { $in: tagTitles },
        },
      },
      {
        $addFields: {
          matchedTagCount: {
            $size: {
              $setIntersection: [
                { $map: { input: '$tags', as: 'tag', in: '$$tag.title' } },
                tagTitles,
              ],
            },
          },
        },
      },
      { $sort: { matchedTagCount: -1, createdAt: -1, _id: -1 } },
      { $limit: RELATED_ARTICLE_LIMIT },
      { $project: { mainText: 0, matchedTagCount: 0, __v: 0 } },
    ]);

    return { tags, articles };
  }

  static findByAuthor(userId) {
    return ArticleModel.find({ createdBy: userId })
      .sort({ createdAt: -1 })
      .populate('petType');
  }

  static async findPaginatedWithMetadata(query = {}) {
    const sort = query.sort || ARTICLE_LIST_SORTS.NEWEST;
    const filter = {
      ...(query.tags?.length ? { 'tags.title': { $in: query.tags } } : {}),
      ...(query.petType ? { petType: query.petType } : {}),
    };
    const [result, tags, petTypeArticleCounts, petTypes] = await Promise.all([
      getPaginationData(
        ArticleModel,
        {
          ...filter,
          page: query.page,
          limit: query.limit,
          sort: ARTICLE_LIST_SORT_ORDERS[sort],
        },
        '-mainText',
        (error) =>
          setErrorResponse(STATUES.OTHER_PROBLEM, {
            message: 'دریافت فهرست مقاله‌ها ناموفق بود',
            error: String(error),
          }),
      ),
      ArticleModel.aggregate([
        { $unwind: '$tags' },
        { $group: { _id: '$tags.title', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, title: '$_id', count: 1 } },
      ]),
      ArticleModel.aggregate([
        { $match: { petType: { $ne: null } } },
        { $group: { _id: '$petType', count: { $sum: 1 } } },
      ]),
      PetTypeModel.find({ isEnabled: true })
        .select('title mainImage thumbnail slug')
        .sort({ title: 1 }),
    ]);
    result.result = await ArticleModel.populate(result.result, 'petType');
    const petTypeCountById = new Map(
      petTypeArticleCounts.map(({ _id, count }) => [String(_id), count]),
    );

    return {
      ...result,
      metadata: {
        tags,
        petTypes: petTypes
          .filter((petType) => petTypeCountById.has(String(petType._id)))
          .map((petType) => ({
            ...(petType.toObject?.() ?? petType),
            count: petTypeCountById.get(String(petType._id)),
          })),
        sort: { current: sort, options: ARTICLE_LIST_SORT_OPTIONS },
      },
    };
  }

  static async ensurePetTypeExists(petType) {
    if (!petType) return;
    const existingPetType = await PetTypeModel.findById(petType);
    if (!existingPetType) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نوع حیوان انتخاب‌شده یافت نشد',
        code: 'ARTICLE_PET_TYPE_NOT_FOUND',
      });
    }
  }

  static async ensureUniqueSlug(slug, excludeId) {
    const query = { slug };
    if (excludeId) query._id = { $ne: excludeId };
    if (await ArticleModel.findOne(query)) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'عنوان و برچسب‌های این مقاله قبلاً استفاده شده‌اند',
        code: 'ARTICLE_SLUG_ALREADY_EXISTS',
      });
    }
  }

  static async getAuthorSnapshot(userId) {
    const user = await UserModel.findById(userId).select(
      'avatar firstName lastName',
    );
    if (!user) {
      setErrorResponse(STATUES.NOT_FOUND, {
        message: 'کاربر ایجادکننده یافت نشد',
        code: 'ARTICLE_AUTHOR_NOT_FOUND',
      });
    }
    return {
      avatar: user.avatar || '',
      placeholderImage: '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
    };
  }

  static async create(data, userId, imageFile) {
    await this.ensurePetTypeExists(data.petType);
    const slug = this.createSlug(data);
    await this.ensureUniqueSlug(slug);
    const author = await this.getAuthorSnapshot(userId);
    const uploadedImage = await MainImageService.upload(
      imageFile,
      'articles/main',
    );

    try {
      return await new ArticleModel({
        ...data,
        mainImage: uploadedImage.mainImage,
        mainThumbnailImage: uploadedImage.mainImageThumbnail,
        slug,
        author,
        createdBy: userId,
      }).save();
    } catch (error) {
      await MainImageService.cleanup(uploadedImage.key, { userId });
      throw error;
    }
  }

  static async updateMainText(article, data, userId) {
    article.mainText = data.mainText;
    article.updatedBy = userId;
    return article.save();
  }

  static async updateDetails(article, data, userId, imageFile) {
    await this.ensurePetTypeExists(data.petType);
    const nextArticle = {
      title: data.title ?? article.title,
      tags: data.tags ?? article.tags,
    };
    if (data.title !== undefined || data.tags !== undefined) {
      const slug = this.createSlug(nextArticle);
      await this.ensureUniqueSlug(slug, article._id);
      article.slug = slug;
    }
    const uploadedImage = imageFile
      ? await MainImageService.upload(imageFile, 'articles/main')
      : null;
    const previousKey = uploadedImage
      ? MainImageService.getStoredKey(article.mainImage, {
          id: article._id,
          userId,
        })
      : undefined;
    const imageUpdate = uploadedImage
      ? {
          mainImage: uploadedImage.mainImage,
          mainThumbnailImage: uploadedImage.mainImageThumbnail,
        }
      : {};

    Object.assign(article, data, imageUpdate, { updatedBy: userId });
    let updatedArticle;
    try {
      updatedArticle = await article.save();
    } catch (error) {
      await MainImageService.cleanup(uploadedImage?.key, {
        id: article._id,
        userId,
      });
      throw error;
    }

    if (uploadedImage) {
      await MainImageService.cleanup(previousKey, { id: article._id, userId });
    }

    return updatedArticle;
  }

  static async replaceTags(article, tags, userId) {
    const slug = this.createSlug({ title: article.title, tags });
    await this.ensureUniqueSlug(slug, article._id);
    article.tags = tags;
    article.slug = slug;
    article.updatedBy = userId;
    return article.save();
  }

  static async delete(article, userId) {
    const imageKey = MainImageService.getStoredKey(article.mainImage, {
      id: article._id,
      userId,
    });
    await article.deleteOne();
    await MainImageService.cleanup(imageKey, { id: article._id, userId });
  }

  static format(article) {
    if (!article) return null;
    const value =
      typeof article.toObject === 'function' ? article.toObject() : article;
    return {
      id: value._id,
      title: value.title,
      subtitle: value.subtitle,
      mainImage: value.mainImage,
      mainThumbnailImage: value.mainThumbnailImage,
      summary: value.summary,
      tags: value.tags,
      petType: value.petType,
      mainText: value.mainText,
      author: value.author,
      slug: value.slug,
      createdAt: value.createdAt,
      updatedAt: value.updatedAt,
    };
  }

  static formatWithoutMainText(article) {
    const formattedArticle = this.format(article);
    delete formattedArticle.mainText;
    return formattedArticle;
  }

  static formatMany(articles) {
    return articles.map((article) => this.format(article));
  }

  static formatManyWithoutMainText(articles) {
    return articles.map((article) => this.formatWithoutMainText(article));
  }

  static formatTags(article) {
    return article.tags || [];
  }
}
