import { UserModel } from '#entities/users/users.model.js';

export class ProfileModel {
  static findEnabledAccountByUserId(userId) {
    return UserModel.findOne({ _id: userId, isEnable: true }).select(
      'firstName lastName phoneNumber email avatar nationalCode age',
    );
  }
}
