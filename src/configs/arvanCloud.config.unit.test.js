import { normalizeArvanEndpoint } from './arvanCloud.config.js';

describe('Arvan Cloud configuration', () => {
  it('adds HTTPS to a host-only endpoint', () => {
    expect(normalizeArvanEndpoint('s3.ir-thr-at1.arvanstorage.ir')).toBe(
      'https://s3.ir-thr-at1.arvanstorage.ir',
    );
  });

  it('preserves a complete HTTPS endpoint', () => {
    expect(
      normalizeArvanEndpoint('https://s3.ir-thr-at1.arvanstorage.ir/'),
    ).toBe('https://s3.ir-thr-at1.arvanstorage.ir');
  });

  it('rejects a missing endpoint with a Persian message', () => {
    expect(() => normalizeArvanEndpoint()).toThrow(
      'نشانی سرویس ذخیره‌سازی آروان تنظیم نشده است',
    );
  });
});
