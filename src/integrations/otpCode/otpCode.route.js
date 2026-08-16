import express from 'express';

import { otpCodeController } from './otpCode.controller.js';

const router = express.Router();

router.post(
  '/otp-code',
  /*
    #swagger.summary = 'Request an OTP code from Melipayamak'
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { type: 'object', required: ['to'], properties: { to: { type: 'string', pattern: '^09\\d{9}$' } } } } } }
    #swagger.responses[200] = { description: 'OTP provider response', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { type: 'object', properties: { code: { type: 'string' }, status: { type: 'string' } } } } } } } }
    #swagger.responses[422] = { description: 'Validation error' }
    #swagger.responses[503] = { description: 'Provider unavailable' }
  */
  otpCodeController,
);

export default router;
