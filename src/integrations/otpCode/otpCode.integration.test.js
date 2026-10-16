jest.mock('./otpCode.service.js', () => ({
  OtpCodeService: { send: jest.fn() },
}));

import express from 'express';
import request from 'supertest';

import { STATUES } from '#configs/constants.js';
import { errorHandler } from '#middlewares/error.middleware.js';

import otpCodeRoutes from './otpCode.route.js';
import { OtpCodeService } from './otpCode.service.js';

describe('OTP-code API', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api', otpCodeRoutes);
    app.use(errorHandler);
  });

  beforeEach(() => jest.clearAllMocks());

  test('allows public requests and returns the validated provider result', async () => {
    const result = { code: '3741437414', status: '' };
    OtpCodeService.send.mockResolvedValue(result);

    const response = await request(app)
      .post('/api/otp-code')
      .send({ to: '09123456789' });

    expect(response.status).toBe(STATUES.SUCCESS);
    expect(response.body).toEqual({ isSuccess: true, data: result });
    expect(OtpCodeService.send).toHaveBeenCalledWith({ to: '09123456789' });
  });

  test.each([undefined, {}, { to: '123' }, { to: '09123456789', code: '1' }])(
    'rejects invalid body %p before calling the service',
    async (body) => {
      const requestBuilder = request(app).post('/api/otp-code');
      const response =
        body === undefined
          ? await requestBuilder
          : await requestBuilder.send(body);

      expect(response.status).toBe(STATUES.BAD_FORM_VALIDATION);
      expect(response.body.isSuccess).toBe(false);
      expect(OtpCodeService.send).not.toHaveBeenCalled();
    },
  );

  test('forwards mapped service errors to error middleware', async () => {
    const error = new Error('سرویس ارسال پیامک موقتاً در دسترس نیست');
    error.statusCode = STATUES.OTHER_PROBLEM;
    OtpCodeService.send.mockRejectedValue(error);

    const response = await request(app)
      .post('/api/otp-code')
      .send({ to: '09123456789' });

    expect(response.status).toBe(STATUES.OTHER_PROBLEM);
    expect(response.body.isSuccess).toBe(false);
    expect(JSON.stringify(response.body)).not.toContain(
      'test-melipayamak-token',
    );
  });
});
