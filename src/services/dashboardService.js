const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const Activity = require('../models/Activity');
const User = require('../models/User');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const simpleCache = require('../utils/simpleCache');
const AppError = require('../utils/AppError');

class DashboardService {
  /**
   * Get high-level summary KPIs and metrics for current user (with 30s cache)
   * @param {Object} user 
   */
  static async getSummary(user) {
    const cacheKey = `summary_${user.id}`;
    const cachedData = simpleCache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    const visibleUserIds = await getVisibleUserIds(user);
    const matchAssignedTo = visibleUserIds !== null 
      ? { assignedTo: { $in: visibleUserIds.map(id => new mongoose.Types.ObjectId(id)) } }
      : {};

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Parallel Aggregation Pipelines
    const [leadStats, customerStats, dealStats, activityStats] = await Promise.all([
      // 1. Lead Aggregations
      Lead.aggregate([
        { $match: matchAssignedTo },
        {
          $facet: {
            total: [{ $count: 'count' }],
            byStatus: [{ $group: { _id: '$status', count: { $sum: 1 } } }],
            converted: [{ $match: { isConverted: true } }, { $count: 'count' }]
          }
        }
      ]),

      // 2. Customer Aggregations
      Customer.aggregate([
        { $match: matchAssignedTo },
        {
          $facet: {
            total: [{ $count: 'count' }],
            newThisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: 'count' }]
          }
        }
      ]),

      // 3. Deal Aggregations
      Deal.aggregate([
        { $match: matchAssignedTo },
        {
          $facet: {
            total: [{ $count: 'count' }],
            open: [{ $match: { stage: { $nin: ['won', 'lost'] } } }, { $count: 'count' }],
            won: [{ $match: { stage: 'won' } }, { $count: 'count' }],
            lost: [{ $match: { stage: 'lost' } }, { $count: 'count' }],
            pipelineValue: [
              { $match: { stage: { $nin: ['won', 'lost'] } } },
              { $group: { _id: null, total: { $sum: '$value' } } }
            ],
            wonRevenue: [
              { $match: { stage: 'won' } },
              { $group: { _id: null, total: { $sum: '$value' } } }
            ],
            totalExpectedRevenue: [
              { $match: { stage: { $nin: ['won', 'lost'] } } },
              { $group: { _id: null, total: { $sum: '$expectedRevenue' } } }
            ]
          }
        }
      ]),

      // 4. Activity Aggregations
      Activity.aggregate([
        { $match: matchAssignedTo },
        {
          $facet: {
            pending: [{ $match: { status: 'pending' } }, { $count: 'count' }],
            completed: [{ $match: { status: 'completed' } }, { $count: 'count' }],
            overdue: [
              { $match: { status: 'pending', dueDate: { $lt: now } } },
              { $count: 'count' }
            ]
          }
        }
      ])
    ]);

    // Format Lead Summary
    const lTotal = leadStats[0].total[0]?.count || 0;
    const lConverted = leadStats[0].converted[0]?.count || 0;
    const leadByStatus = {};
    (leadStats[0].byStatus || []).forEach(item => {
      leadByStatus[item._id] = item.count;
    });

    const leadSummary = {
      total: lTotal,
      byStatus: leadByStatus,
      convertedCount: lConverted,
      conversionRate: lTotal > 0 ? Math.round((lConverted / lTotal) * 100 * 100) / 100 : 0
    };

    // Format Customer Summary
    const customerSummary = {
      total: customerStats[0].total[0]?.count || 0,
      newThisMonth: customerStats[0].newThisMonth[0]?.count || 0
    };

    // Format Deal Summary
    const dFacet = dealStats[0];
    const dealSummary = {
      total: dFacet.total[0]?.count || 0,
      openCount: dFacet.open[0]?.count || 0,
      wonCount: dFacet.won[0]?.count || 0,
      lostCount: dFacet.lost[0]?.count || 0,
      pipelineValue: dFacet.pipelineValue[0]?.total || 0,
      wonRevenue: dFacet.wonRevenue[0]?.total || 0,
      totalExpectedRevenue: dFacet.totalExpectedRevenue[0]?.total || 0
    };

    // Format Activity Summary
    const aFacet = activityStats[0];
    const activitySummary = {
      pendingCount: aFacet.pending[0]?.count || 0,
      completedCount: aFacet.completed[0]?.count || 0,
      overdueCount: aFacet.overdue[0]?.count || 0
    };

    const summaryResult = {
      leads: leadSummary,
      customers: customerSummary,
      deals: dealSummary,
      activities: activitySummary
    };

    // Store in cache for 30s
    simpleCache.set(cacheKey, summaryResult, 30000);

    return summaryResult;
  }

  /**
   * Get team performance breakdown (Manager / Admin only)
   * @param {Object} user 
   */
  static async getTeamPerformance(user) {
    if (user.role !== 'sales_manager' && user.role !== 'admin') {
      throw new AppError('Access denied: Manager or Admin role required for team performance', 403);
    }

    // 1. Identify target team members
    let teamFilter = {};
    if (user.role === 'sales_manager') {
      teamFilter = {
        $or: [{ _id: user.id }, { managerId: user.id }]
      };
    } else {
      teamFilter = { isActive: true };
    }

    const teamUsers = await User.find(teamFilter).select('name email role').lean();
    const teamUserIds = teamUsers.map(u => u._id);

    const now = new Date();

    // 2. Perform Grouped Aggregations across Team User IDs
    const [leadGroup, dealGroup, activityGroup] = await Promise.all([
      Lead.aggregate([
        { $match: { assignedTo: { $in: teamUserIds } } },
        { $group: { _id: '$assignedTo', totalLeads: { $sum: 1 } } }
      ]),

      Deal.aggregate([
        { $match: { assignedTo: { $in: teamUserIds } } },
        {
          $group: {
            _id: '$assignedTo',
            totalDeals: { $sum: 1 },
            dealsWon: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, 1, 0] } },
            wonRevenue: { $sum: { $cond: [{ $eq: ['$stage', 'won'] }, '$value', 0] } }
          }
        }
      ]),

      Activity.aggregate([
        { $match: { assignedTo: { $in: teamUserIds } } },
        {
          $group: {
            _id: '$assignedTo',
            completedCount: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
            overdueCount: {
              $sum: {
                $cond: [
                  { $and: [{ $eq: ['$status', 'pending'] }, { $lt: ['$dueDate', now] }] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Map aggregated results to user IDs for quick lookup
    const leadMap = new Map(leadGroup.map(item => [item._id.toString(), item.totalLeads]));
    const dealMap = new Map(dealGroup.map(item => [item._id.toString(), item]));
    const activityMap = new Map(activityGroup.map(item => [item._id.toString(), item]));

    // Construct per-user performance statistics
    const performance = teamUsers.map(u => {
      const uId = u._id.toString();
      const dData = dealMap.get(uId) || {};
      const aData = activityMap.get(uId) || {};

      return {
        user: {
          id: u._id,
          name: u.name,
          email: u.email,
          role: u.role
        },
        leadsAssigned: leadMap.get(uId) || 0,
        totalDeals: dData.totalDeals || 0,
        dealsWon: dData.dealsWon || 0,
        wonRevenue: dData.wonRevenue || 0,
        activitiesCompleted: aData.completedCount || 0,
        activitiesOverdue: aData.overdueCount || 0
      };
    });

    return performance;
  }
}

module.exports = DashboardService;
