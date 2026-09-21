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

import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { ProfileModel } from './profile.model.js';
import { ProfileService } from './profile.service.js';

describe('ProfileService', () => {
  beforeEach(() => jest.clearAllMocks());

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
});
