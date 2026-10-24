jest.mock('#configs/logger.js', () => ({
  __esModule: true,
  default: { app: { error: jest.fn(), info: jest.fn() } },
}));

jest.mock('./payments.service.js', () => ({
  PaymentService: { expirePendingPayments: jest.fn() },
}));

import { createPaymentExpiryWorker } from './payment-expiry.worker.js';

describe('payment expiry worker', () => {
  test('runs immediately and clears its scheduled timeout on stop', async () => {
    const timeout = { unref: jest.fn() };
    const expirePendingPayments = jest.fn().mockResolvedValue(2);
    const setTimeoutFn = jest.fn(() => timeout);
    const clearTimeoutFn = jest.fn();
    const worker = createPaymentExpiryWorker({
      expirePendingPayments,
      intervalMs: 1_000,
      setTimeoutFn,
      clearTimeoutFn,
    });

    await worker.start();

    expect(expirePendingPayments).toHaveBeenCalledTimes(1);
    expect(setTimeoutFn).toHaveBeenCalledWith(expect.any(Function), 1_000);
    expect(timeout.unref).toHaveBeenCalledTimes(1);

    await worker.stop();

    expect(clearTimeoutFn).toHaveBeenCalledWith(timeout);
  });

  test('does not schedule a second timer when started twice', async () => {
    const setTimeoutFn = jest.fn(() => ({ unref: jest.fn() }));
    const worker = createPaymentExpiryWorker({
      expirePendingPayments: jest.fn().mockResolvedValue(0),
      setTimeoutFn,
    });

    await worker.start();
    await worker.start();

    expect(setTimeoutFn).toHaveBeenCalledTimes(1);
    await worker.stop();
  });
});
