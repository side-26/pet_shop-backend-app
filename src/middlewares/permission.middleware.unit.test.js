jest.mock('./permission.js', () => ({
  hasPermission: jest.fn(),
}));

jest.mock('#utils/helpers.js', () => ({
  setErrorResponse: jest.fn(),
}));

import { STATUES } from '#configs/constants.js';
import { setErrorResponse } from '#utils/helpers.js';

import { permissionMiddleware } from './permission.middleware.js';
import { hasPermission } from './permission.js';

describe('permissionMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  test('normalizes the authenticated role and continues when permitted', () => {
    hasPermission.mockReturnValue(true);
    const next = jest.fn();
    const request = {
      user: { id: 'user-id', role: 'seller' },
      body: { ownerId: 'user-id' },
    };

    permissionMiddleware('pets', 'update')(request, {}, next);

    expect(hasPermission).toHaveBeenCalledWith(
      { id: 'user-id', role: 'seller', roles: ['seller'] },
      'pets',
      'update',
      request.body,
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(setErrorResponse).not.toHaveBeenCalled();
  });

  test('returns the standard no-access response when permission is denied', () => {
    hasPermission.mockReturnValue(false);
    const next = jest.fn();

    permissionMiddleware('pets', 'delete')(
      { user: { role: 'seller' } },
      {},
      next,
    );

    expect(next).not.toHaveBeenCalled();
    expect(setErrorResponse).toHaveBeenCalledWith(STATUES.NO_ACCESS, {
      message: 'شما اجازه انجام این عملیات را ندارید',
    });
  });
});
