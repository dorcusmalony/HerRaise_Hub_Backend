const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OpportunityInteraction = sequelize.define('OpportunityInteraction', {
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
    clickedExternalLink: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    clickedAt: {
      type: DataTypes.DATE
    },
    returnedAt: {
      type: DataTypes.DATE
    },
    isInterested: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    wantsReminder: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reminderSent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    reminderSentAt: {
      type: DataTypes.DATE
    },
    applicationStatus: {
      type: DataTypes.ENUM('interested', 'in_progress', 'submitted', 'accepted', 'rejected'),
      defaultValue: 'interested'
    },
    statusUpdatedAt: {
      type: DataTypes.DATE
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'opportunity_interactions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'opportunityId']
      }
    ]
  });

  return OpportunityInteraction;
};