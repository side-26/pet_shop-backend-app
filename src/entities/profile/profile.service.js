import { STATUES } from '#configs/constants.js';
import { OrderService } from '#entities/orders/orders.service.js';
import { UserService } from '#entities/users/users.service.js';
import { setErrorResponse } from '#utils/helpers.js';

import { ProfileModel } from './profile.model.js';

const formatAccount = (user) => ({
  userId: user._id.toString(),
  firstName: user.firstName,
  lastName: user.lastName,
  phoneNumber: user.phoneNumber,
  email: user.email,
  avatar: user.avatar,
  nationalCode: user.nationalCode,
  age: user.age,
});

export class ProfileService {
  static async getAccount(actor) {
    const userId = actor?.userId;
    if (!userId) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'احراز هویت کاربر معتبر نیست',
      });
    }

    const user = await ProfileModel.findEnabledAccountByUserId(userId);
    if (!user) {
      setErrorResponse(STATUES.UN_AUTHORIZED, {
        message: 'حساب کاربری غیرفعال است یا حذف شده است',
      });
    }

    return formatAccount(user);
  }

  static async getAddresses(actor) {
    await this.getAccount(actor);
    return UserService.getAddresses(actor);
  }

  static async getAddressById(actor, addressId) {
    const addresses = await this.getAddresses(actor);
    const address = addresses.find(
      ({ _id }) => _id.toString() === addressId.toString(),
    );
    if (!address) {
      setErrorResponse(STATUES.NOT_FOUND, { message: 'نشانی یافت نشد' });
    }
    return address;
  }

  static async updateAddress(actor, addressId, changes) {
    await this.getAccount(actor);
    return UserService.editAddress(actor, addressId, changes);
  }

  static async createAddress(actor, address) {
    await this.getAccount(actor);
    return UserService.addAddress(actor, address);
  }

  static async deleteAddress(actor, addressId) {
    await this.getAccount(actor);
    return UserService.deleteAddress(actor, addressId);
  }

  static async getOrders(actor, query) {
    await this.getAccount(actor);
    return OrderService.getUserOrders(actor, query);
  }

  static async getOrderById(actor, orderId) {
    await this.getAccount(actor);
    return OrderService.getUserOrder(actor, orderId);
  }

  static async resetPassword(actor, data) {
    await this.getAccount(actor);
    return UserService.changePassword(actor, data);
  }
}
