const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const TimelineEvent = require('../models/TimelineEvent');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const { buildFilterQuery, getPaginationParams, buildSort } = require('../utils/pagination');
const AppError = require('../utils/AppError');

class CustomerService {
  /**
   * List customers with role-based scoping, search, filters, and pagination
   * @param {Object} reqQuery 
   * @param {Object} user 
   */
  static async listCustomers(reqQuery, user) {
    const visibleUserIds = await getVisibleUserIds(user);
    const filter = buildFilterQuery(reqQuery, ['assignedTo']);

    // Role-based ownership scoping
    if (visibleUserIds !== null) {
      filter.assignedTo = { $in: visibleUserIds };
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['createdAt', 'updatedAt', 'name', 'company']);

    const [data, total] = await Promise.all([
      Customer.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('assignedTo', 'name email role')
        .populate('createdBy', 'name email role')
        .populate('originalLead', 'name email status source')
        .lean(),
      Customer.countDocuments(filter)
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
   * Get customer details by ID with populated originalLead and attached deals list
   * @param {string} id 
   * @param {Object} user 
   */
  static async getCustomerById(id, user) {
    const customer = await Customer.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email role')
      .populate('originalLead', 'name email status source createdAt')
      .lean();

    if (!customer) {
      throw new AppError('Customer not found', 404);
    }

    // Ownership check
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = customer.assignedTo._id ? customer.assignedTo._id.toString() : customer.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to view this customer', 403);
      }
    }

    // Fetch associated deals dynamically
    const deals = await Deal.find({ customer: id })
      .sort('-createdAt')
      .populate('assignedTo', 'name email role')
      .lean();

    return {
      ...customer,
      deals
    };
  }

  /**
   * Get timeline history for a customer
   * @param {string} id 
   * @param {Object} user 
   */
  static async getCustomerTimeline(id, user) {
    await this.getCustomerById(id, user);

    return await TimelineEvent.find({
      'relatedTo.kind': 'Customer',
      'relatedTo.item': id
    })
      .sort('-createdAt')
      .populate('performedBy', 'name email role')
      .lean();
  }
}

module.exports = CustomerService;
