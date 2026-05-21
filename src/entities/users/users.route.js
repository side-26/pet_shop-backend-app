import express from 'express';

import { ROUTES } from '#configs/constants.js';
import { createUserController } from './users.controller.js';
const router = express.Router();
const { users } = ROUTES;
router.post(users.createUser, createUserController);

export default router;
