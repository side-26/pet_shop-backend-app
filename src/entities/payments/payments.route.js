import express from 'express';

import { MANAGEMENT_ROLES } from '#configs/constants.js';
import { RateLimiter } from '#infrastructure/redis/rateLimit/rateLimit.core.js';
import { authenticated } from '#middlewares/auth.middleware.js';
import { roleMiddleware } from '#middlewares/role.middleware.js';

import {
  createPaymentController,
  cancelGatewayPaymentController,
  getPaymentsController,
  getGatewayPaymentController,
  getUserPaymentController,
  getUserPaymentsController,
  payGatewayPaymentController,
  requestPaymentController,
  updatePaymentStatusController,
} from './payments.controller.js';
import { PAYMENT_ROUTES } from './route.path.js';

const router = express.Router();
new RateLimiter('payments').applyTo(router);

router.get(
  PAYMENT_ROUTES.paymentGatewayByAuthority,
  /*
    #swagger.path = '/gateway/payments/{authority}'
    #swagger.tags = ['Payments']
    #swagger.summary = 'Get gateway-safe payment details by authority'
    #swagger.parameters['authority'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' } }
    #swagger.responses[200] = { description: 'Gateway payment details' }
    #swagger.responses[404] = { description: 'Payment not found' }
    #swagger.responses[410] = { description: 'Payment authority expired' }
  */
  getGatewayPaymentController,
);
router.post(
  PAYMENT_ROUTES.paymentGatewayCancelByAuthority,
  /*
    #swagger.path = '/gateway/payments/{authority}/cancel'
    #swagger.tags = ['Payments']
    #swagger.summary = 'Cancel a pending gateway payment'
    #swagger.responses[400] = { description: 'Payment failed and order marked as failed' }
  */
  cancelGatewayPaymentController,
);
router.post(
  PAYMENT_ROUTES.paymentGatewayPayByAuthority,
  /*
    #swagger.path = '/gateway/payments/{authority}/pay'
    #swagger.tags = ['Payments']
    #swagger.summary = 'Complete a pending gateway payment'
    #swagger.parameters['authority'] = { in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{64}$' } }
    #swagger.responses[200] = { description: 'Payment completed and callback URL returned' }
    #swagger.responses[409] = { description: 'Payment was already processed' }
    #swagger.responses[410] = { description: 'Payment expired' }
  */
  payGatewayPaymentController,
);

router.post(
  PAYMENT_ROUTES.paymentsRequest,
  authenticated,
  /*
    #swagger.path = '/payments/request'
    #swagger.tags = ['Payments']
    #swagger.summary = "Create a gateway payment request for an owned order"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/RequestPaymentBody' } } } }
    #swagger.responses[201] = { description: 'Payment request created' }
  */
  requestPaymentController,
);
router.post(
  PAYMENT_ROUTES.payments,
  authenticated,
  /*
    #swagger.tags = ['Payments']
    #swagger.summary = "Create a payment attempt for an owned order"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/CreatePaymentBody' } } } }
    #swagger.responses[201] = { description: 'Payment created' }
  */
  createPaymentController,
);
router.get(
  PAYMENT_ROUTES.payments,
  authenticated,
  /*
    #swagger.tags = ['Payments']
    #swagger.summary = "List the authenticated user's payments"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Paginated user payments', content: { "application/json": { schema: { $ref: '#/components/schemas/PaginatedResponse' } } } }
  */
  getUserPaymentsController,
);
router.get(
  PAYMENT_ROUTES.paymentsAll,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  /*
    #swagger.tags = ['Payments']
    #swagger.summary = 'List all payments for Admin or Seller'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.responses[200] = { description: 'Paginated payments' }
  */
  getPaymentsController,
);
router.patch(
  PAYMENT_ROUTES.paymentsByIdStatus,
  authenticated,
  roleMiddleware(MANAGEMENT_ROLES),
  /*
    #swagger.tags = ['Payments']
    #swagger.summary = 'Update payment status'
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.requestBody = { required: true, content: { "application/json": { schema: { $ref: '#/components/schemas/UpdatePaymentStatusBody' } } } }
    #swagger.responses[200] = { description: 'Payment status updated' }
  */
  updatePaymentStatusController,
);
router.get(
  PAYMENT_ROUTES.paymentsById,
  authenticated,
  /*
    #swagger.tags = ['Payments']
    #swagger.summary = "Get one of the authenticated user's payments"
    #swagger.security = [{ "bearerAuth": [] }]
    #swagger.parameters['id'] = { in: 'path', required: true, schema: { type: 'string' } }
    #swagger.responses[200] = { description: 'Owned payment', content: { "application/json": { schema: { type: 'object', properties: { isSuccess: { type: 'boolean' }, data: { $ref: '#/components/schemas/Payment' } } } } } }
  */
  getUserPaymentController,
);

export default router;
