import { ERROR_CODES, STATUES } from '#configs/constants.js';

import { ReverseGeocodingClient } from './reverseGeocoding.client.js';
import { reverseGeocodingQuerySchema } from './reverseGeocoding.schema.js';
import { ReverseGeocodingService } from './reverseGeocoding.service.js';

const neshanResponse = {
  status: 'OK',
  formatted_address: 'تهران، خیابان فاطمی',
  city: 'تهران',
  state: 'استان تهران',
};

const mockResponse = ({ ok = true, status = STATUES.SUCCESS, body } = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('Reverse geocoding integration', () => {
  const originalNeshanApiKey = process.env.NESHAN_API_KEY;

  beforeEach(() => {
    process.env.NESHAN_API_KEY = 'test-neshan-key';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalNeshanApiKey === undefined) {
      delete process.env.NESHAN_API_KEY;
    } else {
      process.env.NESHAN_API_KEY = originalNeshanApiKey;
    }
  });

  test('client sends coordinates and the API key to Neshan', async () => {
    global.fetch.mockResolvedValue(mockResponse({ body: neshanResponse }));

    await expect(
      ReverseGeocodingClient.reverseGeocode({ lat: 35.7219, lng: 51.3347 }),
    ).resolves.toEqual(neshanResponse);

    const [url, options] = global.fetch.mock.calls[0];
    expect(url.origin + url.pathname).toBe('https://api.neshan.org/v5/reverse');
    expect(url.searchParams.get('lat')).toBe('35.7219');
    expect(url.searchParams.get('lng')).toBe('51.3347');
    expect(options.headers).toEqual({
      accept: 'application/json',
      'Api-Key': 'test-neshan-key',
    });
  });

  test('missing API key fails before making an HTTP request', async () => {
    delete process.env.NESHAN_API_KEY;

    await expect(
      ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
    ).rejects.toMatchObject({
      statusCode: STATUES.INTERNAL_SERVER,
      code: ERROR_CODES.NESHAN_API_KEY_NOT_CONFIGURED,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('service returns a valid Neshan result', async () => {
    global.fetch.mockResolvedValue(mockResponse({ body: neshanResponse }));

    await expect(
      ReverseGeocodingService.reverseGeocode({ lat: 35.7219, lng: 51.3347 }),
    ).resolves.toEqual(neshanResponse);
  });

  test('service rejects an invalid provider response', async () => {
    global.fetch.mockResolvedValue(mockResponse({ body: { status: 'OK' } }));

    await expect(
      ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
    ).rejects.toMatchObject({
      statusCode: STATUES.OTHER_PROBLEM,
      code: ERROR_CODES.INVALID_NESHAN_PROVIDER_RESPONSE,
    });
  });

  test.each([400, 470])(
    'maps provider status %i to invalid coordinates',
    async (providerStatus) => {
      global.fetch.mockResolvedValue(
        mockResponse({ ok: false, status: providerStatus }),
      );

      await expect(
        ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
      ).rejects.toMatchObject({
        statusCode: STATUES.BAD_FORM_VALIDATION,
        code: ERROR_CODES.NESHAN_INVALID_COORDINATES,
      });
    },
  );

  test.each([480, 483, 484, 485])(
    'maps provider status %i to a safe configuration error',
    async (providerStatus) => {
      global.fetch.mockResolvedValue(
        mockResponse({ ok: false, status: providerStatus }),
      );

      await expect(
        ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
      ).rejects.toMatchObject({
        statusCode: STATUES.OTHER_PROBLEM,
        code: ERROR_CODES.NESHAN_PROVIDER_CONFIGURATION_ERROR,
      });
    },
  );

  test.each([481, 482])(
    'maps provider status %i to a provider limit error',
    async (providerStatus) => {
      global.fetch.mockResolvedValue(
        mockResponse({ ok: false, status: providerStatus }),
      );

      await expect(
        ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
      ).rejects.toMatchObject({
        statusCode: STATUES.TOO_MANY_REQUESTS,
        code: ERROR_CODES.NESHAN_PROVIDER_LIMIT_EXCEEDED,
      });
    },
  );

  test('maps provider server and network errors to unavailable', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockResponse({ ok: false, status: STATUES.INTERNAL_SERVER }),
      )
      .mockRejectedValueOnce(new Error('network failure'));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        ReverseGeocodingService.reverseGeocode({ lat: 35, lng: 51 }),
      ).rejects.toMatchObject({
        statusCode: STATUES.OTHER_PROBLEM,
        code: ERROR_CODES.NESHAN_PROVIDER_UNAVAILABLE,
      });
    }
  });

  test.each([
    [{}, 'lat'],
    [{ lat: '35' }, 'lng'],
    [{ lng: '51' }, 'lat'],
    [{ lat: 'abc', lng: '51' }, 'lat'],
    [{ lat: '35', lng: 'abc' }, 'lng'],
    [{ lat: '91', lng: '51' }, 'lat'],
    [{ lat: '-91', lng: '51' }, 'lat'],
    [{ lat: '35', lng: '181' }, 'lng'],
    [{ lat: '35', lng: '-181' }, 'lng'],
    [{ lat: '', lng: '51' }, 'lat'],
  ])('schema rejects invalid coordinates %p', (query, invalidField) => {
    const result = reverseGeocodingQuerySchema.safeParse(query);

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toContain(invalidField);
  });

  test('schema converts valid query strings to numbers', () => {
    expect(
      reverseGeocodingQuerySchema.parse({ lat: '35.7219', lng: '51.3347' }),
    ).toEqual({ lat: 35.7219, lng: 51.3347 });
  });
});
