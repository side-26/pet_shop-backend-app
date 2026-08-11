import { NESHAN_API } from '#configs/constants.js';
import { getNeshanApiKey } from '#configs/env.config.js';

export class ReverseGeocodingClient {
  static async reverseGeocode({ lat, lng }) {
    const apiKey = getNeshanApiKey();
    const url = new URL(NESHAN_API.REVERSE_GEOCODING_URL);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lng', String(lng));

    const response = await fetch(url, {
      headers: {
        accept: 'application/json',
        'Api-Key': apiKey,
      },
      signal: AbortSignal.timeout(NESHAN_API.TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = new Error('درخواست از سرویس نشان ناموفق بود');
      error.providerStatus = response.status;
      throw error;
    }

    return response.json();
  }
}
