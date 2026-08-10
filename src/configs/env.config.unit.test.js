import { getJwtSecret } from './env.config.js';

describe('environment configuration', () => {
  const originalJwtSecret = process.env.JWT_SECRET_KEY;

  afterEach(() => {
    if (originalJwtSecret === undefined) {
      delete process.env.JWT_SECRET_KEY;
    } else {
      process.env.JWT_SECRET_KEY = originalJwtSecret;
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
});
