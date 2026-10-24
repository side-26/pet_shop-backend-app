import { PAYMENT_EXPIRY_WORKER } from '#configs/constants.js';
import logger from '#configs/logger.js';

import { PaymentService } from './payments.service.js';

export const createPaymentExpiryWorker = ({
  expirePendingPayments = PaymentService.expirePendingPayments.bind(
    PaymentService,
  ),
  intervalMs = PAYMENT_EXPIRY_WORKER.INTERVAL_MS,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
} = {}) => {
  let isStarted = false;
  let timeoutId;
  let currentRun = Promise.resolve();

  const run = async () => {
    try {
      const expiredCount = await expirePendingPayments();
      if (expiredCount > 0)
        logger.app.info('پرداخت‌های منقضی‌شده پردازش شدند', { expiredCount });
    } catch (error) {
      logger.app.error('پردازش پرداخت‌های منقضی‌شده ناموفق بود', error);
    } finally {
      if (isStarted) {
        timeoutId = setTimeoutFn(() => {
          timeoutId = undefined;
          currentRun = run();
        }, intervalMs);
        timeoutId.unref?.();
      }
    }
  };

  return {
    async start() {
      if (isStarted) return;
      isStarted = true;
      currentRun = run();
      await currentRun;
    },
    async stop() {
      isStarted = false;
      if (timeoutId !== undefined) clearTimeoutFn(timeoutId);
      timeoutId = undefined;
      await currentRun;
    },
  };
};
