const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ShareZoneComment = sequelize.define('ShareZoneComment', {
    _id: { 
      type: DataTypes.UUID, 
      defaultValue: DataTypes.UUIDV4, 
      primaryKey: true 
    },
    content: { 
      type: DataTypes.TEXT, 
      allowNull: false 
    },
    author: { 
      type: DataTypes.UUID, 
      allowNull: false 
    },
    post: { 
      type: DataTypes.UUID, 
      allowNull: false 
    },
    parentCommentId: { 
      type: DataTypes.UUID, 
      allowNull: true 
    },
    likes: { 
      type: DataTypes.JSONB, 
      defaultValue: [] 
    }
  }, { 
    timestamps: true 
  });

  return ShareZoneComment;
};