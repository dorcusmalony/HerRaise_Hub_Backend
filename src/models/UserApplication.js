const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserApplication = sequelize.define('UserApplication', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    opportunityId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'interested',      // User bookmarked/saved
        'preparing',       // User is preparing application
        'applied',         // User submitted application
        'under_review',    // Application being reviewed
        'interview',       // Got interview call
        'accepted',        // Application accepted
        'rejected',        // Application rejected
        'withdrawn'        // User withdrew application
      ),
      defaultValue: 'interested'
    },
    appliedDate: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT // User's personal notes
    },
    documents: {
      type: DataTypes.JSONB,
      defaultValue: [] // List of documents prepared
    },
    reminders: {
      type: DataTypes.JSONB,
      defaultValue: [] // Reminder history
    },
    statusHistory: {
      type: DataTypes.JSONB,
      defaultValue: [] // Track status changes
    },
    nextReminderDate: {
      type: DataTypes.DATE // When to send next reminder
    }
  }, {
    tableName: 'user_applications',
    timestamps: true
  });

  return UserApplication;
};