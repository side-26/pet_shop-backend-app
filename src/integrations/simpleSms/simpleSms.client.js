import { MELIPAYAMAK_API } from '#configs/constants.js';
import { getMelipayamakSimpleSmsToken } from '#configs/env.config.js';

export class SimpleSmsClient {
  static async send({ from, to, text }) {
    const token = getMelipayamakSimpleSmsToken();
    const body = JSON.stringify({ from, to, text });
    const url = new URL(
      `${MELIPAYAMAK_API.SIMPLE_SMS_PATH}/${encodeURIComponent(token)}`,
      MELIPAYAMAK_API.BASE_URL,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      port: 443,
      body,
      signal: AbortSignal.timeout(MELIPAYAMAK_API.TIMEOUT_MS),
    });

    if (!response.ok) {
      const error = new Error('درخواست از سرویس پیامک ساده ناموفق بود');
      error.providerStatus = response.status;
      throw error;
    }

    return response.json();
  }
}
