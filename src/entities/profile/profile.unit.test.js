jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn((statusCode, options = {}) => {
    const error = new Error(options.message);
    Object.assign(error, options, { statusCode });
    throw error;
  }),
}));

jest.mock('./profile.model.js', () => ({
  ProfileModel: { findEnabledAccountByUserId: jest.fn() },
}));

jest.mock('#entities/users/users.service.js', () => ({
  UserService: {
    addAddress: jest.fn(),
    changePassword: jest.fn(),
    deleteAddress: jest.fn(),
    editAddress: jest.fn(),
    getAddresses: jest.fn(),
  },
}));

jest.mock('#entities/orders/orders.service.js', () => ({
  OrderService: { getUserOrder: jest.fn(), getUserOrders: jest.fn() },
}));

import { STATUES } from '#configs/constants.js';
import { OrderService } from '#entities/orders/orders.service.js';
import { UserService } from '#entities/users/users.service.js';
import { setErrorResponse } from '#utils/helpers.js';

import { ProfileModel } from './profile.model.js';
import { ProfileService } from './profile.service.js';

describe('ProfileService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ProfileModel.findEnabledAccountByUserId.mockResolvedValue({
      _id: { toString: () => 'user-id' },
    });
  });

  test('returns only the authenticated enabled user personal information', async () => {
    ProfileModel.findEnabledAccountByUserId.mockResolvedValue({
      _id: { toString: () => 'user-id' },
      firstName: 'علی',
      lastName: 'احمدی',
      phoneNumber: '09121234567',
      email: 'ali@example.test',
      avatar: 'https://cdn.example.test/avatars/ali.webp',
      nationalCode: '0012345678',
      age: 30,
      password: 'secret',
      role: 'customer',
    });

    await expect(
      ProfileService.getAccount({ userId: 'user-id' }),
    ).resolves.toEqual({
      userId: 'user-id',
      firstName: 'علی',
      lastName: 'احمدی',
      phoneNumber: '09121234567',
      email: 'ali@example.test',
      avatar: 'https://cdn.example.test/avatars/ali.webp',
      nationalCode: '0012345678',
      age: 30,
    });
    expect(ProfileModel.findEnabledAccountByUserId).toHaveBeenCalledWith(
      'user-id',
    );
  });

  test('rejects a missing authenticated user', async () => {
    await expect(ProfileService.getAccount()).rejects.toMatchObject({
      statusCode: STATUES.UN_AUTHORIZED,
      message: 'احراز هویت کاربر معتبر نیست',
    });
    expect(ProfileModel.findEnabledAccountByUserId).not.toHaveBeenCalled();
  });

  test('rejects a disabled or deleted account', async () => {
    ProfileModel.findEnabledAccountByUserId.mockResolvedValue(null);

    await expect(
      ProfileService.getAccount({ userId: 'user-id' }),
    ).rejects.toMatchObject({
      statusCode: STATUES.UN_AUTHORIZED,
      message: 'حساب کاربری غیرفعال است یا حذف شده است',
    });
    expect(setErrorResponse).toHaveBeenCalledWith(STATUES.UN_AUTHORIZED, {
      message: 'حساب کاربری غیرفعال است یا حذف شده است',
    });
  });

  test('returns only the authenticated customer address list', async () => {
    const addresses = [{ _id: { toString: () => 'address-id' } }];
    UserService.getAddresses.mockResolvedValue(addresses);

    await expect(
      ProfileService.getAddresses({ userId: 'user-id' }),
    ).resolves.toBe(addresses);
    expect(UserService.getAddresses).toHaveBeenCalledWith({
      userId: 'user-id',
    });
  });

  test('returns an owned address by ID and hides a missing address', async () => {
    const address = { _id: { toString: () => 'address-id' }, plate: '12' };
    UserService.getAddresses.mockResolvedValue([address]);

    await expect(
      ProfileService.getAddressById({ userId: 'user-id' }, 'address-id'),
    ).resolves.toBe(address);

    UserService.getAddresses.mockResolvedValue([]);
    await expect(
      ProfileService.getAddressById({ userId: 'user-id' }, 'missing-address'),
    ).rejects.toMatchObject({
      statusCode: STATUES.NOT_FOUND,
      message: 'نشانی یافت نشد',
    });
  });

  test('delegates owned address updates to the established Users service', async () => {
    const changes = { plate: '25' };
    const address = { _id: 'address-id', ...changes };
    UserService.editAddress.mockResolvedValue(address);

    await expect(
      ProfileService.updateAddress(
        { userId: 'user-id' },
        'address-id',
        changes,
      ),
    ).resolves.toBe(address);
    expect(UserService.editAddress).toHaveBeenCalledWith(
      { userId: 'user-id' },
      'address-id',
      changes,
    );
  });

  test('delegates address creation and deletion to the established Users service', async () => {
    const actor = { userId: 'user-id' };
    const address = { plate: '12' };
    UserService.addAddress.mockResolvedValue({ _id: 'address-id', ...address });
    UserService.deleteAddress.mockResolvedValue({
      _id: 'address-id',
      ...address,
    });

    await expect(ProfileService.createAddress(actor, address)).resolves.toEqual(
      {
        _id: 'address-id',
        ...address,
      },
    );
    await expect(
      ProfileService.deleteAddress(actor, 'address-id'),
    ).resolves.toEqual({
      _id: 'address-id',
      ...address,
    });
    expect(UserService.addAddress).toHaveBeenCalledWith(actor, address);
    expect(UserService.deleteAddress).toHaveBeenCalledWith(actor, 'address-id');
  });

  test('delegates customer order history and detail reads to the Orders service', async () => {
    const actor = { userId: 'user-id' };
    const query = { page: 1, limit: 10 };
    const result = { result: [{ _id: 'order-id' }], pagination: {} };
    const order = { _id: 'order-id' };
    OrderService.getUserOrders.mockResolvedValue(result);
    OrderService.getUserOrder.mockResolvedValue(order);

    await expect(ProfileService.getOrders(actor, query)).resolves.toBe(result);
    await expect(ProfileService.getOrderById(actor, 'order-id')).resolves.toBe(
      order,
    );
    expect(OrderService.getUserOrders).toHaveBeenCalledWith(actor, query);
    expect(OrderService.getUserOrder).toHaveBeenCalledWith(actor, 'order-id');
  });

  test('blocks delegated profile operations when the account is disabled', async () => {
    ProfileModel.findEnabledAccountByUserId.mockResolvedValue(null);

    await expect(
      ProfileService.getOrders({ userId: 'user-id' }, { page: 1, limit: 10 }),
    ).rejects.toMatchObject({
      statusCode: STATUES.UN_AUTHORIZED,
      message: 'حساب کاربری غیرفعال است یا حذف شده است',
    });
    expect(OrderService.getUserOrders).not.toHaveBeenCalled();
  });

  test('resets the authenticated customer password through Users service', async () => {
    const actor = { userId: 'user-id' };
    const data = {
      oldPassword: 'old-password',
      password: 'new-password',
      repeatPassword: 'new-password',
    };
    const user = { _id: 'user-id' };
    UserService.changePassword.mockResolvedValue(user);

    await expect(ProfileService.resetPassword(actor, data)).resolves.toBe(user);
    expect(UserService.changePassword).toHaveBeenCalledWith(actor, data);
  });
});
