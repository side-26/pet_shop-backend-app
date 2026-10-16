import { MELIPAYAMAK_API } from '#configs/constants.js';
import { getMelipayamakOtpToken } from '#configs/env.config.js';

export class OtpCodeClient {
  static async send({ to }) {
    const token = getMelipayamakOtpToken();
    const body = JSON.stringify({ to });

    const url = new URL(
      `${MELIPAYAMAK_API.OTP_PATH}/${encodeURIComponent(token)}`,
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
      const error = new Error('درخواست از سرویس پیامک ناموفق بود');
      error.providerStatus = response.status;
      throw error;
    }
    return response.json();
  }
}
