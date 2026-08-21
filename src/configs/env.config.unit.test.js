import {
  getJwtRefreshSecret,
  getTemporaryTokenSecret,
  getJwtSecret,
  getNeshanApiKey,
} from './env.config.js';

describe('environment configuration', () => {
  const originalJwtSecret = process.env.JWT_SECRET_KEY;
  const originalJwtRefreshSecret = process.env.JWT_REFRESH_SECRET_KEY;
  const originalNeshanApiKey = process.env.NESHAN_API_KEY;
  const originalTemporaryTokenSecret = process.env.TEMPORARY_TOKEN_SECRET_KEY;

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET_KEY;
    } else {
      process.env.JWT_SECRET_KEY = originalJwtSecret;
    }

    if (originalJwtRefreshSecret === undefined) {
      delete process.env.JWT_REFRESH_SECRET_KEY;
    } else {
      process.env.JWT_REFRESH_SECRET_KEY = originalJwtRefreshSecret;
    }

    if (originalNeshanApiKey === undefined) {
      delete process.env.NESHAN_API_KEY;
    } else {
      process.env.NESHAN_API_KEY = originalNeshanApiKey;
    }

    if (originalTemporaryTokenSecret === undefined) {
      delete process.env.TEMPORARY_TOKEN_SECRET_KEY;
    } else {
      process.env.TEMPORARY_TOKEN_SECRET_KEY = originalTemporaryTokenSecret;
    }
  });

  it('returns the configured JWT secret', () => {
    process.env.JWT_SECRET_KEY = 'test-secret';

    expect(getJwtSecret()).toBe('test-secret');
  });

  it('throws a Persian configuration error when the secret is missing', () => {
    delete process.env.JWT_SECRET_KEY;

    expect(() => getJwtSecret()).toThrow(
      'کلید امنیتی JWT در تنظیمات محیطی تعریف نشده است',
    );
  });

  it('returns the configured JWT refresh secret', () => {
    process.env.JWT_REFRESH_SECRET_KEY = 'test-refresh-secret';

    expect(getJwtRefreshSecret()).toBe('test-refresh-secret');
  });

  it('throws a Persian configuration error when the refresh secret is missing', () => {
    delete process.env.JWT_REFRESH_SECRET_KEY;

    expect(() => getJwtRefreshSecret()).toThrow(
      'کلید امنیتی توکن تازه‌سازی در تنظیمات محیطی تعریف نشده است',
    );
  });

  it('returns the configured temporary-token secret', () => {
    process.env.TEMPORARY_TOKEN_SECRET_KEY = 'temporary-secret';

    expect(getTemporaryTokenSecret()).toBe('temporary-secret');
  });

  it('throws a Persian configuration error when the temporary-token secret is missing', () => {
    delete process.env.TEMPORARY_TOKEN_SECRET_KEY;

    expect(() => getTemporaryTokenSecret()).toThrow(
      'کلید امنیتی توکن موقت در تنظیمات محیطی تعریف نشده است',
    );
  });

  it('returns the configured Neshan API key', () => {
    process.env.NESHAN_API_KEY = 'test-neshan-key';

    expect(getNeshanApiKey()).toBe('test-neshan-key');
  });

  it('throws a Persian configuration error when the Neshan key is missing', () => {
    delete process.env.NESHAN_API_KEY;

    expect(() => getNeshanApiKey()).toThrow(
      'کلید سرویس نشان در تنظیمات محیطی تعریف نشده است',
    );
  });
});
