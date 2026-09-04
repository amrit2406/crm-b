const Lead = require('../models/Lead');
const User = require('../models/User');
const TimelineEvent = require('../models/TimelineEvent');
const timelineService = require('./timelineService');
const NotificationService = require('./notificationService');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const { buildFilterQuery, getPaginationParams, buildSort } = require('../utils/pagination');
const AppError = require('../utils/AppError');

class LeadService {
  /**
   * Create a new lead
   * @param {Object} data 
   * @param {Object} user 
   */
  static async createLead(data, user) {
    const assignedTo = data.assignedTo || user.id;

    // Verify assigned user exists
    const assignedUser = await User.findById(assignedTo);
    if (!assignedUser) {
      throw new AppError('Assigned user not found', 404);
    }

    const lead = new Lead({
      ...data,
      assignedTo,
      createdBy: user.id
    });

    await lead.save();

    // Log timeline event
    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: lead._id },
      action: 'created',
      meta: { name: lead.name, status: lead.status, source: lead.source },
      performedBy: user.id
    });

    return await Lead.findById(lead._id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role');
  }

  /**
   * List leads with filters, pagination, and ownership scoping
   * @param {Object} reqQuery 
   * @param {Object} user 
   */
  static async listLeads(reqQuery, user) {
    const visibleUserIds = await getVisibleUserIds(user);
    const filter = buildFilterQuery(reqQuery, ['status', 'priority', 'source', 'assignedTo']);

    // Apply role-based ownership scoping
    if (visibleUserIds !== null) {
      filter.assignedTo = { $in: visibleUserIds };
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['createdAt', 'updatedAt', 'name', 'priority', 'status']);

    const [data, total] = await Promise.all([
      Lead.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email role')
        .lean(),
      Lead.countDocuments(filter)
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
   * Get single lead by ID with ownership check
   * @param {string} id 
   * @param {Object} user 
   */
  static async getLeadById(id, user) {
    const lead = await Lead.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('notes.createdBy', 'name email role');

    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Ownership check
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = lead.assignedTo._id ? lead.assignedTo._id.toString() : lead.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to access this lead', 403);
      }
    }

    return lead;
  }

  /**
   * Update lead details
   * @param {string} id 
   * @param {Object} data 
   * @param {Object} user 
   */
  static async updateLead(id, data, user) {
    const lead = await this.getLeadById(id, user);

    const oldStatus = lead.status;
    const oldPriority = lead.priority;

    // Prevent direct status change to 'converted' via generic update endpoint
    if (data.status === 'converted' && oldStatus !== 'converted') {
      throw new AppError('Lead status cannot be set to converted via standard update. Use conversion workflow.', 400);
    }

    Object.keys(data).forEach((key) => {
      if (key !== 'notes' && key !== 'convertedToCustomer' && key !== 'isConverted') {
        lead[key] = data[key];
      }
    });

    await lead.save();

    // Log timeline events for status or priority changes
    if (data.status && data.status !== oldStatus) {
      await timelineService.logEvent({
        relatedTo: { kind: 'Lead', item: lead._id },
        action: 'status_changed',
        meta: { from: oldStatus, to: data.status },
        performedBy: user.id
      });
    }

    if (data.priority && data.priority !== oldPriority) {
      await timelineService.logEvent({
        relatedTo: { kind: 'Lead', item: lead._id },
        action: 'priority_changed',
        meta: { from: oldPriority, to: data.priority },
        performedBy: user.id
      });
    }

    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: lead._id },
      action: 'updated',
      meta: { updatedFields: Object.keys(data) },
      performedBy: user.id
    });

    return await this.getLeadById(id, user);
  }

  /**
   * Reassign lead to a new user
   * @param {string} id 
   * @param {string} newAssignedTo 
   * @param {Object} user 
   */
  static async assignLead(id, newAssignedTo, user) {
    const lead = await this.getLeadById(id, user);

    // Verify new assignee exists
    const targetUser = await User.findById(newAssignedTo);
    if (!targetUser) {
      throw new AppError('Target assigned user not found', 404);
    }

    const oldAssignedTo = lead.assignedTo._id ? lead.assignedTo._id.toString() : lead.assignedTo.toString();
    lead.assignedTo = newAssignedTo;
    await lead.save();

    // Log timeline event
    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: lead._id },
      action: oldAssignedTo === newAssignedTo.toString() ? 'assigned' : 'reassigned',
      meta: { from: oldAssignedTo, to: newAssignedTo },
      performedBy: user.id
    });

    // Send real notification
    await NotificationService.notify({
      userId: newAssignedTo,
      type: 'lead_assigned',
      message: `Lead "${lead.name}" has been assigned to you.`,
      relatedTo: { kind: 'Lead', item: lead._id }
    });

    return await this.getLeadById(id, user);
  }

  /**
   * Update lead status
   * @param {string} id 
   * @param {string} status 
   * @param {Object} user 
   */
  static async updateStatus(id, status, user) {
    const lead = await this.getLeadById(id, user);

    if (status === 'converted') {
      throw new AppError('Lead status cannot be directly changed to converted. Use the conversion workflow.', 400);
    }

    const oldStatus = lead.status;
    lead.status = status;
    await lead.save();

    // Log timeline event
    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: lead._id },
      action: 'status_changed',
      meta: { from: oldStatus, to: status },
      performedBy: user.id
    });

    return await this.getLeadById(id, user);
  }

  /**
   * Add note to a lead
   * @param {string} id 
   * @param {string} text 
   * @param {Object} user 
   */
  static async addNote(id, text, user) {
    const lead = await this.getLeadById(id, user);

    lead.notes.push({
      text,
      createdBy: user.id,
      createdAt: new Date()
    });

    await lead.save();

    // Log timeline event
    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: lead._id },
      action: 'note_added',
      meta: { snippet: text.substring(0, 50) },
      performedBy: user.id
    });

    return await this.getLeadById(id, user);
  }

  /**
   * Get timeline history for a lead
   * @param {string} id 
   * @param {Object} user 
   */
  static async getLeadTimeline(id, user) {
    // Verify existence & ownership
    await this.getLeadById(id, user);

    return await TimelineEvent.find({
      'relatedTo.kind': 'Lead',
      'relatedTo.item': id
    })
      .sort('-createdAt')
      .populate('performedBy', 'name email role')
      .lean();
  }
}

module.exports = LeadService;
