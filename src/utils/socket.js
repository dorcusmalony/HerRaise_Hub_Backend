// Simple socket utility - placeholder to prevent import errors
const broadcast = (event, data) => {
  console.log(`📡 Socket broadcast: ${event}`, data);
  // Socket functionality is handled by notificationService
};

module.exports = {
  broadcast
};