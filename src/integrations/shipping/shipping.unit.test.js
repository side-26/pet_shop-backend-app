import { SHIPPING } from '#configs/constants.js';

import { MockShippingClient } from './mockShipping.client.js';
import { ShippingService } from './shipping.service.js';

describe('ShippingService', () => {
  const requestedAt = new Date('2026-09-15T08:00:00.000Z');
  const input = {
    cartId: 'cart-id',
    address: { _id: 'address-id', province: 'تهران' },
    items: [{ quantity: 3 }],
  };

  test('returns deterministic Iranian delivery windows through its provider', () => {
    const client = new MockShippingClient({
      clock: () => requestedAt,
      createId: () => 'quote-id',
    });
    const service = new ShippingService(client);

    const firstQuote = service.createDeliveryQuote(input);
    const secondQuote = service.createDeliveryQuote(input);

    expect(firstQuote).toEqual(secondQuote);
    expect(firstQuote).toMatchObject({
      id: 'quote-id',
      countryCode: SHIPPING.COUNTRY_CODE,
      timezone: SHIPPING.TIME_ZONE,
    });
    expect(firstQuote.options).toHaveLength(SHIPPING.WINDOW_COUNT);
    expect(firstQuote.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          timezone: SHIPPING.TIME_ZONE,
          countryCode: SHIPPING.COUNTRY_CODE,
          provider: SHIPPING.PROVIDER,
          shippingPrice:
            SHIPPING.TEHRAN_BASE_PRICE + 2 * SHIPPING.EXTRA_ITEM_PRICE,
        }),
      ]),
    );
    for (const option of firstQuote.options) {
      expect(option.startsAt).toBeInstanceOf(Date);
      expect(option.endsAt > option.startsAt).toBe(true);
      const iranLocalDay = new Date(
        option.startsAt.getTime() + SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
      );
      expect(iranLocalDay.getUTCDay()).not.toBe(5);
    }
  });

  test('uses the non-Tehran base price for another Iranian province', () => {
    const service = new ShippingService(
      new MockShippingClient({
        clock: () => requestedAt,
        createId: () => 'quote-id',
      }),
    );
    const quote = service.createDeliveryQuote({
      ...input,
      address: { ...input.address, province: 'فارس' },
      items: [{ quantity: 1 }],
    });

    expect(quote.options[0].shippingPrice).toBe(
      SHIPPING.OTHER_PROVINCE_BASE_PRICE,
    );
  });
});
