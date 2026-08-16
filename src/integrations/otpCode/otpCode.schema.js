import { z } from 'zod';

import '#configs/zod.config.js';

const { object, string } = z;

export const otpCodeBodySchema = object({
  to: string().regex(/^09\d{9}$/),
}).strict();
