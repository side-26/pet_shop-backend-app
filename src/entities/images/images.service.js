import { STATUES } from '#configs/constants.js';
import { ObjectStorageService } from '#services/objectStorage.service.js';
import { MainImageService } from '#services/mainImage.service.js';
import { setErrorResponse } from '#utils/helpers.js';

const MANAGEMENT_IMAGE_DIRECTORY = 'management/images';

export class ImagesService {
  static async upload(imageFile) {
    const { url } = await MainImageService.uploadImage(
      imageFile,
      MANAGEMENT_IMAGE_DIRECTORY,
    );
    return url;
  }

  static async delete(imageUrl) {
    let key;

    try {
      key = ObjectStorageService.getObjectKeyFromUrl(imageUrl);
    } catch {
      setErrorResponse(STATUES.BAD_FORM_VALIDATION, {
        message: 'نشانی تصویر متعلق به فضای ذخیره‌سازی نیست',
      });
    }

    await ObjectStorageService.deleteObject(key);
  }
}
