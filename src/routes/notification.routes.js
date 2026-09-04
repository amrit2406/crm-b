const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const auth = require('../middleware/auth');

// All notification routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: Real-time User Activity & System Alert Notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: List notifications for authenticated user with unread filter and pagination
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: isRead
 *         schema: { type: boolean }
 *         description: Filter by read status (true or false)
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200:
 *         description: List of notifications retrieved successfully
 */
router.get('/', notificationController.listNotifications);

/**
 * @swagger
 * /api/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read for current user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch('/read-all', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a single notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       403:
 *         description: Cannot mark another user's notification as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:id/read', notificationController.markAsRead);

module.exports = router;
