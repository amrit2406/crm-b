const TimelineEvent = require('../models/TimelineEvent');

/**
 * Log a state-changing activity event in the timeline
 * @param {Object} eventData
 * @param {Object} eventData.relatedTo - { kind: 'Lead'|'Customer'|'Deal', item: ObjectId }
 * @param {string} eventData.action - Action string e.g. 'created', 'assigned', 'status_changed', 'note_added'
 * @param {Object} [eventData.meta] - Additional metadata e.g. { from, to }
 * @param {string|ObjectId} eventData.performedBy - User ID who performed the action
 */
const logEvent = async ({ relatedTo, action, meta = {}, performedBy }) => {
  try {
    const event = new TimelineEvent({
      relatedTo,
      action,
      meta,
      performedBy
    });
    await event.save();
    return event;
  } catch (error) {
    console.error('❌ Failed to log timeline event:', error.message);
    // Silent fail or non-blocking to prevent primary operation rollback
  }
};

module.exports = {
  logEvent
};
