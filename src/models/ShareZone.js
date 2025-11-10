const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShareZone = sequelize.define('ShareZone', {
    _id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    title: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    content: { 
      type: DataTypes.TEXT 
    },
    category: { 
      type: DataTypes.ENUM('project', 'essay', 'resume', 'video', 'document', 'other'), 
      allowNull: false 
    },
    fileUrl: { 
      type: DataTypes.TEXT 
    },
    author: { 
      type: DataTypes.UUID, 
      allowNull: false 
    }
  }, { 
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  });

  return ShareZone;
};