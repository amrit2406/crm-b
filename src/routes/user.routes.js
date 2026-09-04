const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const auth = require('../middleware/auth');

// All user routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User Directory & Assignee Lookup Endpoints
 */

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: List assignable users (scoped by role - used for lead/deal/activity assignment dropdowns)
 *     description: |
 *       Returns users visible to the requester based on their role:
 *       - **Admin**: All active users in the system
 *       - **Sales Manager**: Themselves + their team members
 *       - **Sales Executive**: Only themselves
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [admin, sales_manager, sales_executive]
 *         description: Optional filter by role (e.g. role=sales_executive to list only reps)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: name }
 *     responses:
 *       200:
 *         description: List of users visible to the authenticated user
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success: { type: boolean }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id: { type: string }
 *                       name: { type: string }
 *                       email: { type: string }
 *                       role: { type: string }
 *                       managerId:
 *                         type: object
 *                         properties:
 *                           _id: { type: string }
 *                           name: { type: string }
 *                           email: { type: string }
 */
router.get('/', userController.listUsers);

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     summary: Get the currently authenticated user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Own profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', userController.getMe);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get a specific user by ID (scoped by role)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *         description: MongoDB ObjectId of the user
 *     responses:
 *       200:
 *         description: User profile retrieved
 *       403:
 *         description: Access denied (not on your team)
 *       404:
 *         description: User not found
 */
router.get('/:id', userController.getUserById);

module.exports = router;
