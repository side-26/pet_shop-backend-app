import { createHash, randomUUID } from 'node:crypto';

import { SHIPPING } from '#configs/constants.js';

const tehranDateFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: SHIPPING.TIME_ZONE,
  weekday: 'long',
  month: 'long',
  day: 'numeric',
});

const digest = (value) =>
  createHash('sha256').update(value).digest('hex').slice(0, 16);

const isTehran = (address) =>
  ['tehran', 'تهران'].includes(address.province.trim().toLowerCase());

export class MockShippingClient {
  constructor({ clock = () => new Date(), createId = randomUUID } = {}) {
    this.clock = clock;
    this.createId = createId;
  }

  createDeliveryQuote({ cartId, address, items }) {
    const requestedAt = this.clock();
    const localNow = new Date(
      requestedAt.getTime() + SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
    );
    const iranRequestDate = [
      localNow.getUTCFullYear(),
      localNow.getUTCMonth() + 1,
      localNow.getUTCDate(),
    ].join('-');
    const seed = `${cartId}:${address._id}:${iranRequestDate}`;
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const basePrice = isTehran(address)
      ? SHIPPING.TEHRAN_BASE_PRICE
      : SHIPPING.OTHER_PROVINCE_BASE_PRICE;
    const shippingPrice =
      basePrice + Math.max(0, itemCount - 1) * SHIPPING.EXTRA_ITEM_PRICE;
    const candidates = [];

    for (
      let dayOffset = SHIPPING.MIN_LEAD_DAYS;
      dayOffset < SHIPPING.MIN_LEAD_DAYS + SHIPPING.SEARCH_DAYS;
      dayOffset += 1
    ) {
      const localDay = new Date(
        Date.UTC(
          localNow.getUTCFullYear(),
          localNow.getUTCMonth(),
          localNow.getUTCDate() + dayOffset,
        ),
      );
      if (localDay.getUTCDay() === 5) continue;

      for (const { startHour, endHour } of SHIPPING.TIME_RANGES) {
        const startsAt = new Date(
          Date.UTC(
            localDay.getUTCFullYear(),
            localDay.getUTCMonth(),
            localDay.getUTCDate(),
            startHour,
          ) -
            SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
        );
        const endsAt = new Date(
          Date.UTC(
            localDay.getUTCFullYear(),
            localDay.getUTCMonth(),
            localDay.getUTCDate(),
            endHour,
          ) -
            SHIPPING.UTC_OFFSET_MINUTES * 60 * 1000,
        );
        candidates.push({
          rank: digest(`${seed}:${startsAt.toISOString()}`),
          id: `window-${digest(`${address._id}:${startsAt.toISOString()}`)}`,
          startsAt,
          endsAt,
          countryCode: SHIPPING.COUNTRY_CODE,
          timezone: SHIPPING.TIME_ZONE,
          label: `${tehranDateFormatter.format(startsAt)}، ساعت ${startHour} تا ${endHour}`,
          shippingPrice,
          provider: SHIPPING.PROVIDER,
        });
      }
    }

    const options = candidates
      .sort((first, second) => first.rank.localeCompare(second.rank))
      .slice(0, SHIPPING.WINDOW_COUNT)
      .sort((first, second) => first.startsAt - second.startsAt)
      .map((candidate) => {
        const option = { ...candidate };
        delete option.rank;
        return option;
      });

    return {
      id: this.createId(),
      addressId: address._id,
      expiresAt: new Date(requestedAt.getTime() + SHIPPING.QUOTE_TTL_MS),
      countryCode: SHIPPING.COUNTRY_CODE,
      timezone: SHIPPING.TIME_ZONE,
      options,
    };
  }
}
