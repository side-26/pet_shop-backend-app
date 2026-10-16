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

  static async uploadImage(imageFile, directory) {
    if (!imageFile?.buffer) {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر باید ارسال شود',
        code: 'IMAGE_REQUIRED',
      });
    }

    let image;
    try {
      image = await formatImageFile(imageFile.buffer, IMAGE_FORMATS.WEBP);
    } catch {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'تصویر ارسال‌شده معتبر نیست',
        code: 'INVALID_IMAGE',
      });
    }

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
      url: ObjectStorageService.buildPublicUrl(uploadedKey),
    };
  }

  static async uploadImages(imageFiles = [], directory) {
    const results = await Promise.allSettled(
      imageFiles.map((imageFile) => this.uploadImage(imageFile, directory)),
    );
    const uploadedImages = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value);
    const failedUpload = results.find((result) => result.status === 'rejected');

    if (failedUpload) {
      await this.cleanupMany(
        uploadedImages.map(({ key }) => key),
        { directory },
      );
      throw failedUpload.reason;
    }

    return uploadedImages;
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

  static async cleanupMany(keys = [], context) {
    await Promise.all(keys.map((key) => this.cleanup(key, context)));
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
