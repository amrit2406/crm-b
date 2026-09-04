const app = require('./src/app');
const connectDB = require('./src/config/db');
const env = require('./src/config/env');
const { startFollowupReminderJob } = require('./src/jobs/followupReminders');

const PORT = env.PORT || 5000;

// Connect to Database and start Express server
connectDB().then(() => {
  // Start background cron jobs
  startFollowupReminderJob();

  app.listen(PORT, () => {
    console.log(`🚀 Server running in ${env.NODE_ENV} mode on port ${PORT}`);
  });
});
