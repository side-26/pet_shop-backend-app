import { MockShippingClient } from './mockShipping.client.js';

export class ShippingService {
  constructor(client = new MockShippingClient()) {
    this.client = client;
  }

  createDeliveryQuote(input) {
    return this.client.createDeliveryQuote(input);
  }
}

export const shippingService = new ShippingService();
