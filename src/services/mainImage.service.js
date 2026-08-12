import { IMAGE_FORMATS, STATUES } from '#configs/constants.js';
import logger from '#configs/logger.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';
import { setErrorResponse } from '#utils/helpers.js';
import { createBlurThumbnail, formatImageFile } from '#utils/image.helpers.js';

export class MainImageService {
  static async prepare(imageFile) {
    if (!imageFile?.buffer) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر اصلی باید ارسال شود',
        code: 'MAIN_IMAGE_REQUIRED',
      });
    }

    try {
      const [image, thumbnail] = await Promise.all([
        formatImageFile(imageFile.buffer, IMAGE_FORMATS.WEBP),
        createBlurThumbnail(imageFile.buffer),
      ]);
      return { image, thumbnail };
    } catch {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر اصلی ارسال‌شده معتبر نیست',
        code: 'INVALID_MAIN_IMAGE',
      });
    }
  }

  static async upload(imageFile, directory) {
    const { image, thumbnail } = await this.prepare(imageFile);
    const key = ObjectStorageService.createObjectKey(
      directory,
      IMAGE_FORMATS.WEBP,
    );
    const uploadedKey = await ObjectStorageService.uploadObject({
      key,
      body: image,
      contentType: 'image/webp',
    });
    return {
      key: uploadedKey,
      mainImage: ObjectStorageService.buildPublicUrl(uploadedKey),
      mainImageThumbnail: thumbnail,
    };
  }

  static async cleanup(key, context) {
    if (!key) return;
    await ObjectStorageService.deleteObject(key).catch((error) =>
      logger.app.error(
        'حذف تصویر کاتالوگ از فضای ذخیره‌سازی ناموفق بود',
        error,
        {
          ...context,
          key,
        },
      ),
    );
  }

  static getStoredKey(imageUrl, context) {
    if (!imageUrl) return undefined;
    try {
      return ObjectStorageService.getObjectKeyFromUrl(imageUrl);
    } catch (error) {
      logger.app.error('استخراج کلید تصویر کاتالوگ ناموفق بود', error, {
        ...context,
        imageUrl,
      });
      return undefined;
    }
  }
}
