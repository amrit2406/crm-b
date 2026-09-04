const Notification = require('../models/Notification');
const { getPaginationParams, buildSort } = require('../utils/pagination');
const AppError = require('../utils/AppError');

class NotificationService {
  /**
   * Create and send a notification to a specific user
   * @param {Object} param0 
   */
  static async notify({ userId, type, message, relatedTo }) {
    if (!userId) return null;

    const notification = new Notification({
      user: userId,
      type,
      message,
      relatedTo,
      isRead: false
    });

    await notification.save();
    return notification;
  }

  /**
   * List notifications for a specific user
   * @param {string} userId 
   * @param {Object} reqQuery 
   */
  static async listForUser(userId, reqQuery) {
    const filter = { user: userId };

    if (reqQuery.isRead !== undefined) {
      filter.isRead = reqQuery.isRead === 'true' || reqQuery.isRead === true;
    }

    const { page, limit, skip } = getPaginationParams(reqQuery);
    const sort = buildSort(reqQuery, ['createdAt', 'isRead']);

    const [data, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false })
    ]);

    return {
      data,
      meta: {
        total,
        unreadCount,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Mark a single notification as read
   * @param {string} notificationId 
   * @param {string} userId 
   */
  static async markAsRead(notificationId, userId) {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    if (notification.user.toString() !== userId.toString()) {
      throw new AppError('Access denied: You cannot mark another user\'s notification as read', 403);
    }

    notification.isRead = true;
    await notification.save();
    return notification;
  }

  /**
   * Mark all notifications for a user as read
   * @param {string} userId 
   */
  static async markAllAsRead(userId) {
    const result = await Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true } }
    );
    return { modifiedCount: result.modifiedCount };
  }
}

module.exports = NotificationService;
