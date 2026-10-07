import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { PetTypeModel } from '../petTypes/petTypes.model.js';
import { UserModel } from '../users/users.model.js';
import { ArticleModel } from './articles.model.js';

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

  static findByAuthor(userId) {
    return ArticleModel.find({ createdBy: userId }).sort({ createdAt: -1 });
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

  static async create(data, userId) {
    await this.ensurePetTypeExists(data.petType);
    const slug = this.createSlug(data);
    await this.ensureUniqueSlug(slug);
    const author = await this.getAuthorSnapshot(userId);
    return new ArticleModel({
      ...data,
      slug,
      author,
      createdBy: userId,
    }).save();
  }

  static async updateMainText(article, data, userId) {
    article.mainText = data.mainText;
    article.updatedBy = userId;
    return article.save();
  }

  static async updateDetails(article, data, userId) {
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
    Object.assign(article, data, { updatedBy: userId });
    return article.save();
  }

  static async delete(article) {
    await article.deleteOne();
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

  static formatMany(articles) {
    return articles.map((article) => this.format(article));
  }
}
