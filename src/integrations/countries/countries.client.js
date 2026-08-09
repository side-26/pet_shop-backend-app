import { COUNTRIES_API, ERROR_CODES } from '#configs/constants.js';

export class CountriesClient {
  static async fetchAll() {
    const url = process.env.COUNTRIES_API_URL || COUNTRIES_API.DEFAULT_URL;
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(COUNTRIES_API.TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = new Error(`Countries provider returned ${response.status}`);
      error.code = ERROR_CODES.COUNTRIES_PROVIDER_UNAVAILABLE;
      throw error;
    }

    const countries = await response.json();
    if (!Array.isArray(countries)) {
      const error = new Error(
        'Countries provider returned an invalid response',
      );
      error.code = ERROR_CODES.INVALID_COUNTRIES_PROVIDER_RESPONSE;
      throw error;
    }

    return countries;
  }
}
