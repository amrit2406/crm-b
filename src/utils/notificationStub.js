/**
 * Notification stub helper
 */
const notify = ({ recipientId, title, message, type = 'info' }) => {
  console.log(`🔔 [NOTIFICATION STUB] [Recipient: ${recipientId}] [Type: ${type}] ${title}: ${message}`);
};

module.exports = {
  notify
};
