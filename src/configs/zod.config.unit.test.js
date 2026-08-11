import persianErrorMap from './zod.config.js';

describe('Persian Zod error map', () => {
  it('uses options for an invalid value when options are available', () => {
    const result = persianErrorMap({
      code: 'invalid_value',
      path: ['role'],
      options: ['admin', 'customer'],
      values: ['fallback'],
    });

    expect(result.message).toContain('admin, customer');
    expect(result.message).not.toContain('fallback');
  });

  it.each([undefined, null, []])(
    'uses values when options is %p',
    (options) => {
      const result = persianErrorMap({
        code: 'invalid_value',
        path: ['role'],
        options,
        values: ['admin', 'customer'],
      });

      expect(result.message).toContain('admin, customer');
    },
  );

  it('handles missing options and values without throwing', () => {
    expect(() =>
      persianErrorMap({
        code: 'invalid_value',
        path: ['role'],
      }),
    ).not.toThrow();
  });

  it('translates URL format errors using the Persian field label', () => {
    const result = persianErrorMap({
      code: 'invalid_format',
      path: ['mainImage'],
      format: 'url',
    });

    expect(result.message).toBe('تصویر اصلی باید یک آدرس معتبر باشد');
  });

  it('uses the Persian province label for provinceId', () => {
    const result = persianErrorMap({
      code: 'invalid_format',
      path: ['provinceId'],
      format: 'regex',
    });

    expect(result.message).toContain('استان');
  });

  it.each([
    ['lat', 'عرض جغرافیایی'],
    ['lng', 'طول جغرافیایی'],
  ])('uses the Persian coordinate label for %s', (field, label) => {
    const result = persianErrorMap({
      code: 'invalid_type',
      path: [field],
      received: 'NaN',
    });

    expect(result.message).toContain(label);
  });
});
