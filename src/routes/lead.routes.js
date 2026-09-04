const express = require('express');
const router = express.Router();
const leadController = require('../controllers/lead.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const validate = require('../middleware/validate');
const {
  createLeadSchema,
  updateLeadSchema,
  assignLeadSchema,
  statusUpdateSchema,
  addNoteSchema
} = require('../validators/lead.validator');
const { convertLeadSchema } = require('../validators/conversion.validator');

// All lead routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Leads
 *   description: Lead Management & Tracking Endpoints
 */

/**
 * @swagger
 * /api/leads:
 *   get:
 *     summary: List leads with filtering, pagination, and sorting
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [new, contacted, qualified, unqualified, converted]
 *         description: Filter by status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high]
 *         description: Filter by priority
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [website, referral, social_media, email, phone]
 *         description: Filter by source
 *       - in: query
 *         name: assignedTo
 *         schema:
 *           type: string
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         description: End date filter (ISO string or YYYY-MM-DD)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Text search across name, email, company
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page (max 100)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           default: -createdAt
 *         description: Sort field (prefix with - for descending, e.g. -createdAt, priority)
 *     responses:
 *       200:
 *         description: List of leads retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authorize('lead:read:own'), leadController.listLeads);

/**
 * @swagger
 * /api/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - source
 *             properties:
 *               name:
 *                 type: string
 *                 example: Acme Corporation
 *               email:
 *                 type: string
 *                 example: contact@acme.com
 *               phone:
 *                 type: string
 *                 example: "+1 555-0199"
 *               company:
 *                 type: string
 *                 example: Acme Corp
 *               source:
 *                 type: string
 *                 enum: [website, referral, social_media, email, phone]
 *                 example: website
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               assignedTo:
 *                 type: string
 *                 description: User ID to assign to (defaults to creator if omitted)
 *     responses:
 *       201:
 *         description: Lead created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */
router.post('/', authorize('lead:create'), validate(createLeadSchema), leadController.createLead);

/**
 * @swagger
 * /api/leads/{id}:
 *   get:
 *     summary: Get single lead by ID
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead details retrieved
 *       403:
 *         description: Forbidden (Not owner or manager)
 *       404:
 *         description: Lead not found
 */
router.get('/:id', authorize('lead:read:own'), leadController.getLeadById);

/**
 * @swagger
 * /api/leads/{id}:
 *   patch:
 *     summary: Update lead details
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               company: { type: string }
 *               source: { type: string, enum: [website, referral, social_media, email, phone] }
 *               priority: { type: string, enum: [low, medium, high] }
 *     responses:
 *       200:
 *         description: Lead updated successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.patch('/:id', authorize('lead:read:own'), validate(updateLeadSchema), leadController.updateLead);

/**
 * @swagger
 * /api/leads/{id}/assign:
 *   patch:
 *     summary: Reassign lead to a user (Manager/Admin only)
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - assignedTo
 *             properties:
 *               assignedTo:
 *                 type: string
 *                 example: 64b8f01234567890abcdef12
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 *       403:
 *         description: Forbidden (Requires lead:reassign permission)
 *       404:
 *         description: Lead or target user not found
 */
router.patch(
  '/:id/assign',
  authorize('lead:reassign'),
  validate(assignLeadSchema),
  leadController.assignLead
);

/**
 * @swagger
 * /api/leads/{id}/status:
 *   patch:
 *     summary: Update lead status
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, contacted, qualified, unqualified]
 *                 example: contacted
 *     responses:
 *       200:
 *         description: Lead status updated successfully
 *       400:
 *         description: Invalid status transition or validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.patch(
  '/:id/status',
  authorize('lead:read:own'),
  validate(statusUpdateSchema),
  leadController.updateStatus
);

/**
 * @swagger
 * /api/leads/{id}/notes:
 *   post:
 *     summary: Add note to a lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 example: Spoke with client. Requested demo next Tuesday.
 *     responses:
 *       200:
 *         description: Note added successfully
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.post(
  '/:id/notes',
  authorize('lead:read:own'),
  validate(addNoteSchema),
  leadController.addNote
);

/**
 * @swagger
 * /api/leads/{id}/convert:
 *   post:
 *     summary: Convert lead to Customer and optionally create an initial Deal
 *     description: |
 *       Atomically marks lead as converted and creates a Customer.
 *       Optionally creates an associated Deal if the `deal` object is supplied.
 *       Attempting to convert an already converted lead will fail with HTTP 409 Conflict.
 *     tags: [Leads]
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
 *               name: { type: string, description: Customer name override }
 *               email: { type: string, description: Customer email override }
 *               phone: { type: string, description: Customer phone override }
 *               company: { type: string, description: Customer company override }
 *               assignedTo: { type: string, description: Customer assigned user ID override }
 *               deal:
 *                 type: object
 *                 description: Optional deal sub-object (if provided, title, value, and expectedClosingDate are required)
 *                 properties:
 *                   title: { type: string, example: Initial Enterprise Deal }
 *                   value: { type: number, example: 50000 }
 *                   expectedClosingDate: { type: string, format: date, example: 2026-11-30 }
 *     responses:
 *       200:
 *         description: Lead converted successfully to Customer (and optional Deal)
 *       400:
 *         description: Validation error
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 *       409:
 *         description: Conflict (Lead already converted)
 */
router.post(
  '/:id/convert',
  authorize('lead:read:own'),
  validate(convertLeadSchema),
  leadController.convertLead
);

/**
 * @swagger
 * /api/leads/{id}/timeline:
 *   get:
 *     summary: Get activity timeline events for a lead
 *     tags: [Leads]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lead timeline events retrieved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.get('/:id/timeline', authorize('lead:read:own'), leadController.getLeadTimeline);

module.exports = router;
