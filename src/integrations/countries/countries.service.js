import { COUNTRIES_API, ERROR_CODES, STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { CountriesClient } from './countries.client.js';
import { mapCountries } from './countries.helpers.js';

export class CountriesService {
  static cache = null;

  static clearCache() {
    this.cache = null;
  }

  static async getAll({ forceRefresh = false } = {}) {
    const now = Date.now();
    if (!forceRefresh && this.cache?.expiresAt > now) {
      return this.cache.data;
    }

    try {
      const countries = mapCountries(await CountriesClient.fetchAll());
      if (!countries.length) {
        const error = new Error(
          'Countries provider returned no usable countries',
        );
        error.code = ERROR_CODES.INVALID_COUNTRIES_PROVIDER_RESPONSE;
        throw error;
      }

      this.cache = {
        data: countries,
        expiresAt: now + COUNTRIES_API.CACHE_TTL_MS,
      };
      return countries;
    } catch (error) {
      if (this.cache?.data?.length) {
        return this.cache.data;
      }

      setErrorResponse(STATUES.OTHER_PROBLEM, {
        message: 'Country information is temporarily unavailable',
        code: error.code || ERROR_CODES.COUNTRIES_PROVIDER_UNAVAILABLE,
      });
    }
  }
}
