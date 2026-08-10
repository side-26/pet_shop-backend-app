import sharp from 'sharp';

import { IMAGE_PROCESSING } from '#configs/constants.js';

import {
  createBlurThumbnail,
  formatImageFile,
  getImageQuality,
  normalizeImageFormat,
} from './image.helpers.js';

const createImage = (width = 800, height = 600) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 75, g: 125, b: 200 },
    },
  })
    .png()
    .toBuffer();

describe('image helpers', () => {
  test('uses the configured quality thresholds', () => {
    expect(getImageQuality(IMAGE_PROCESSING.ONE_MB)).toBe(90);
    expect(getImageQuality(IMAGE_PROCESSING.ONE_MB + 1)).toBe(75);
    expect(getImageQuality(IMAGE_PROCESSING.THREE_MB)).toBe(75);
    expect(getImageQuality(IMAGE_PROCESSING.THREE_MB + 1)).toBe(70);
    expect(getImageQuality(IMAGE_PROCESSING.FOUR_MB)).toBe(70);
    expect(getImageQuality(IMAGE_PROCESSING.FOUR_MB + 1)).toBe(65);
  });

  test('normalizes supported formats and rejects unsupported formats', () => {
    expect(normalizeImageFormat()).toBe('webp');
    expect(normalizeImageFormat('jpg')).toBe('jpeg');
    expect(() => normalizeImageFormat('gif')).toThrow(
      'فرمت تصویر پشتیبانی نمی‌شود',
    );
  });

  test('formats binary images as WebP by default and supports requested formats', async () => {
    const input = await createImage();
    const webp = await formatImageFile(input);
    const jpeg = await formatImageFile(new Uint8Array(input), 'jpeg');

    await expect(sharp(webp).metadata()).resolves.toMatchObject({
      format: 'webp',
    });
    await expect(sharp(jpeg).metadata()).resolves.toMatchObject({
      format: 'jpeg',
    });
  });

  test('rejects non-binary image input', async () => {
    await expect(formatImageFile('not-an-image')).rejects.toThrow(
      'محتوای تصویر باید به‌صورت داده باینری باشد',
    );
  });

  test('never returns a blurred WebP thumbnail larger than the 10 KB maximum', async () => {
    const input = await createImage(1600, 1200);
    const thumbnail = await createBlurThumbnail(input);
    const metadata = await sharp(thumbnail).metadata();

    expect(thumbnail.length).toBeLessThanOrEqual(
      IMAGE_PROCESSING.MAX_THUMBNAIL_SIZE_BYTES,
    );
    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBeLessThanOrEqual(160);
    expect(metadata.height).toBeGreaterThan(0);
  });
});
