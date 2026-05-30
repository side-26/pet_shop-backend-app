import express from 'express';

import { ROUTES } from '#configs/constants.js';
import {
  changeUserPasswordController,
  createUserController,
  disableUserController,
  enableUserController,
  getAllUsersListController,
  getAllUsersListPaginateController,
  getUserByIdController,
  getUserCartListController,
  updateUserLocationInfoController,
  updateUserPersonalInfoController,
} from './users.controller.js';
const router = express.Router();

const { users } = ROUTES;

router.post(users.createUser, createUserController);
// router.post(users.createUser, createUserController);
// router.post(users.createUser, createUserController);
router.put(users.updateUserInfo, updateUserPersonalInfoController);
router.put(users.updateUserLocationInfo, updateUserLocationInfoController);
router.put(users.changePassword, changeUserPasswordController);

router.put(users.disableUser, disableUserController);

router.put(users.enableUser, enableUserController);

router.get(users.getAll, getAllUsersListController);

router.get(users.getAllPaginate, getAllUsersListPaginateController);

router.get(users.getUserById, getUserByIdController);

router.get(users.getUserCart, getUserCartListController);

export default router;
