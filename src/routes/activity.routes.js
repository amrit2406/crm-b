const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activity.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createActivitySchema,
  updateActivitySchema,
  completeActivitySchema
} = require('../validators/activity.validator');

// All activity routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Activities
 *   description: Sales Activities & Follow-up Task Management
 */

/**
 * @swagger
 * /api/activities:
 *   get:
 *     summary: List activities with status/type/assignedTo filters, overdue flag, date range, pagination
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed] }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [call, email, meeting, demo, reminder] }
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string }
 *       - in: query
 *         name: overdue
 *         schema: { type: boolean }
 *         description: Filter strictly pending activities with dueDate in the past
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: dueDate }
 *     responses:
 *       200:
 *         description: Activities list retrieved successfully
 */
router.get('/', authorize('activity:read:own'), activityController.listActivities);

/**
 * @swagger
 * /api/activities:
 *   post:
 *     summary: Create a follow-up activity for a Lead, Customer, or Deal
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - relatedTo
 *               - dueDate
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [call, email, meeting, demo, reminder]
 *                 example: meeting
 *               relatedTo:
 *                 type: object
 *                 required: [kind, item]
 *                 properties:
 *                   kind: { type: string, enum: [Lead, Customer, Deal], example: Lead }
 *                   item: { type: string, example: 64b8f01234567890abcdef12 }
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-09-10T14:00:00Z
 *               notes:
 *                 type: string
 *                 example: Demo of advanced analytics pipeline
 *     responses:
 *       201:
 *         description: Activity created successfully
 *       400:
 *         description: Validation error
 */
router.post('/', authorize('activity:read:own'), validate(createActivitySchema), activityController.createActivity);

/**
 * @swagger
 * /api/activities/{id}:
 *   get:
 *     summary: Get single activity details by ID
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activity details retrieved
 *       404:
 *         description: Activity not found
 */
router.get('/:id', authorize('activity:read:own'), activityController.getActivityById);

/**
 * @swagger
 * /api/activities/{id}:
 *   patch:
 *     summary: Update pending activity fields (dueDate, notes, type)
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [call, email, meeting, demo, reminder] }
 *               dueDate: { type: string, format: date-time }
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Activity updated successfully
 *       400:
 *         description: Activity already completed or validation error
 */
router.patch('/:id', authorize('activity:read:own'), validate(updateActivitySchema), activityController.updateActivity);

/**
 * @swagger
 * /api/activities/{id}/complete:
 *   patch:
 *     summary: Mark an activity as completed
 *     tags: [Activities]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               notes: { type: string, description: Optional completion notes }
 *     responses:
 *       200:
 *         description: Activity marked as completed
 *       400:
 *         description: Activity already completed
 */
router.patch(
  '/:id/complete',
  authorize('activity:read:own'),
  validate(completeActivitySchema),
  activityController.completeActivity
);

module.exports = router;
