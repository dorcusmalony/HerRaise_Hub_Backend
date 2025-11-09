const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OpportunityApplication = sequelize.define('OpportunityApplication', {
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
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending',
      allowNull: false
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'opportunityId']
      }
    ]
  });

  return OpportunityApplication;
};