import { ERROR_CODES, MELIPAYAMAK_API, STATUES } from '#configs/constants.js';

import { OtpCodeClient } from './otpCode.client.js';
import { otpCodeBodySchema } from './otpCode.schema.js';
import { OtpCodeService } from './otpCode.service.js';

const providerResponse = {
  code: '3741437414',
  status: '',
};

const mockResponse = ({ ok = true, status = STATUES.SUCCESS, body } = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('OTP-code integration', () => {
  const originalToken = process.env.MELIPAYAMAK_OTP_TOKEN;

  beforeEach(() => {
    process.env.MELIPAYAMAK_OTP_TOKEN = 'test-melipayamak-token';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalToken === undefined) {
      delete process.env.MELIPAYAMAK_OTP_TOKEN;
    } else {
      process.env.MELIPAYAMAK_OTP_TOKEN = originalToken;
    }
  });

  test('client posts the destination to the tokenized provider endpoint', async () => {
    global.fetch.mockResolvedValue(mockResponse({ body: providerResponse }));

    await expect(OtpCodeClient.send({ to: '09123456789' })).resolves.toEqual(
      providerResponse,
    );

    const [url, options] = global.fetch.mock.calls[0];
    expect(url.toString()).toBe(
      `${MELIPAYAMAK_API.BASE_URL}${MELIPAYAMAK_API.OTP_PATH}/test-melipayamak-token`,
    );
    expect(options).toMatchObject({
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: '09123456789' }),
    });
    expect(options.signal).toBeDefined();
    expect(options.headers).not.toHaveProperty('Content-Length');
  });

  test('service returns a valid normalized provider response', async () => {
    global.fetch.mockResolvedValue(
      mockResponse({ body: { code: 3741437414, status: '' } }),
    );

    await expect(OtpCodeService.send({ to: '09123456789' })).resolves.toEqual(
      providerResponse,
    );
  });

  test.each([null, {}, [], { status: 'خطا' }, { code: null }, { code: {} }])(
    'service rejects invalid provider response %p',
    async (body) => {
      global.fetch.mockResolvedValue(mockResponse({ body }));

      await expect(
        OtpCodeService.send({ to: '09123456789' }),
      ).rejects.toMatchObject({
        statusCode: STATUES.OTHER_PROBLEM,
        code: ERROR_CODES.INVALID_MELIPAYAMAK_PROVIDER_RESPONSE,
      });
    },
  );

  test('missing token fails before making a provider request', async () => {
    delete process.env.MELIPAYAMAK_OTP_TOKEN;

    await expect(
      OtpCodeService.send({ to: '09123456789' }),
    ).rejects.toMatchObject({
      statusCode: STATUES.INTERNAL_SERVER,
      code: ERROR_CODES.MELIPAYAMAK_OTP_TOKEN_NOT_CONFIGURED,
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('maps HTTP and network failures to provider unavailable', async () => {
    global.fetch
      .mockResolvedValueOnce(
        mockResponse({ ok: false, status: STATUES.BAD_REQUEST }),
      )
      .mockRejectedValueOnce(new Error('network failure'));

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(
        OtpCodeService.send({ to: '09123456789' }),
      ).rejects.toMatchObject({
        statusCode: STATUES.OTHER_PROBLEM,
        code: ERROR_CODES.MELIPAYAMAK_PROVIDER_UNAVAILABLE,
      });
    }
  });

  test.each([
    undefined,
    null,
    {},
    { to: '' },
    { to: '09123' },
    { to: '08123456789' },
    { to: '09123456789', code: '1234' },
  ])('schema rejects invalid input %p', (input) => {
    expect(otpCodeBodySchema.safeParse(input).success).toBe(false);
  });

  test('schema accepts a valid Iranian mobile number', () => {
    expect(otpCodeBodySchema.parse({ to: '09123456789' })).toEqual({
      to: '09123456789',
    });
  });
});
