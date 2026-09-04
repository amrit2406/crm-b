const Deal = require('../models/Deal');
const Customer = require('../models/Customer');
const TimelineEvent = require('../models/TimelineEvent');
const timelineService = require('./timelineService');
const NotificationService = require('./notificationService');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const { buildFilterQuery, getPaginationParams, buildSort } = require('../utils/pagination');
const { STAGE_PROBABILITIES, canTransition, isClosed } = require('../utils/dealRules');
const AppError = require('../utils/AppError');

class DealService {
  /**
   * Create a deal directly for an existing customer
   * @param {Object} data 
   * @param {Object} user 
   */
  static async createDeal(data, user) {
    const customer = await Customer.findById(data.customer);
    if (!customer) {
      throw new AppError('Associated customer not found', 404);
    }

    // Ownership check on customer
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = customer.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to create a deal for this customer', 403);
      }
    }

    const assignedTo = data.assignedTo || customer.assignedTo || user.id;
    const stage = data.stage || 'qualification';
    const probability = data.probability !== undefined ? data.probability : STAGE_PROBABILITIES[stage];

    const deal = new Deal({
      ...data,
      stage,
      probability,
      assignedTo
    });

    await deal.save();

    // Log timeline event
    await timelineService.logEvent({
      relatedTo: { kind: 'Deal', item: deal._id },
      action: 'created',
      meta: { title: deal.value, stage: deal.stage, value: deal.value },
      performedBy: user.id
    });

    return await Deal.findById(deal._id)
      .populate('customer', 'name company email')
      .populate('assignedTo', 'name email role');
  }

  /**
   * List deals with scope query, filters, pagination, and sorting
   * @param {Object} reqQuery 
   * @param {Object} user 
   */
  static async listDeals(reqQuery, user) {
    const visibleUserIds = await getVisibleUserIds(user);
    const filter = buildFilterQuery(reqQuery, ['stage', 'assignedTo', 'customer']);

    // Role-based ownership scoping
    if (visibleUserIds !== null) {
      filter.assignedTo = { $in: visibleUserIds };
    }

    // Custom value range filter (minValue / maxValue)
    if (reqQuery.minValue !== undefined || reqQuery.maxValue !== undefined) {
      filter.value = {};
      if (reqQuery.minValue !== undefined && !isNaN(Number(reqQuery.minValue))) {
        filter.value.$gte = Number(reqQuery.minValue);
      }
      if (reqQuery.maxValue !== undefined && !isNaN(Number(reqQuery.maxValue))) {
        filter.value.$lte = Number(reqQuery.maxValue);
      }
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['createdAt', 'updatedAt', 'title', 'value', 'stage', 'expectedClosingDate', 'expectedRevenue']);

    const [data, total] = await Promise.all([
      Deal.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('customer', 'name company email')
        .populate('assignedTo', 'name email role')
        .lean(),
      Deal.countDocuments(filter)
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get single deal by ID with ownership check
   * @param {string} id 
   * @param {Object} user 
   */
  static async getDealById(id, user) {
    const deal = await Deal.findById(id)
      .populate('customer', 'name company email phone')
      .populate('lead', 'name source')
      .populate('assignedTo', 'name email role');

    if (!deal) {
      throw new AppError('Deal not found', 404);
    }

    // Ownership check
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = deal.assignedTo._id ? deal.assignedTo._id.toString() : deal.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to view this deal', 403);
      }
    }

    return deal;
  }

  /**
   * Update deal stage following transition rules
   * @param {string} id 
   * @param {string} newStage 
   * @param {Object} user 
   * @param {string} [lostReason] 
   * @param {number} [customProbability] 
   */
  static async updateDealStage(id, newStage, user, lostReason, customProbability) {
    const deal = await this.getDealById(id, user);

    // 1. Cannot modify closed deal
    if (isClosed(deal.stage)) {
      throw new AppError(`Cannot modify a closed deal (${deal.stage})`, 400);
    }

    // 2. Check transition rules
    if (!canTransition(deal.stage, newStage)) {
      throw new AppError(`Invalid stage transition from ${deal.stage} to ${newStage}`, 400);
    }

    // 3. Conditional lostReason requirement
    if (newStage === 'lost' && (!lostReason || lostReason.trim() === '')) {
      throw new AppError('A lostReason must be provided when marking a deal as lost', 400);
    }

    const oldStage = deal.stage;
    deal.stage = newStage;

    // Set probability
    deal.probability = customProbability !== undefined ? customProbability : STAGE_PROBABILITIES[newStage];

    if (isClosed(newStage)) {
      deal.closedAt = new Date();
    }

    if (newStage === 'lost') {
      deal.lostReason = lostReason;
    }

    await deal.save();

    // Log stage_changed event
    await timelineService.logEvent({
      relatedTo: { kind: 'Deal', item: deal._id },
      action: 'stage_changed',
      meta: { from: oldStage, to: newStage, probability: deal.probability, expectedRevenue: deal.expectedRevenue },
      performedBy: user.id
    });

    if (isClosed(newStage)) {
      await timelineService.logEvent({
        relatedTo: { kind: 'Deal', item: deal._id },
        action: 'closed',
        meta: { result: newStage, closedAt: deal.closedAt, lostReason: deal.lostReason },
        performedBy: user.id
      });

      await NotificationService.notify({
        userId: deal.assignedTo._id || deal.assignedTo,
        type: 'deal_closed',
        message: `Deal "${deal.title}" has been marked as ${newStage}.`,
        relatedTo: { kind: 'Deal', item: deal._id }
      });
    }

    return await this.getDealById(id, user);
  }

  /**
   * Update deal details (title, value, expectedClosingDate, probability)
   * @param {string} id 
   * @param {Object} data 
   * @param {Object} user 
   */
  static async updateDeal(id, data, user) {
    const deal = await this.getLeadById ? await this.getDealById(id, user) : await this.getDealById(id, user);

    if (isClosed(deal.stage)) {
      throw new AppError('Cannot modify a closed deal', 400);
    }

    if (data.stage !== undefined) {
      throw new AppError('Stage updates must be performed via the /stage endpoint', 400);
    }

    if (data.title !== undefined) deal.title = data.title;
    if (data.value !== undefined) deal.value = data.value;
    if (data.expectedClosingDate !== undefined) deal.expectedClosingDate = data.expectedClosingDate;
    if (data.probability !== undefined) deal.probability = data.probability;

    await deal.save();

    await timelineService.logEvent({
      relatedTo: { kind: 'Deal', item: deal._id },
      action: 'updated',
      meta: { updatedFields: Object.keys(data) },
      performedBy: user.id
    });

    return await this.getDealById(id, user);
  }

  /**
   * Get timeline history for a deal
   * @param {string} id 
   * @param {Object} user 
   */
  static async getDealTimeline(id, user) {
    await this.getDealById(id, user);

    return await TimelineEvent.find({
      'relatedTo.kind': 'Deal',
      'relatedTo.item': id
    })
      .sort('-createdAt')
      .populate('performedBy', 'name email role')
      .lean();
  }
}

module.exports = DealService;
