import express from 'express';

import { ROUTES } from '#configs/constants.js';

const router = express.Router();
const { users } = ROUTES;
/**
 * @swagger
 * /users:
 *   get:
 *     summary: GET all users list
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: all users list
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: number
 *                   name:
 *                     type: string
 */
router.get(users.getAll, (req, res) => {
  res.json([{ id: 1, name: 'Ali' }]);
});

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: GET user by id
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: user info
 *       404:
 *         description: can't find user.
 */
router.get(users.getUserById, (req, res) => {
  res.json({ id: req.params.id, name: 'Ali' });
});
export default router;
