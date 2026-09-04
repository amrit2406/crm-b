const express = require('express');
const router = express.Router();
const dealController = require('../controllers/deal.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createDealSchema,
  updateDealSchema,
  stageUpdateSchema
} = require('../validators/deal.validator');

// All deal routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Deals
 *   description: Sales Pipeline & Deal Stage Management Endpoints
 */

/**
 * @swagger
 * /api/deals:
 *   get:
 *     summary: List deals with pipeline stage filtering, value ranges, pagination, and sorting
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [qualification, discovery, proposal, negotiation, won, lost]
 *         description: Filter by stage
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string }
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: customer
 *         schema: { type: string }
 *         description: Filter by customer ID
 *       - in: query
 *         name: minValue
 *         schema: { type: number }
 *         description: Minimum deal value
 *       - in: query
 *         name: maxValue
 *         schema: { type: number }
 *         description: Maximum deal value
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: sort
 *         schema: { type: string, default: -createdAt }
 *     responses:
 *       200:
 *         description: List of deals retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authorize('deal:read:own'), dealController.listDeals);

/**
 * @swagger
 * /api/deals:
 *   post:
 *     summary: Create a deal directly for an existing customer
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - customer
 *               - value
 *             properties:
 *               title:
 *                 type: string
 *                 example: Enterprise Software Renewal
 *               customer:
 *                 type: string
 *                 example: 64b8f01234567890abcdef12
 *               value:
 *                 type: number
 *                 example: 25000
 *               expectedClosingDate:
 *                 type: string
 *                 format: date
 *                 example: 2026-10-15
 *               stage:
 *                 type: string
 *                 enum: [qualification, discovery, proposal, negotiation, won, lost]
 *                 default: qualification
 *               probability:
 *                 type: number
 *                 example: 10
 *     responses:
 *       201:
 *         description: Deal created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authorize('deal:read:own'), validate(createDealSchema), dealController.createDeal);

/**
 * @swagger
 * /api/deals/{id}:
 *   get:
 *     summary: Get deal details by ID
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deal details retrieved successfully
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deal not found
 */
router.get('/:id', authorize('deal:read:own'), dealController.getDealById);

/**
 * @swagger
 * /api/deals/{id}:
 *   patch:
 *     summary: Update deal editable fields (title, value, expectedClosingDate, probability). Cannot update closed deals or stage field.
 *     tags: [Deals]
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
 *               title: { type: string }
 *               value: { type: number }
 *               expectedClosingDate: { type: string, format: date }
 *               probability: { type: number }
 *     responses:
 *       200:
 *         description: Deal updated successfully
 *       400:
 *         description: Validation error or deal closed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deal not found
 */
router.patch('/:id', authorize('deal:read:own'), validate(updateDealSchema), dealController.updateDeal);

/**
 * @swagger
 * /api/deals/{id}/stage:
 *   patch:
 *     summary: Advance deal stage following strict transition rules (qualification -> discovery -> proposal -> negotiation -> won/lost).
 *     description: |
 *       **Stage Transition Rules**:
 *       - qualification -> discovery or lost
 *       - discovery -> proposal or lost
 *       - proposal -> negotiation or lost
 *       - negotiation -> won or lost
 *       - won / lost -> terminal states (cannot be modified)
 *       
 *       **Conditional Requirement**:
 *       - `lostReason` is **required** when stage is set to `lost`.
 *     tags: [Deals]
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
 *             required:
 *               - stage
 *             properties:
 *               stage:
 *                 type: string
 *                 enum: [qualification, discovery, proposal, negotiation, won, lost]
 *                 example: discovery
 *               lostReason:
 *                 type: string
 *                 description: Required if stage is lost
 *                 example: Competitor offered lower pricing
 *               probability:
 *                 type: number
 *                 description: Optional explicit override; defaults to stage probability
 *     responses:
 *       200:
 *         description: Deal stage updated successfully
 *       400:
 *         description: Invalid transition, missing lostReason, or deal already closed
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deal not found
 */
router.patch(
  '/:id/stage',
  authorize('deal:read:own'),
  validate(stageUpdateSchema),
  dealController.updateDealStage
);

/**
 * @swagger
 * /api/deals/{id}/timeline:
 *   get:
 *     summary: Get activity timeline history for a deal
 *     tags: [Deals]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deal timeline events retrieved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Deal not found
 */
router.get('/:id/timeline', authorize('deal:read:own'), dealController.getDealTimeline);

module.exports = router;
