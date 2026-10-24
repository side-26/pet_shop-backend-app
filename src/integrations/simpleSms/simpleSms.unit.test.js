jest.mock('#entities/orders/orders.model.js', () => ({
  OrderModel: { findById: jest.fn() },
}));

jest.mock('#entities/users/users.model.js', () => ({
  UserModel: { findById: jest.fn() },
}));

import { ERROR_CODES, MELIPAYAMAK_API, STATUES } from '#configs/constants.js';
import { OrderModel } from '#entities/orders/orders.model.js';
import { UserModel } from '#entities/users/users.model.js';

import { createPetPurchaseSmsText } from './simpleSms.helpers.js';
import {
  petPurchaseSmsSchema,
  simpleSmsBodySchema,
} from './simpleSms.schema.js';
import {
  PetPurchaseSmsService,
  SimpleSmsService,
} from './simpleSms.service.js';

const mockResponse = ({ ok = true, status = STATUES.SUCCESS, body } = {}) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(body),
});

describe('simple-SMS integration', () => {
  const environment = {
    MELIPAYAMAK_SIMPLE_SMS_TOKEN: process.env.MELIPAYAMAK_SIMPLE_SMS_TOKEN,
    MELIPAYAMAK_SIMPLE_SMS_FROM: process.env.MELIPAYAMAK_SIMPLE_SMS_FROM,
  };

  beforeEach(() => {
    process.env.MELIPAYAMAK_SIMPLE_SMS_TOKEN = 'simple-sms-token';
    process.env.MELIPAYAMAK_SIMPLE_SMS_FROM = '5000xxx';
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    for (const [name, value] of Object.entries(environment)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  test('sends the combined paid-pet message through the tokenized simple-SMS endpoint', async () => {
    global.fetch.mockResolvedValue(
      mockResponse({ body: { recId: 3741437414, status: '' } }),
    );

    await expect(
      SimpleSmsService.send({
        name: 'علی',
        to: '09123456789',
        petNames: ['پامرانین', 'گلدن رتریور'],
      }),
    ).resolves.toEqual({ recId: '3741437414', status: '' });

    const [url, options] = global.fetch.mock.calls[0];
    const text = createPetPurchaseSmsText({
      name: 'علی',
      petNames: ['پامرانین', 'گلدن رتریور'],
    });
    expect(text.endsWith('\nلغو۱۱')).toBe(true);
    const body = JSON.stringify({ from: '5000xxx', to: '09123456789', text });
    expect(url.toString()).toBe(
      `${MELIPAYAMAK_API.BASE_URL}${MELIPAYAMAK_API.SIMPLE_SMS_PATH}/simple-sms-token`,
    );
    expect(options).toMatchObject({
      method: 'POST',
      port: 443,
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    });
  });

  test('only sends paid orders that include pet snapshots', async () => {
    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        user: 'user-id',
        paymentStatus: 'paid',
        items: [
          { itemType: 'product', title: 'غذا' },
          { itemType: 'pet', title: 'پامرانین' },
        ],
      }),
    });
    UserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        firstName: 'علی',
        phoneNumber: '09123456789',
      }),
    });
    global.fetch.mockResolvedValue(mockResponse({ body: { recId: 1 } }));

    await expect(
      PetPurchaseSmsService.sendForPaidOrder('order-id'),
    ).resolves.toEqual({
      recId: '1',
      status: '',
    });
    expect(UserModel.findById).toHaveBeenCalledWith('user-id');

    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        paymentStatus: 'paid',
        items: [{ itemType: 'product', title: 'غذا' }],
      }),
    });
    await expect(
      PetPurchaseSmsService.sendForPaidOrder('order-id'),
    ).resolves.toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('uses a polite fallback when a customer has not completed their name', async () => {
    OrderModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        user: 'user-id',
        paymentStatus: 'paid',
        items: [{ itemType: 'pet', title: 'پامرانین' }],
      }),
    });
    UserModel.findById.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue({
        firstName: '',
        phoneNumber: '09123456789',
      }),
    });
    global.fetch.mockResolvedValue(mockResponse({ body: { recId: 1 } }));

    await PetPurchaseSmsService.sendForPaidOrder('order-id');

    expect(global.fetch.mock.calls[0][1].body).toContain('دوست عزیز');
  });

  test('maps provider failures and missing configuration without exposing credentials', async () => {
    global.fetch.mockResolvedValue(mockResponse({ ok: false }));
    await expect(
      SimpleSmsService.send({
        name: 'علی',
        to: '09123456789',
        petNames: ['پامرانین'],
      }),
    ).rejects.toMatchObject({
      statusCode: STATUES.OTHER_PROBLEM,
      code: ERROR_CODES.MELIPAYAMAK_PROVIDER_UNAVAILABLE,
    });

    delete process.env.MELIPAYAMAK_SIMPLE_SMS_TOKEN;
    await expect(
      SimpleSmsService.send({
        name: 'علی',
        to: '09123456789',
        petNames: ['پامرانین'],
      }),
    ).rejects.toMatchObject({
      statusCode: STATUES.INTERNAL_SERVER,
      code: ERROR_CODES.MELIPAYAMAK_SIMPLE_SMS_TOKEN_NOT_CONFIGURED,
    });
  });

  test('rejects a provider response that reports a delivery error', async () => {
    global.fetch.mockResolvedValue(
      mockResponse({ body: { recId: 1, status: 'شماره فرستنده معتبر نیست' } }),
    );

    await expect(
      SimpleSmsService.send({
        name: 'علی',
        to: '09123456789',
        petNames: ['پامرانین'],
      }),
    ).rejects.toMatchObject({
      statusCode: STATUES.OTHER_PROBLEM,
      code: ERROR_CODES.MELIPAYAMAK_PROVIDER_REJECTED,
    });
  });

  test('validates the internal payloads', () => {
    expect(
      petPurchaseSmsSchema.safeParse({
        name: 'علی',
        to: '09123456789',
        petNames: ['پامرانین'],
      }).success,
    ).toBe(true);
    expect(
      simpleSmsBodySchema.safeParse({ from: '', to: '0912', text: '' }).success,
    ).toBe(false);
  });
});
