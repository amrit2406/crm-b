const cron = require('node-cron');
const Activity = require('../models/Activity');
const NotificationService = require('../services/notificationService');

const checkFollowupReminders = async () => {
  try {
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Upcoming Reminders (due in next 24 hours and not yet notified)
    const upcomingActivities = await Activity.find({
      status: 'pending',
      dueDate: { $gt: now, $lte: next24Hours },
      upcomingNotified: false
    });

    for (const activity of upcomingActivities) {
      await NotificationService.notify({
        userId: activity.assignedTo,
        type: 'followup_upcoming',
        message: `Upcoming follow-up activity (${activity.type}) due in less than 24 hours.`,
        relatedTo: { kind: 'Activity', item: activity._id }
      });
      activity.upcomingNotified = true;
      await activity.save();
    }

    // 2. Overdue Reminders (dueDate in past and not yet notified)
    const overdueActivities = await Activity.find({
      status: 'pending',
      dueDate: { $lt: now },
      overdueNotified: false
    });

    for (const activity of overdueActivities) {
      await NotificationService.notify({
        userId: activity.assignedTo,
        type: 'followup_overdue',
        message: `Follow-up activity (${activity.type}) is now overdue!`,
        relatedTo: { kind: 'Activity', item: activity._id }
      });
      activity.overdueNotified = true;
      await activity.save();
    }

    if (upcomingActivities.length > 0 || overdueActivities.length > 0) {
      console.log(
        `⏰ [CRON REMINDERS] Processed ${upcomingActivities.length} upcoming & ${overdueActivities.length} overdue activity notifications.`
      );
    }
  } catch (error) {
    console.error('❌ Error processing follow-up reminder cron job:', error.message);
  }
};

const startFollowupReminderJob = () => {
  // Schedule every 15 minutes
  cron.schedule('*/15 * * * *', () => {
    checkFollowupReminders();
  });
  console.log('⏱️ Follow-up reminder cron job initialized (running every 15 minutes)');

  // Run once immediately on startup for quick check
  checkFollowupReminders();
};

module.exports = {
  startFollowupReminderJob,
  checkFollowupReminders
};
