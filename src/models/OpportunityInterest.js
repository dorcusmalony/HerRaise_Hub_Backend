const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OpportunityInterest = sequelize.define('OpportunityInterest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  opportunityId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  isInterested: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  wantsReminder: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  clickedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
  }, {
    tableName: 'opportunity_interests',
    timestamps: true
  });

  return OpportunityInterest;
};