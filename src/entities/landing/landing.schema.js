import { z } from 'zod';

import '#configs/zod.config.js';

export const updateLandingZodSchema = z.object({
  heroTitle: z.string().trim().max(120).optional(),
  heroSubtitle: z.string().trim().max(500).optional(),
  featuredProductLimit: z.number().int().min(1).max(50).optional(),
});
