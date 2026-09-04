const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customer.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All customer routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Customers
 *   description: Customer Lineage & Account Management Endpoints
 */

/**
 * @swagger
 * /api/customers:
 *   get:
 *     summary: List converted customers with filters, pagination, and RBAC scoping
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: assignedTo
 *         schema: { type: string }
 *         description: Filter by assigned user ID
 *       - in: query
 *         name: from
 *         schema: { type: string, format: date }
 *         description: Start date filter
 *       - in: query
 *         name: to
 *         schema: { type: string, format: date }
 *         description: End date filter
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Text search across name, email, company
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
 *         description: List of customers retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', authorize('lead:read:own'), customerController.listCustomers);

/**
 * @swagger
 * /api/customers/{id}:
 *   get:
 *     summary: Get customer detail with original lead lineage and associated deals
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer details with associated deals
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 */
router.get('/:id', authorize('lead:read:own'), customerController.getCustomerById);

/**
 * @swagger
 * /api/customers/{id}/timeline:
 *   get:
 *     summary: Get activity timeline history for a customer
 *     tags: [Customers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Customer timeline events retrieved
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Customer not found
 */
router.get('/:id/timeline', authorize('lead:read:own'), customerController.getCustomerTimeline);

module.exports = router;
