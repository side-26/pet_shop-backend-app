import { ERROR_CODES, STATUES } from '#configs/constants.js';

import { CountriesClient } from './countries.client.js';
import { buildCountryFlagUrl } from './countries.helpers.js';
import { CountriesService } from './countries.service.js';

const upstreamCountries = [
  {
    name: 'Iran',
    alpha2Code: 'IR',
    translations: { fa: 'ایران' },
  },
  {
    name: 'Canada',
    alpha2Code: 'CA',
    translations: { fa: 'کانادا' },
  },
];

const mockResponse = ({ ok = true, status = STATUES.SUCCESS, body } = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('Countries API wrapper', () => {
  beforeEach(() => {
    CountriesService.clearCache();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('CountriesClient fetchAll returns the provider array', async () => {
    global.fetch.mockResolvedValue(mockResponse({ body: upstreamCountries }));

    await expect(CountriesClient.fetchAll()).resolves.toEqual(
      upstreamCountries,
    );
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/^https:\/\//),
      expect.objectContaining({ headers: { accept: 'application/json' } }),
    );
  });

  test('buildCountryFlagUrl uses the configured SVG source', () => {
    expect(buildCountryFlagUrl('IR')).toBe(
      'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
    );
    expect(buildCountryFlagUrl('invalid')).toBeNull();
  });

  test('CountriesClient rejects unsuccessful and malformed responses', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockResponse({ ok: false, status: STATUES.INTERNAL_SERVER }),
      )
      .mockResolvedValueOnce(mockResponse({ body: { countries: [] } }));

    await expect(CountriesClient.fetchAll()).rejects.toMatchObject({
      code: ERROR_CODES.COUNTRIES_PROVIDER_UNAVAILABLE,
    });
    await expect(CountriesClient.fetchAll()).rejects.toMatchObject({
      code: ERROR_CODES.INVALID_COUNTRIES_PROVIDER_RESPONSE,
    });
  });

  test('CountriesService maps, filters, sorts, and caches countries', async () => {
    global.fetch.mockResolvedValue(
      mockResponse({
        body: [
          ...upstreamCountries,
          { name: 'Invalid country without Persian title' },
        ],
      }),
    );

    const first = await CountriesService.getAll();
    const second = await CountriesService.getAll();

    expect(first).toEqual([
      {
        title: 'Canada',
        titleFa: 'کانادا',
        logo: 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ca.svg',
      },
      {
        title: 'Iran',
        titleFa: 'ایران',
        logo: 'https://cdn.jsdelivr.net/npm/flag-icons@7.5.0/flags/4x3/ir.svg',
      },
    ]);
    expect(second).toBe(first);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('CountriesService serves stale cache when refresh fails', async () => {
    global.fetch
      .mockResolvedValueOnce(mockResponse({ body: upstreamCountries }))
      .mockRejectedValueOnce(new Error('network failure'));

    const cached = await CountriesService.getAll();
    await expect(CountriesService.getAll({ forceRefresh: true })).resolves.toBe(
      cached,
    );
  });

  test('CountriesService returns a service unavailable error without cache', async () => {
    global.fetch.mockRejectedValue(new Error('network failure'));

    await expect(CountriesService.getAll()).rejects.toMatchObject({
      statusCode: STATUES.OTHER_PROBLEM,
      code: ERROR_CODES.COUNTRIES_PROVIDER_UNAVAILABLE,
    });
  });
});
