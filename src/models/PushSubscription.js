const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PushSubscription = sequelize.define('PushSubscription', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id'
    },
    endpoint: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    p256dhKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'p256dh_key'
    },
    authKey: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'auth_key'
    }
  }, {
    tableName: 'push_subscriptions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'endpoint']
      }
    ]
  });

  return PushSubscription;
};