const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const auth = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// All dashboard routes require authentication
router.use(auth);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Analytics Aggregation & Team KPI Endpoints
 */

/**
 * @swagger
 * /api/dashboard/summary:
 *   get:
 *     summary: Get high-level summary KPIs and metrics (cached 30s, scoped by user role)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard summary metrics retrieved
 *       401:
 *         description: Unauthorized
 */
router.get('/summary', authorize('dashboard:view'), dashboardController.getSummary);

/**
 * @swagger
 * /api/dashboard/team:
 *   get:
 *     summary: Get team performance metrics breakdown (Sales Manager & Admin only)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Team performance metrics retrieved
 *       403:
 *         description: Access denied for non-manager/admin role
 */
router.get('/team', authorize('dashboard:team'), dashboardController.getTeamPerformance);

module.exports = router;
