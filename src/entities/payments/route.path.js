export const PAYMENT_ROUTES = {
  payments: '/payments',
  paymentsRequest: '/payments/request',
  paymentGatewayByAuthority: '/gateway/payments/:authority',
  paymentGatewayPayByAuthority: '/gateway/payments/:authority/pay',
  paymentGatewayCancelByAuthority: '/gateway/payments/:authority/cancel',
  paymentsAll: '/payments/all',
  paymentsByIdStatus: '/payments/:id/status',
  paymentsById: '/payments/:id',
};
