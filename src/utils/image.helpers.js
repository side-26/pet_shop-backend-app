import sharp from 'sharp';

import { IMAGE_FORMATS, IMAGE_PROCESSING } from '#configs/constants.js';

const SUPPORTED_IMAGE_FORMATS = new Set([
  IMAGE_FORMATS.WEBP,
  IMAGE_FORMATS.JPEG,
  IMAGE_FORMATS.PNG,
  IMAGE_FORMATS.AVIF,
]);

const toImageBuffer = (imageFile) => {
  if (Buffer.isBuffer(imageFile)) return imageFile;
  if (imageFile instanceof Uint8Array) return Buffer.from(imageFile);
  if (imageFile instanceof ArrayBuffer) return Buffer.from(imageFile);

  throw new TypeError('Image file must be binary data');
};

export const getImageQuality = (byteLength) => {
  if (byteLength <= IMAGE_PROCESSING.ONE_MB) return 90;
  if (byteLength <= IMAGE_PROCESSING.THREE_MB) return 75;
  if (byteLength <= IMAGE_PROCESSING.FOUR_MB) return 70;
  return 65;
};

export const normalizeImageFormat = (format = IMAGE_FORMATS.WEBP) => {
  const normalizedFormat = format.toLowerCase() === 'jpg' ? 'jpeg' : format;
  if (!SUPPORTED_IMAGE_FORMATS.has(normalizedFormat)) {
    throw new TypeError(`Unsupported image format: ${format}`);
  }
  return normalizedFormat;
};

export const formatImageFile = async (
  imageFile,
  format = IMAGE_FORMATS.WEBP,
) => {
  const input = toImageBuffer(imageFile);
  const normalizedFormat = normalizeImageFormat(format);
  const quality = getImageQuality(input.length);

  return sharp(input, { failOn: 'none' })
    .rotate()
    .toFormat(normalizedFormat, { quality })
    .toBuffer();
};

export const createBlurThumbnail = async (imageFile) => {
  const input = toImageBuffer(imageFile);

  for (const width of IMAGE_PROCESSING.THUMBNAIL_WIDTHS) {
    for (const quality of IMAGE_PROCESSING.THUMBNAIL_QUALITIES) {
      const thumbnail = await sharp(input, { failOn: 'none' })
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .blur(IMAGE_PROCESSING.THUMBNAIL_BLUR_SIGMA)
        .webp({ quality })
        .toBuffer();

      if (thumbnail.length <= IMAGE_PROCESSING.MAX_THUMBNAIL_SIZE_BYTES) {
        return thumbnail;
      }
    }
  }

  throw new RangeError('Unable to create a thumbnail below the 10 KB maximum');
};
