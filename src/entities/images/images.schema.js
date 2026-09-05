import { z } from 'zod';

import '#configs/zod.config.js';

const { object, url } = z;

export const deleteImageSchema = object({
  imageUrl: url().max(2048),
}).strict();
