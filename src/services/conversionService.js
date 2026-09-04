const Lead = require('../models/Lead');
const Customer = require('../models/Customer');
const Deal = require('../models/Deal');
const timelineService = require('./timelineService');
const NotificationService = require('./notificationService');
const { getVisibleUserIds } = require('../utils/scopeQuery');
const AppError = require('../utils/AppError');

class ConversionService {
  /**
   * Convert a lead to a Customer and optionally create an initial Deal.
   * Uses an atomic update on Lead.isConverted to eliminate race conditions / duplicate conversion.
   * Includes compensating rollback logic for standalone MongoDB instances without replica set multi-document transactions.
   * 
   * @param {string} leadId 
   * @param {Object} conversionData 
   * @param {Object} user 
   */
  static async convertLead(leadId, conversionData = {}, user) {
    // 1. Fetch lead for ownership verification
    const lead = await Lead.findById(leadId);
    if (!lead) {
      throw new AppError('Lead not found', 404);
    }

    // Ownership check
    const visibleUserIds = await getVisibleUserIds(user);
    if (visibleUserIds !== null) {
      const assignedToId = lead.assignedTo.toString();
      if (!visibleUserIds.includes(assignedToId)) {
        throw new AppError('Access denied: You do not have permission to convert this lead', 403);
      }
    }

    // 2. Critical Atomic Update to prevent duplicate conversions concurrently
    const leadToConvert = await Lead.findOneAndUpdate(
      { _id: leadId, isConverted: false },
      { $set: { isConverted: true, status: 'converted' } },
      { returnDocument: 'before' }
    );

    if (!leadToConvert) {
      throw new AppError('Lead already converted or not found', 409);
    }

    let customer;
    let deal = null;

    try {
      // 3. Create Customer
      customer = new Customer({
        name: conversionData.name || leadToConvert.name,
        email: conversionData.email || leadToConvert.email,
        phone: conversionData.phone || leadToConvert.phone,
        company: conversionData.company || leadToConvert.company,
        originalLead: leadToConvert._id,
        assignedTo: conversionData.assignedTo || leadToConvert.assignedTo,
        createdBy: user.id
      });

      await customer.save();

      // Link customer to lead
      await Lead.updateOne(
        { _id: leadId },
        { $set: { convertedToCustomer: customer._id } }
      );

      // 4. Create optional Deal if deal info provided
      if (conversionData.deal && conversionData.deal.title) {
        deal = new Deal({
          title: conversionData.deal.title,
          customer: customer._id,
          lead: leadToConvert._id,
          assignedTo: customer.assignedTo,
          value: conversionData.deal.value,
          expectedClosingDate: conversionData.deal.expectedClosingDate,
          stage: 'qualification'
        });

        await deal.save();
      }
    } catch (error) {
      // Compensating Manual Rollback:
      // Standalone MongoDB local instances (without replica sets) do not support multi-document transactions (session.startTransaction()).
      // We implement explicit compensating rollback by reverting Lead.isConverted and Lead.status to previous state if Customer/Deal creation fails.
      await Lead.updateOne(
        { _id: leadId },
        {
          $set: {
            isConverted: false,
            status: leadToConvert.status,
            convertedToCustomer: null
          }
        }
      );
      throw error;
    }

    // 5. Log Timeline Events
    await timelineService.logEvent({
      relatedTo: { kind: 'Lead', item: leadToConvert._id },
      action: 'converted',
      meta: { customerId: customer._id, dealId: deal ? deal._id : null },
      performedBy: user.id
    });

    await timelineService.logEvent({
      relatedTo: { kind: 'Customer', item: customer._id },
      action: 'created',
      meta: { fromLead: leadToConvert._id },
      performedBy: user.id
    });

    if (deal) {
      await timelineService.logEvent({
        relatedTo: { kind: 'Deal', item: deal._id },
        action: 'created',
        meta: { fromLead: leadToConvert._id, customerId: customer._id },
        performedBy: user.id
      });
    }

    // Send lead_converted notification to lead assignee / customer assignee
    await NotificationService.notify({
      userId: customer.assignedTo,
      type: 'lead_converted',
      message: `Lead "${leadToConvert.name}" has been successfully converted into Customer "${customer.name}".`,
      relatedTo: { kind: 'Customer', item: customer._id }
    });

    return {
      customer,
      deal
    };
  }
}

module.exports = ConversionService;
