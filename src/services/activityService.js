const Activity = require('../models/Activity');
const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const timelineService = require('./timelineService');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const { buildFilterQuery, getPaginationParams, buildSort } = require('../utils/pagination');
const AppError = require('../utils/AppError');

class ActivityService {
  /**
   * Create a new activity for a Lead, Customer, or Deal
   * @param {Object} data 
   * @param {Object} user 
   */
  static async createActivity(data, user) {
    const { kind, item } = data.relatedTo;

    // Verify entity existence
    let entity;
    if (kind === 'Lead') entity = await Lead.findById(item);
    else if (kind === 'Customer') entity = await Customer.findById(item);
    else if (kind === 'Deal') entity = await Deal.findById(item);

    if (!entity) {
      throw new AppError(`Associated ${kind} not found`, 404);
    }

    // Ownership check on related entity
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = entity.assignedTo ? entity.assignedTo.toString() : '';
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError(`Access denied: You do not have permission to create an activity for this ${kind}`, 403);
      }
    }

    const assignedTo = data.assignedTo || entity.assignedTo || user.id;

    const activity = new Activity({
      ...data,
      assignedTo
    });

    await activity.save();

    // Log timeline event on the related entity
    await timelineService.logEvent({
      relatedTo: { kind, item: entity._id },
      action: 'activity_created',
      meta: { activityId: activity._id, type: activity.type, dueDate: activity.dueDate },
      performedBy: user.id
    });

    return await Activity.findById(activity._id)
      .populate('assignedTo', 'name email role')
      .populate('relatedTo.item');
  }

  /**
   * List activities with filters, overdue flag, date range, pagination, sorting
   * @param {Object} reqQuery 
   * @param {Object} user 
   */
  static async listActivities(reqQuery, user) {
    const visibleUserIds = await getVisibleUserIds(user);
    const filter = buildFilterQuery(reqQuery, ['status', 'type', 'assignedTo']);

    // Role-based ownership scoping
    if (visibleUserIds !== null) {
      filter.assignedTo = { $in: visibleUserIds };
    }

    // Custom overdue filter flag
    if (reqQuery.overdue !== undefined) {
      const isOverdueFlag = reqQuery.overdue === 'true' || reqQuery.overdue === true;
      if (isOverdueFlag) {
        filter.status = 'pending';
        filter.dueDate = { ...filter.dueDate, $lt: new Date() };
      }
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['createdAt', 'dueDate', 'type', 'status']);

    const [data, total] = await Promise.all([
      Activity.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email role')
        .populate('relatedTo.item')
        .lean({ virtuals: true }),
      Activity.countDocuments(filter)
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
   * Get single activity by ID
   * @param {string} id 
   * @param {Object} user 
   */
  static async getActivityById(id, user) {
    const activity = await Activity.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('relatedTo.item');

    if (!activity) {
      throw new AppError('Activity not found', 404);
    }

    // Ownership check
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = activity.assignedTo._id ? activity.assignedTo._id.toString() : activity.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to view this activity', 403);
      }
    }

    return activity;
  }

  /**
   * Update activity notes or dueDate
   * @param {string} id 
   * @param {Object} data 
   * @param {Object} user 
   */
  static async updateActivity(id, data, user) {
    const activity = await this.getActivityById(id, user);

    if (activity.status === 'completed') {
      throw new AppError('Cannot update a completed activity', 400);
    }

    if (data.type) activity.type = data.type;
    if (data.dueDate) activity.dueDate = data.dueDate;
    if (data.notes !== undefined) activity.notes = data.notes;

    await activity.save();
    return await this.getActivityById(id, user);
  }

  /**
   * Mark activity as completed
   * @param {string} id 
   * @param {Object} user 
   * @param {string} [notes] 
   */
  static async completeActivity(id, user, notes) {
    const activity = await this.getActivityById(id, user);

    if (activity.status === 'completed') {
      throw new AppError('Activity is already completed', 400);
    }

    activity.status = 'completed';
    activity.completedAt = new Date();
    if (notes) {
      activity.notes = notes;
    }

    await activity.save();

    // Log activity_completed event on related entity
    await timelineService.logEvent({
      relatedTo: activity.relatedTo,
      action: 'activity_completed',
      meta: { activityId: activity._id, type: activity.type, completedAt: activity.completedAt },
      performedBy: user.id
    });

    return await this.getActivityById(id, user);
  }
}

module.exports = ActivityService;
